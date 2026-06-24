/**
 * iOS Safari audio unlock helper.
 *
 * iOS Safari (and to a lesser extent mobile Chrome) blocks
 * HTMLAudioElement.play() calls that don't originate from a user gesture.
 * Our voice flow is:
 *
 *   user taps Send -> await fetch('/api/.../speak') -> audio.play()
 *
 * By the time play() runs, the original tap is no longer the "current" user
 * gesture and iOS rejects with NotAllowedError - silently. The user sees
 * the "Speaking..." indicator but hears nothing.
 *
 * THE FIX (matches the known-good UnderFireAI pattern):
 *
 *   1. Render a single persistent <audio> element in the React tree with
 *      `playsInline preload="auto" style={{display:'none'}}`. The element
 *      must be IN THE DOM - a detached `new Audio()` instance is treated
 *      separately by iOS's per-element gesture-activation rules and is
 *      far more fragile when you swap its `src` between clips.
 *
 *   2. Prime that one element inside a real user gesture by setting its
 *      src to a tiny silent MP3, calling .play() while muted, then
 *      pausing and unmuting. Once iOS has accepted ONE muted play() on
 *      that specific element during a gesture, every subsequent
 *      programmatic .play() on the same element is allowed for the rest
 *      of the page session.
 *
 *   3. Reuse the same element for every TTS clip (streaming and blob
 *      fallback paths both write to its `src`). Never construct a fresh
 *      `new Audio()` per playback - that instance is NOT unlocked.
 *
 *   4. Force `muted = false; volume = 1.0` before EVERY .play() call,
 *      defending against the race where the silent-muted primer was
 *      AbortError'd mid-play and left the element muted (playback
 *      "works" but is inaudible - the exact silent-loading-state bug).
 *
 * The unlock MUST run synchronously inside the gesture handler. No
 * `await` between the user's tap and the .play() inside primeAudioElement,
 * or iOS treats the gesture as expired.
 */

/**
 * Tracks which specific HTMLAudioElement instances have been successfully
 * primed during a user gesture. Using a WeakSet so the entry is GC'd
 * automatically when React unmounts the element.
 */
const unlockedElements = new WeakSet<HTMLAudioElement>();

/**
 * In-flight prime promises so concurrent callers (first-gesture listener
 * firing the same tick as the send handler) share one play() rather than
 * racing two .play()s on the same element. The second .play() would
 * AbortError the first, which is the exact source of the "muted forever"
 * bug if it happens during the silent-muted window.
 */
const pendingPrimes = new WeakMap<HTMLAudioElement, Promise<boolean>>();

/**
 * ~30 ms of silence at 44.1 kHz, MP3 encoded. Inline base64 so there is no
 * network round-trip - the data URL resolves synchronously and the play()
 * completes inside the user-gesture window. iOS requires MP3 (not WAV)
 * for the silent-primer trick to register on the same MediaSource the
 * element will later use for the real TTS clip.
 */
const SILENT_MP3_DATA_URL =
  'data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tQxAAACAAAH+AAAAgAAA/wAAABMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tQxAAACAAAH+AAAAgAAA/wAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

/**
 * Prime an in-DOM HTMLAudioElement for programmatic playback. Safe to call
 * any number of times - once an element is successfully primed the function
 * resolves true immediately on subsequent calls. If two callers arrive in
 * the same tick they share the same in-flight play() promise.
 *
 * IMPORTANT: caller MUST invoke this synchronously inside a real user
 * gesture handler (onClick / onTouchEnd / Send keydown). Calling it from
 * inside a setTimeout, a microtask, or after `await` will not satisfy
 * iOS Safari's gesture requirement and the unlock will silently fail.
 *
 * Returns true if the element is (or becomes) unlocked, false otherwise.
 */
export function primeAudioElement(
  el: HTMLAudioElement | null,
): Promise<boolean> {
  if (!el) return Promise.resolve(false);
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (unlockedElements.has(el)) return Promise.resolve(true);

  // Coalesce concurrent calls - see pendingPrimes comment above.
  const existing = pendingPrimes.get(el);
  if (existing) return existing;

  const primePromise = (async (): Promise<boolean> => {
    try {
      el.src = SILENT_MP3_DATA_URL;
      el.muted = true;
      el.volume = 1;
      // play() resolves once the browser has actually started playback;
      // for a 30ms silent MP3 this is near-instant. AbortError can still
      // be thrown if the element's src changes between here and the play
      // resolving - that's why we coalesce concurrent callers above.
      await el.play();
      el.pause();
      el.currentTime = 0;
      // Always unmute on the success path. The next TTS clip will set src
      // again, but the element retains its unlocked status because iOS
      // tracks activation per-element, not per-src.
      el.muted = false;
      unlockedElements.add(el);
      return true;
    } catch (err) {
      // Unlock failed. Most common causes: another play() raced us
      // (AbortError) or the browser policy genuinely won't let us prime
      // here. Critically: always restore muted=false so a later real TTS
      // clip is not silently inaudible.
      console.warn('[audio-unlock] prime failed:', err);
      try {
        el.muted = false;
      } catch {
        // ignore
      }
      return false;
    } finally {
      pendingPrimes.delete(el);
    }
  })();

  pendingPrimes.set(el, primePromise);
  return primePromise;
}

/**
 * Query helper - true if the element has been successfully primed during
 * a gesture this session. Used by the TTS hook to decide whether to call
 * primeAudioElement opportunistically before a play().
 */
export function isElementUnlocked(el: HTMLAudioElement | null): boolean {
  if (!el) return false;
  return unlockedElements.has(el);
}

/**
 * Test/HMR reset helper. Not used at runtime.
 */
export function _resetAudioUnlockForTesting(el?: HTMLAudioElement): void {
  if (el) {
    unlockedElements.delete(el);
    pendingPrimes.delete(el);
  }
  // For full reset across all elements: WeakSet has no clear(); recreating
  // is not possible because callers hold the reference. Per-element delete
  // is sufficient for tests that own the element they care about.
}
