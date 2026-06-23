'use client';

/**
 * useQueuedVoicePlayback
 *
 * Streams TTS audio from /api/companion/:id/speak with progressive playback.
 *
 * Time-to-first-audio is the user-perceived latency from "message text
 * shown" to "voice starts speaking". OpenAI TTS itself is batch (not
 * streaming-native) so its server-side generation latency is ~500-800ms.
 * The remaining latency comes from how the client consumes the response:
 *
 *   Old: response.blob() buffers the entire MP3 before playback can start.
 *        Total user-perceived: ~4-8s for a typical chat response.
 *   New: MediaSource pipeline appends MP3 chunks as they arrive, audio
 *        starts playing once enough samples are decoded (typically the
 *        first ~500ms of audio bytes). Total user-perceived: ~1-2s.
 *
 * Browser compatibility:
 *   - Chrome / Edge / Firefox:    MediaSource path.
 *   - Safari (macOS):             MediaSource path.
 *   - iOS Safari < 17:            no MediaSource - falls back to blob().
 *   - iOS Safari >= 17:           has ManagedMediaSource only. Treated as
 *                                 unsupported here (falls back to blob());
 *                                 we can wire ManagedMediaSource specifically
 *                                 if mobile users want the speed-up later.
 *
 * The blob() fallback is the exact behavior the hook had before this
 * change, so unsupported browsers see no regression - they just don't get
 * the speed-up.
 *
 * Prosody is preserved: this is a single /speak call for the full text,
 * same as before. We just consume the response progressively instead of
 * waiting for it to finish. No sentence chunking, no audio joins.
 *
 * Public API unchanged from prior implementation:
 *   - playQueued(text)            - plays full text
 *   - stop()                      - cancels in-flight fetch and stops audio
 *   - isPlaying                   - true while fetching or playing
 *   - currentSentenceIndex        - -1 idle, 0 while playing (kept for
 *                                   backward compatibility with any
 *                                   consumer that historically read it)
 */

import { useRef, useCallback, useState } from 'react';
import { getUnlockedAudio } from '@/lib/audio/unlock';

const MIME_AUDIO_MPEG = 'audio/mpeg';

/**
 * iOS Safari blocks `new Audio().play()` after an `await`-broken gesture
 * chain. To work around this, the voice-consent button and the speaker
 * toggle call `unlockAudioPlayback()` (in lib/audio/unlock.ts) inside their
 * synchronous click handler. That unlocks one specific HTMLAudioElement
 * which we then reuse here for every TTS playback.
 *
 * If the user reached the chat without ever clicking the consent modal
 * (autoPlayVoice was restored from sessionStorage = 'true' on a fresh tab),
 * there is no unlocked element yet. In that case we fall back to
 * `new Audio()` — desktop browsers will play it fine; iOS will reject the
 * first call, but the toggle button will unlock things on the next tap.
 *
 * Either way, MediaSource streaming still requires that the audio element
 * be unlocked before play(); when we have one, we reuse it for both the
 * streaming and the blob fallback paths.
 */
function getPlaybackAudioElement(): HTMLAudioElement {
  const unlocked = getUnlockedAudio();
  if (unlocked) {
    // Reset previous src so the element is ready for a new stream/blob.
    try {
      unlocked.pause();
      unlocked.removeAttribute('src');
      unlocked.load();
    } catch {
      // best-effort cleanup
    }
    return unlocked;
  }
  return new Audio();
}

/**
 * Returns true when the browser can stream MP3 into a MediaSource. We
 * deliberately do NOT use ManagedMediaSource here (iOS 17+) - it has
 * subtle behavioral differences and would need its own test pass. For
 * now those browsers get the safe blob() fallback.
 */
function supportsMediaSourceStreaming(): boolean {
  if (typeof window === 'undefined') return false;
  const MS = (window as unknown as { MediaSource?: typeof MediaSource }).MediaSource;
  if (typeof MS === 'undefined') return false;
  try {
    return MS.isTypeSupported(MIME_AUDIO_MPEG);
  } catch {
    return false;
  }
}

export function useQueuedVoicePlayback(companionId: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);

  // ── Internal cleanup ────────────────────────────────────────────────────
  // Used by stop(), by error paths, and by the ended/error event handlers.
  // Releases the audio element, the MediaSource (if any), and the object
  // URL backing whichever one is in use. Idempotent.
  const releaseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      try {
        audio.pause();
        audio.src = '';
      } catch (err) {
        // pause()/src clearing is best-effort cleanup. Log so we know if
        // a browser ever throws here, but don't fail the cleanup path.
        console.error('[voice] error releasing audio element:', err);
      }
      audioRef.current = null;
    }

    const ms = mediaSourceRef.current;
    if (ms) {
      try {
        if (ms.readyState === 'open') {
          ms.endOfStream();
        }
      } catch {
        // endOfStream throws if state is wrong - safe to ignore in cleanup.
      }
      mediaSourceRef.current = null;
    }

    const url = objectUrlRef.current;
    if (url) {
      URL.revokeObjectURL(url);
      objectUrlRef.current = null;
    }
  }, []);

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
  // Pipes the /speak response body into a SourceBuffer one chunk at a time.
  // appendBuffer() is single-flight per SourceBuffer (throws while updating)
  // so chunks queue locally and drain on the 'updateend' event.
  const playViaMediaSource = useCallback(async (
    response: Response,
    abortController: AbortController
  ): Promise<void> => {
    if (!response.body) {
      throw new Error('Response has no body to stream');
    }

    const mediaSource = new MediaSource();
    const url = URL.createObjectURL(mediaSource);
    // Reuse the iOS-unlocked element when available — see
    // getPlaybackAudioElement() comment for why this matters.
    const audio = getPlaybackAudioElement();
    audio.src = url;
    audio.preload = 'auto';

    mediaSourceRef.current = mediaSource;
    objectUrlRef.current = url;
    audioRef.current = audio;

    // SourceBuffer can only be added once the MediaSource is open. The
    // browser fires 'sourceopen' once the URL is attached to a media
    // element and the element starts loading.
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

    // Chunks waiting to be appended. We never call appendBuffer while
    // sourceBuffer.updating === true (it throws InvalidStateError).
    const queue: Uint8Array[] = [];
    let readerDone = false;

    const pump = () => {
      if (sourceBuffer.updating) return;
      const next = queue.shift();
      if (next) {
        try {
          // Copy into a fresh ArrayBuffer. reader.read() yields a
          // Uint8Array<ArrayBufferLike> (the buffer could in principle be
          // a SharedArrayBuffer under some lib.dom typings) and
          // SourceBuffer.appendBuffer's BufferSource excludes SAB.
          // Constructing `new ArrayBuffer(n)` gives an unambiguous
          // ArrayBuffer that satisfies BufferSource. Copy is a few KB
          // per chunk, negligible.
          const chunk = new ArrayBuffer(next.byteLength);
          new Uint8Array(chunk).set(next);
          sourceBuffer.appendBuffer(chunk);
        } catch (err) {
          console.error('[voice] appendBuffer failed:', err);
        }
        return;
      }
      // Queue drained and reader is done - signal end of stream so the
      // audio element knows there's nothing more coming and can stop after
      // the last buffered sample plays.
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
      if (audioRef.current === audio) {
        releaseAudio();
        setIsPlaying(false);
        setCurrentSentenceIndex(-1);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    };

    audio.onerror = () => {
      console.error('[voice] audio element fired error event (stream mode)');
      if (audioRef.current === audio) {
        releaseAudio();
        setIsPlaying(false);
        setCurrentSentenceIndex(-1);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    };

    // Start playback now. The audio element will sit waiting until enough
    // samples are decoded then begin automatically. Calling play() before
    // any data is appended is safe per the HTMLMediaElement spec.
    audio.play().catch(err => {
      if ((err as Error).name === 'AbortError') return;
      // Autoplay policy can reject here. Same handling as the blob path:
      // log and let the cleanup paths reset state.
      console.error('[voice] audio.play() rejected (stream mode):', err);
    });

    // Drain the response body into the queue. Each chunk that arrives
    // triggers a pump() which either appends immediately (if SourceBuffer
    // is idle) or waits for the next 'updateend'.
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
      // Mark reader done so pump can call endOfStream once the queue drains.
      readerDone = true;
      pump();
    }
  }, [releaseAudio]);

  // ── Buffered fallback (blob) ───────────────────────────────────────────
  // Used when the browser doesn't support MediaSource streaming for
  // audio/mpeg (primarily iOS Safari). Matches the prior behavior of this
  // hook exactly - same time-to-first-audio characteristics as before.
  const playViaBlob = useCallback(async (
    response: Response,
    abortController: AbortController
  ): Promise<void> => {
    const blob = await response.blob();

    // Re-check abort after the body finishes streaming. A stop() call
    // during blob() resolution should be honored before we wire up audio.
    if (abortController.signal.aborted) return;

    const url = URL.createObjectURL(blob);
    // Reuse the iOS-unlocked element when available.
    const audio = getPlaybackAudioElement();
    audio.src = url;
    audio.preload = 'auto';

    objectUrlRef.current = url;
    audioRef.current = audio;

    audio.onended = () => {
      if (audioRef.current === audio) {
        releaseAudio();
        setIsPlaying(false);
        setCurrentSentenceIndex(-1);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    };

    audio.onerror = () => {
      console.error('[voice] audio element fired error event (blob mode)');
      if (audioRef.current === audio) {
        releaseAudio();
        setIsPlaying(false);
        setCurrentSentenceIndex(-1);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    };

    try {
      await audio.play();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('[voice] audio.play() rejected (blob mode):', err);
      if (audioRef.current === audio) {
        releaseAudio();
        setIsPlaying(false);
        setCurrentSentenceIndex(-1);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    }
  }, [releaseAudio]);

  // ── Main playback ───────────────────────────────────────────────────────
  // Fetch /speak in one POST and play it back. If a new playback starts
  // while a previous one is still active (in-flight fetch OR playing audio),
  // the previous one is aborted/released first. Streaming vs buffered is
  // decided upfront based on browser capability so the response body is
  // never consumed twice.
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
        console.error(
          `[voice] /speak returned ${response.status} for companion ${companionId}`
        );
        setIsPlaying(false);
        setCurrentSentenceIndex(-1);
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
