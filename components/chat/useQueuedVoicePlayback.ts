'use client';

/**
 * useQueuedVoicePlayback
 *
 * Streams TTS audio from /api/companion/:id/speak and plays it back through
 * a parent-owned, in-DOM HTMLAudioElement. The element is passed in via
 * `options.audioRef` so the same instance can be primed for iOS playback
 * by ChatWindow's first-gesture listener and reused for every clip.
 *
 * Why a passed-in ref and not a fresh `new Audio()` per call:
 *   - iOS Safari tracks autoplay activation PER ELEMENT. A `new Audio()`
 *     constructed after the user's gesture has expired is treated as
 *     locked, even if a previously-primed sibling exists.
 *   - The persistent element rendered in ChatWindow gets primed once by
 *     a real gesture (the first touch/click anywhere on the page, the
 *     voice toggle, or the Send button) and stays unlocked for the
 *     remainder of the page session.
 *   - The streaming and blob paths both write to that same element's
 *     `src`, so both inherit the unlock.
 *
 * Time-to-first-audio characteristics (unchanged from prior implementation):
 *   - MediaSource path (Chrome/Edge/Firefox/Safari macOS): ~1-2s, audio
 *     starts as soon as enough samples are decoded.
 *   - Blob fallback (iOS Safari, browsers without audio/mpeg
 *     MediaSource support): ~4-8s, buffers full MP3 then plays.
 *
 * Prosody is preserved: single /speak call for the full text, response
 * body is consumed progressively (streaming) or in one go (blob). No
 * sentence chunking, no audio joins.
 *
 * Public API:
 *   - playQueued(text)            - plays full text
 *   - stop()                      - cancels in-flight fetch and stops audio
 *   - isPlaying                   - true while fetching or playing
 *   - currentSentenceIndex        - -1 idle, 0 while playing (kept for
 *                                   backward compatibility with any
 *                                   consumer that historically read it)
 */

import { useRef, useCallback, useState, type RefObject } from 'react';

const MIME_AUDIO_MPEG = 'audio/mpeg';

/**
 * Mobile UA / narrow-viewport gate. We force the blob playback path on
 * mobile because UnderFireAI confirmed in production that even iOS 17+
 * ManagedMediaSource hangs in "loading" forever with an attached audio
 * element. The blob path is slightly slower (waits for the full MP3) but
 * actually plays. Desktop keeps the streaming path for faster TTFA.
 */
function isMobileEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof navigator === 'undefined') return false;
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  );
}

export interface UseQueuedVoicePlaybackOptions {
  /**
   * The persistent in-DOM <audio> element used for every TTS clip. Owned
   * by ChatWindow so it can be primed during a user gesture and survive
   * across companion message arrivals.
   */
  audioRef: RefObject<HTMLAudioElement | null>;
}

/**
 * Returns true when the browser can stream MP3 into a MediaSource. We
 * deliberately do NOT use ManagedMediaSource (iOS 17+) - UnderFireAI
 * confirmed in production it still hangs in "loading" forever on iOS
 * even with an attached audio element. Mobile is hard-forced to blob
 * regardless of MediaSource presence.
 */
function supportsMediaSourceStreaming(): boolean {
  if (typeof window === 'undefined') return false;
  // Hard mobile gate - skip MediaSource entirely on phone/tablet UAs.
  if (isMobileEnvironment()) return false;
  const MS = (window as unknown as { MediaSource?: typeof MediaSource }).MediaSource;
  if (typeof MS === 'undefined') return false;
  try {
    return MS.isTypeSupported(MIME_AUDIO_MPEG);
  } catch {
    return false;
  }
}

/**
 * Reset the persistent audio element so a new src can be assigned without
 * a stale load racing it. Idempotent. Does NOT null the ref (the parent
 * owns it). Does NOT remove user-attached attributes like `playsInline`.
 */
function resetElementForReuse(el: HTMLAudioElement): void {
  try {
    el.onended = null;
    el.onerror = null;
    el.pause();
    el.removeAttribute('src');
    el.load();
  } catch (err) {
    // pause()/load() are best-effort cleanup. Log so we know if any
    // browser ever throws here, but don't fail the cleanup path.
    console.error('[voice] error resetting audio element:', err);
  }
}

export function useQueuedVoicePlayback(
  companionId: string,
  { audioRef }: UseQueuedVoicePlaybackOptions,
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);

  // Hook-owned cleanup state. The audio ELEMENT is parent-owned; only the
  // MediaSource and the object URL backing it are this hook's
  // responsibility to release.
  const objectUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);

  // ── Internal cleanup ────────────────────────────────────────────────────
  // Used by stop(), error paths, and the ended/error handlers. Idempotent.
  const releaseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      resetElementForReuse(audio);
    }

    const ms = mediaSourceRef.current;
    if (ms) {
      try {
        if (ms.readyState === 'open') {
          ms.endOfStream();
        }
      } catch {
        // endOfStream throws if state is wrong - safe to ignore here.
      }
      mediaSourceRef.current = null;
    }

    const url = objectUrlRef.current;
    if (url) {
      URL.revokeObjectURL(url);
      objectUrlRef.current = null;
    }
  }, [audioRef]);

  // ── Stop ────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    releaseAudio();
    setIsPlaying(false);
    setCurrentSentenceIndex(-1);
  }, [releaseAudio]);

  // ── Streaming playback via MediaSource ─────────────────────────────────
  const playViaMediaSource = useCallback(async (
    response: Response,
    abortController: AbortController,
  ): Promise<void> => {
    if (!response.body) {
      throw new Error('Response has no body to stream');
    }
    const audio = audioRef.current;
    if (!audio) {
      throw new Error('audioRef element not mounted');
    }

    const mediaSource = new MediaSource();
    const url = URL.createObjectURL(mediaSource);
    audio.src = url;
    audio.preload = 'auto';

    mediaSourceRef.current = mediaSource;
    objectUrlRef.current = url;

    // SourceBuffer can only be added once the MediaSource is open. The
    // browser fires 'sourceopen' after the URL is attached and the element
    // starts loading.
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        mediaSource.removeEventListener('sourceopen', onOpen);
        mediaSource.removeEventListener('error', onError);
      };
      const onOpen = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error('MediaSource failed to open')); };
      mediaSource.addEventListener('sourceopen', onOpen);
      mediaSource.addEventListener('error', onError);
    });

    if (abortController.signal.aborted) return;

    const sourceBuffer = mediaSource.addSourceBuffer(MIME_AUDIO_MPEG);
    const queue: Uint8Array[] = [];
    let readerDone = false;

    const pump = () => {
      if (sourceBuffer.updating) return;
      const next = queue.shift();
      if (next) {
        try {
          // Copy into a fresh ArrayBuffer. reader.read() yields a
          // Uint8Array<ArrayBufferLike> (the buffer could in principle
          // be a SharedArrayBuffer under some lib.dom typings) and
          // SourceBuffer.appendBuffer's BufferSource excludes SAB.
          const chunk = new ArrayBuffer(next.byteLength);
          new Uint8Array(chunk).set(next);
          sourceBuffer.appendBuffer(chunk);
        } catch (err) {
          console.error('[voice] appendBuffer failed:', err);
        }
        return;
      }
      // Queue drained and reader is done - signal end of stream.
      if (readerDone && mediaSource.readyState === 'open') {
        try {
          mediaSource.endOfStream();
        } catch (err) {
          console.error('[voice] endOfStream failed:', err);
        }
      }
    };

    sourceBuffer.addEventListener('updateend', pump);

    audio.onended = () => {
      releaseAudio();
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    };

    audio.onerror = () => {
      console.error('[voice] audio element fired error event (stream mode)');
      releaseAudio();
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    };

    // Defeat the silent-muted-leak from a primer that AbortError'd.
    // See lib/audio/unlock.ts for the original bug.
    audio.muted = false;
    audio.volume = 1.0;

    // CRITICAL: do NOT call primeAudioElement(audio) here. The prime
    // overwrites `src` with the silent MP3 and then `pause()`s — racing
    // our real play() below. Result: element plays silence, then pauses,
    // `ended` never fires, UI is stuck on "Speaking" forever. Priming is
    // the parent's job and must happen BEFORE fetch (gesture listener,
    // modal click, Send-button handler).

    // Start playback now. The element waits for samples then begins.
    audio.play().catch(err => {
      if ((err as Error).name === 'AbortError') return;
      console.error('[voice] audio.play() rejected (stream mode):', err);
    });

    // Drain the response body into the queue.
    const reader = response.body.getReader();
    try {
      while (true) {
        if (abortController.signal.aborted) {
          try { await reader.cancel(); } catch { /* best-effort */ }
          break;
        }
        const { value, done } = await reader.read();
        if (done) {
          readerDone = true;
          pump();
          break;
        }
        if (value && value.byteLength > 0) {
          queue.push(value);
          pump();
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('[voice] stream read error:', err);
      }
      readerDone = true;
      pump();
    }
  }, [audioRef, releaseAudio]);

  // ── Buffered fallback (blob) ───────────────────────────────────────────
  const playViaBlob = useCallback(async (
    response: Response,
    abortController: AbortController,
  ): Promise<void> => {
    const blob = await response.blob();

    if (abortController.signal.aborted) return;

    const audio = audioRef.current;
    if (!audio) {
      console.warn('[voice] audioRef missing - skipping blob playback');
      return;
    }

    const url = URL.createObjectURL(blob);
    audio.src = url;
    audio.preload = 'auto';

    objectUrlRef.current = url;

    audio.onended = () => {
      releaseAudio();
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    };

    audio.onerror = () => {
      console.error('[voice] audio element fired error event (blob mode)');
      releaseAudio();
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    };

    // Defeat the silent-muted-leak from a primer that AbortError'd.
    audio.muted = false;
    audio.volume = 1.0;

    // CRITICAL: do NOT call primeAudioElement(audio) here. The prime
    // overwrites `src` with the silent MP3 and then `pause()`s — racing
    // our real play() below. Result: element plays silence, then pauses,
    // `ended` never fires, UI is stuck on "Speaking" forever. Priming is
    // the parent's job and must happen BEFORE fetch (gesture listener,
    // modal click, Send-button handler).

    try {
      await audio.play();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('[voice] audio.play() rejected (blob mode):', err);
      releaseAudio();
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [audioRef, releaseAudio]);

  // ── Main playback ───────────────────────────────────────────────────────
  const playQueued = useCallback(async (text: string): Promise<void> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    releaseAudio();

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsPlaying(true);
    setCurrentSentenceIndex(0);

    try {
      const response = await fetch(`/api/companion/${companionId}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          mode: 'full',
        }),
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) return;

      if (!response.ok) {
        abortControllerRef.current = null;
        return;
      }

      if (supportsMediaSourceStreaming()) {
        try {
          await playViaMediaSource(response, abortController);
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
          // Once we start streaming, the response body is locked - we
          // can't fall back to blob() from here. Log, clean up, reset.
          console.error('[voice] streaming playback failed:', err);
          releaseAudio();
          setIsPlaying(false);
          setCurrentSentenceIndex(-1);
          if (abortControllerRef.current === abortController) {
            abortControllerRef.current = null;
          }
        }
      } else {
        await playViaBlob(response, abortController);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('[voice] playback error:', error);
      releaseAudio();
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [companionId, releaseAudio, playViaMediaSource, playViaBlob]);

  return {
    playQueued,
    stop,
    isPlaying,
    currentSentenceIndex,
  };
}
