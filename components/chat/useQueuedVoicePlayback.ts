'use client';

/**
 * useQueuedVoicePlayback
 *
 * Single-call voice playback hook. Sends the full message text to /api/speak
 * in one POST and plays the resulting audio back as one continuous performance.
 *
 * The previous implementation chunked each response into sentences and made
 * one TTS request per sentence. That destroyed prosody — every fragment got
 * its own falling cadence with no rise-and-fall across the full thought, so
 * the voice sounded like a dictionary entry instead of a person talking.
 *
 * Trade-off: time-to-first-audio is longer (~4–8s for typical responses
 * instead of ~2s) but every audio that plays sounds natural. /speak/sentences
 * and the sentence-mode branches in /speak remain in the codebase for any
 * future longform-narration feature, but chat playback no longer uses them.
 *
 * The hook keeps its public API identical to the previous implementation:
 *   - playQueued(text)            — plays full text
 *   - stop()                      — cancels in-flight fetch and stops audio
 *   - isPlaying                   — true while fetching or playing
 *   - currentSentenceIndex        — -1 idle, 0 while playing (kept for
 *                                   backward compatibility with consumers
 *                                   that historically read it; no caller in
 *                                   this codebase currently does)
 */

import { useRef, useCallback, useState } from 'react';

export function useQueuedVoicePlayback(companionId: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Internal cleanup ────────────────────────────────────────────────────
  // Used by stop(), by error paths, and by the ended/error event handlers.
  // Releases the audio element and the object URL backing it. Idempotent.
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

  // ── Main playback ───────────────────────────────────────────────────────
  // Fetch audio for the entire text in one call, then play it. If a new
  // playback starts while a previous one is still active (in-flight fetch
  // OR playing audio), the previous one is aborted/released first.
  const playQueued = useCallback(async (text: string): Promise<void> => {
    // Cancel any in-flight fetch from a previous playback.
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Release any audio element from a previous playback.
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

      if (abortController.signal.aborted) {
        return;
      }

      if (!response.ok) {
        console.error(
          `[voice] /speak returned ${response.status} for companion ${companionId}`
        );
        setIsPlaying(false);
        setCurrentSentenceIndex(-1);
        abortControllerRef.current = null;
        return;
      }

      const blob = await response.blob();

      // Re-check abort after the body finishes streaming. A stop() call
      // during blob() resolution should be honored before we wire up audio.
      if (abortController.signal.aborted) {
        return;
      }

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.preload = 'auto';

      objectUrlRef.current = url;
      audioRef.current = audio;

      audio.onended = () => {
        // Natural completion. Release the element and reset state.
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
        console.error('[voice] audio element fired error event');
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
        // Browsers reject play() on autoplay-policy violations and on
        // interruption. Treat as a non-fatal end-of-playback: log, clean up,
        // reset state. If this was an interruption from a newer playback
        // starting, the new one has already taken over.
        if ((err as Error).name === 'AbortError') {
          return;
        }
        console.error('[voice] audio.play() rejected:', err);
        if (audioRef.current === audio) {
          releaseAudio();
          setIsPlaying(false);
          setCurrentSentenceIndex(-1);
          if (abortControllerRef.current === abortController) {
            abortControllerRef.current = null;
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Expected — a newer playback or stop() call cancelled this one.
        return;
      }
      console.error('[voice] playback error:', error);
      releaseAudio();
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [companionId, releaseAudio]);

  return {
    playQueued,
    stop,
    isPlaying,
    currentSentenceIndex,
  };
}
