/**
 * iOS Safari audio unlock helper.
 *
 * iOS Safari (and to a lesser extent mobile Chrome) blocks HTMLAudioElement
 * .play() calls that don't originate from a user gesture. Our voice flow is:
 *
 *   user taps Send → await fetch('/api/.../speak') → new Audio() → audio.play()
 *
 * By the time play() runs, the original tap is no longer the "current" user
 * gesture and iOS rejects with NotAllowedError. The console message
 * "[voice] audio.play() rejected (blob mode)" in useQueuedVoicePlayback is
 * exactly this rejection — so on iPhone the voice never speaks.
 *
 * The fix is to "unlock" a single HTMLAudioElement during a real user gesture
 * (the voice-consent button, the speaker toggle). Once an element has
 * successfully played at least once from a gesture, iOS will allow
 * subsequent programmatic .play() calls on THAT specific element for the
 * rest of the page session. We keep a module-level reference to that
 * unlocked element and reuse it for every subsequent playback.
 *
 * Important: the unlock must happen synchronously inside the gesture's
 * event handler (no `await` between the click and the .play() call).
 *
 * The silent payload is a ~30ms MP3 of pure silence as a base64 data URL —
 * small enough to inline, browser-decoded immediately, no network round trip.
 */

let unlockedAudio: HTMLAudioElement | null = null;
let unlockAttempted = false;

// ~30ms of silence at 44.1kHz, MP3 encoded. Base64 inline so we don't need
// a network request and don't ship a binary asset.
const SILENT_MP3_DATA_URL =
  'data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tQxAAACAAAH+AAAAgAAA/wAAABMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tQxAAACAAAH+AAAAgAAA/wAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

/**
 * Try to unlock audio playback. MUST be called synchronously inside a user
 * gesture handler (e.g. an onClick handler), with NO `await` between the
 * gesture and this call. Safe to call multiple times — subsequent calls
 * no-op once a successful unlock has happened.
 *
 * Returns the unlocked HTMLAudioElement if successful, otherwise null.
 * The caller doesn't usually need the return value — getUnlockedAudio()
 * exposes it on demand.
 */
export function unlockAudioPlayback(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (unlockedAudio) return unlockedAudio;
  if (unlockAttempted) return null;

  unlockAttempted = true;

  try {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = SILENT_MP3_DATA_URL;
    audio.muted = false;
    audio.volume = 1;

    // play() returns a promise on modern browsers. The success path means
    // iOS has marked this element as user-activated; from now on we can
    // .play() it programmatically without a gesture.
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          unlockedAudio = audio;
        })
        .catch((err) => {
          // The silent play was rejected. We log because this means the
          // platform genuinely won't let us unlock here (very locked-down
          // privacy modes, etc.) — playback will still work on desktop and
          // on Android where the per-element gesture rule is looser.
          console.warn('[audio-unlock] silent play() rejected:', err);
          unlockedAudio = null;
        });
    } else {
      // Older browsers — play() returned undefined. Assume success.
      unlockedAudio = audio;
    }

    return audio;
  } catch (err) {
    console.warn('[audio-unlock] could not construct/play unlock element:', err);
    return null;
  }
}

/**
 * Returns the previously-unlocked audio element, or null if unlock hasn't
 * happened yet. The voice playback hook uses this to reuse the unlocked
 * element rather than constructing a new (locked) one per playback.
 */
export function getUnlockedAudio(): HTMLAudioElement | null {
  return unlockedAudio;
}

/**
 * Mostly for tests / hot reload — reset module state.
 */
export function _resetAudioUnlockForTesting(): void {
  unlockedAudio = null;
  unlockAttempted = false;
}
