/**
 * @file        OpenAudio.js
 * @author      Rexore
 * @version     1.3.0
 * @license     Apache-2.0
 *
 * Copyright 2025 Rexore
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Plays one audio file once, triggered by any user event.
 *
 * Key behaviours:
 *   - Silent MP3 unlock on the shared element: satisfies browser autoplay
 *     policy on mobile/desktop by playing a base64 MP3 synchronously on the
 *     shared #audio element inside the gesture context. The unlock is performed
 *     only once (#isUnlocked flag); subsequent play() calls go directly to
 *     #playClip() without re-unlocking, preserving preloaded data and
 *     eliminating replay latency.
 *   - #isUnlocking guard: ignores rapid repeated calls during the async unlock.
 *   - #playCancelled flag: stop() plants a cancellation token that the
 *     in-flight unlock .then() checks before calling #playClip(), preventing
 *     phantom playback after stop() is called during an unlock.
 *   - #isPlaying private field + getter: state is read-only externally,
 *     preventing callers from silently corrupting the state machine.
 *   - Background tab detection: listens to the Page Visibility API
 *     (document.visibilitychange). Optionally pauses on hide and resumes on
 *     show (pauseOnHidden). Always fires onHidden / onVisible callbacks.
 *     Listener stored as #boundVisibility so destroy() removes the exact
 *     reference — no stale listener accumulation in SPAs.
 *   - Callbacks: onPlay, onEnd, onHidden, onVisible — all wrapped in try/catch
 *     so a throwing handler can never stall playback.
 *   - #isDestroyed flag: all public methods are safe no-ops after destroy().
 *   - destroy(): removes the visibilitychange listener and releases the Audio
 *     element via removeAttribute('src') + load() per the WHATWG spec resource-
 *     release pattern. Safe for SPA component teardown.
 *   - canPlay() static: check browser format support before constructing.
 *
 * ============================================================================
 * QUICK START
 * ============================================================================
 *
 *   const player = new OpenAudio('audio/sound.mp3', {
 *     volume:        0.9,
 *     label:         'My Sound',
 *     pauseOnHidden: true,
 *     onPlay:        () => console.log('playing'),
 *     onEnd:         () => console.log('done'),
 *     onHidden:      () => console.log('tab hidden'),
 *     onVisible:     () => console.log('tab visible'),
 *   });
 *
 *   document.getElementById('btn').addEventListener('click', () => player.play());
 *
 * ============================================================================
 * BROWSER AUTOPLAY POLICY
 * ============================================================================
 *
 * Call play() synchronously inside a user-initiated event handler.
 * Scroll does NOT qualify as a gesture in Chrome or Firefox.
 *
 * On the first call, play() sets #audio.src to a silent base64 MP3 and plays
 * it on the shared element within the gesture context, blessing it for all
 * future play() calls. On every subsequent call #isUnlocked is true, so
 * play() calls #playClip() directly — no re-unlock, no preload invalidation.
 *
 * Previously a throwaway new Audio() was used for the unlock — this failed
 * on iOS Safari because the throwaway element was blessed but #audio was not,
 * causing NotAllowedError on the actual clip.
 *
 * ============================================================================
 * BACKGROUND TAB DETECTION
 * ============================================================================
 *
 * pauseOnHidden: false (default)
 *   Audio continues when the tab is hidden. onHidden / onVisible still fire
 *   so you can update UI state if needed.
 *
 * pauseOnHidden: true
 *   The clip is paused when the tab hides and resumed from the same position
 *   when it returns. If the browser's autoplay policy has changed between the
 *   initial unlock and the visibility-restore (e.g. page was reloaded in the
 *   background), resume may be blocked and a console warning will be emitted.
 *   In practice, on all major 2025 browsers (Chrome, Firefox, Safari, Edge),
 *   resuming a previously-playing element after a tab becomes visible again
 *   does not require a new user gesture.
 *
 * ============================================================================
 * CHANGELOG
 * ============================================================================
 *
 * 1.3.0
 *   - #isUnlocked flag: unlock is performed only once. Subsequent play() calls
 *     (including replays) skip the silent-MP3 dance entirely, preserving
 *     preloaded data and eliminating per-replay latency. Previously every
 *     play() discarded buffered audio and re-fetched the real src.
 *   - #playCancelled flag: stop() plants a cancellation token before pausing.
 *     The in-flight unlock .then() checks the flag before calling #playClip(),
 *     preventing phantom playback when stop() is called during an async unlock.
 *     Previously stop() could not cancel an in-flight unlock.
 *   - isPlaying is now a private field (#isPlaying) exposed via a read-only
 *     getter. Previously it was a plain public property, allowing callers to
 *     silently corrupt the state machine.
 *   - #isPlaying is now set true synchronously before the .play() call in
 *     #playClip(), closing the double-play race window. Reverted to false in
 *     .catch() on non-abort errors. Previously setting it in .then() left a
 *     window where rapid play() calls could attempt concurrent playback.
 *   - Same pre-set/revert pattern applied to the visibility-resume .play()
 *     call in #onVisibilityChange(). Previously the .then() set isPlaying =
 *     true after stop() had already set it to false.
 *   - destroy() now uses removeAttribute('src') + load() per the WHATWG
 *     HTMLMediaElement resource-release spec, rather than src = ''.
 *   - destroy() now resets #pausedByVisibility to false.
 *   - Removed unreachable this.#audio?.pause() from #playClip() .then().
 *
 * 1.2.0
 *   - Unlock now plays the silent MP3 on the shared #audio element rather
 *     than a throwaway new Audio(). Previously the throwaway was blessed but
 *     #audio was not, causing NotAllowedError on iOS Safari for the real clip.
 *   - #isDestroyed flag: all public methods (play, stop, destroy) return
 *     immediately after destroy() has been called, making post-destroy calls
 *     safe no-ops rather than throws on the nulled #audio element.
 *   - destroy() now checks #isDestroyed to prevent double-destroy throwing.
 *   - play() guard extended: also checks #isDestroyed.
 *   - stop() guard extended: also checks #isDestroyed.
 *   - #onVisibilityChange() guards on #isDestroyed and #audio null-check,
 *     preventing a race if the event fires during or after teardown.
 *   - canPlay() static: now returns false for empty/non-string input rather
 *     than letting canPlayType() throw on undefined.
 *
 * 1.1.0
 *   - Background tab detection via Page Visibility API.
 *   - pauseOnHidden option: pause on hide, resume on show.
 *   - onHidden / onVisible callbacks, wrapped in try/catch.
 *   - #boundVisibility: stored bound reference for clean destroy() removal.
 *   - destroy() removes the visibilitychange listener.
 *   - Class renamed from SingleAudio to OpenAudio to match filename.
 *
 * 1.0.0
 *   - Initial release. Single-clip, one-shot player.
 *   - Silent MP3 unlock, #isUnlocking guard, onPlay/onEnd callbacks,
 *     destroy(), canPlay() static.
 *
 * ============================================================================
 * CONFIGURATION OPTIONS
 * ============================================================================
 *
 *   volume        {number}   Playback volume 0.0–1.0              default: 1.0
 *   label         {string}   Name shown in console warnings        default: src
 *   pauseOnHidden {boolean}  Pause when tab hides, resume on show  default: false
 *   onPlay        {Function} Called when playback starts           default: null
 *   onEnd         {Function} Called when playback ends naturally   default: null
 *   onHidden      {Function} Called when the tab becomes hidden    default: null
 *   onVisible     {Function} Called when the tab becomes visible   default: null
 *
 * ============================================================================
 * PUBLIC API
 * ============================================================================
 *
 *   player.play()      Unlock (first call only) and play the clip. Must be
 *                      inside a gesture handler on first call. Rewinds and
 *                      replays if called after the clip has already ended.
 *                      Ignored while already playing, unlocking, or after
 *                      destroy().
 *
 *   player.stop()      Pause and rewind to start. Cancels any in-flight
 *                      unlock so the clip does not start after stop() returns.
 *                      No-op after destroy().
 *
 *   player.destroy()   Remove visibilitychange listener, release Audio element
 *                      per WHATWG spec (removeAttribute + load). Call on SPA
 *                      component unmount. All subsequent calls are safe no-ops.
 *
 *   player.isPlaying   {boolean}  Read-only. True while the clip is actively
 *                                 playing.
 *
 * ── STATIC UTILITY ──────────────────────────────────────────────────────────
 *
 *   OpenAudio.canPlay(type)  Returns true if the browser can likely play the
 *                            given MIME type. Wraps canPlayType().
 *
 * ============================================================================
 */

// Silent 1-second MP3 — used to unlock the shared Audio element within the
// gesture context before the real clip is played. Played only once per
// instance (#isUnlocked ensures it is never repeated).
const _OPENAUDIO_SILENT_MP3 =
  'data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsgU291bmQgRWZmZWN0cyBMaWJyYXJ5Ly8v' +
  'VFNTTQAAAAALAAADAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAA' +
  'AP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP//' +
  '//8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8A' +
  'AAAAAAAAAP////8=';

class OpenAudio {

  // ── Private fields ──────────────────────────────────────────────────────────
  #src;
  #label;
  #volume;
  #audio;
  #endedHandler;
  #boundVisibility;
  #onPlay;
  #onEnd;
  #onHidden;
  #onVisible;
  #pauseOnHidden;
  #isUnlocking        = false;
  // True after the first successful user-gesture unlock. Subsequent play()
  // calls skip the silent-MP3 dance entirely, preserving preloaded data.
  #isUnlocked         = false;
  #isDestroyed        = false;
  #pausedByVisibility = false;
  // Written by stop() and checked by the async unlock .then() before it calls
  // #playClip(), preventing phantom playback when stop() races an unlock.
  #playCancelled      = false;
  // Backing field for the read-only isPlaying getter.
  #isPlaying          = false;

  /**
   * @param {string}   src
   * @param {Object}   [options={}]
   * @param {number}   [options.volume=1.0]
   * @param {string}   [options.label='']
   * @param {boolean}  [options.pauseOnHidden=false]
   * @param {Function} [options.onPlay]
   * @param {Function} [options.onEnd]
   * @param {Function} [options.onHidden]
   * @param {Function} [options.onVisible]
   */
  constructor(src, options = {}) {
    if (!src || typeof src !== 'string' || !src.trim()) {
      throw new TypeError('OpenAudio: src must be a non-empty string.');
    }

    this.#src           = src;
    this.#label         = options.label || src;
    this.#volume        = Math.min(1, Math.max(0, options.volume ?? 1.0));
    this.#pauseOnHidden = options.pauseOnHidden ?? false;
    this.#onPlay        = options.onPlay    || null;
    this.#onEnd         = options.onEnd     || null;
    this.#onHidden      = options.onHidden  || null;
    this.#onVisible     = options.onVisible || null;

    // Single shared Audio element — created once, reused on replay.
    // Preloading the real src here so the browser can begin buffering before
    // play() is called. Because #isUnlocked skips the re-unlock on subsequent
    // play() calls, this preloaded data is now actually preserved and used.
    this.#audio         = new Audio();
    this.#audio.volume  = this.#volume;
    this.#audio.preload = 'auto';
    this.#audio.src     = this.#src;

    // Store handler reference so destroy() can remove it cleanly.
    this.#endedHandler = () => {
      if (this.#isDestroyed) return;
      this.#isPlaying = false;
      try { if (this.#onEnd) this.#onEnd(); } catch (e) {
        console.warn(`OpenAudio: onEnd callback error (${this.#label}):`, e);
      }
    };
    this.#audio.addEventListener('ended', this.#endedHandler);

    // Stored bound reference — an inline arrow cannot be removed by
    // removeEventListener, causing stale listeners to accumulate in SPAs.
    this.#boundVisibility = this.#onVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.#boundVisibility);
  }

  // ── PUBLIC API ──────────────────────────────────────────────────────────────

  /** @returns {boolean} True while the clip is actively playing. Read-only. */
  get isPlaying() { return this.#isPlaying; }

  /**
   * Unlock the Audio element (first call only) and play the clip.
   *
   * Must be called synchronously inside a user gesture on first use.
   * Rewinds and replays from the start if the clip has already ended.
   * Ignored while already playing, while the unlock is in progress,
   * or after destroy() has been called.
   */
  play() {
    if (this.#isDestroyed || this.#isPlaying || this.#isUnlocking) return;

    // Reset cancellation flag on every fresh play() invocation.
    this.#playCancelled = false;

    // Element already blessed — skip the silent-MP3 unlock entirely.
    // The real src is already loaded; #playClip() can call .play() directly.
    if (this.#isUnlocked) {
      this.#playClip();
      return;
    }

    this.#isUnlocking = true;

    // Unlock the SHARED element by playing the silent MP3 on it directly.
    // A throwaway new Audio() would bless the wrong element and leave #audio
    // blocked on iOS Safari.
    this.#audio.src    = _OPENAUDIO_SILENT_MP3;
    this.#audio.volume = 0;
    this.#audio.play()
      .then(() => {
        this.#isUnlocking = false;
        // Honour a stop() call that arrived while the unlock was in progress.
        if (this.#isDestroyed || this.#playCancelled) return;
        // Mark permanently unlocked so future calls skip this block.
        this.#isUnlocked   = true;
        this.#audio.src    = this.#src;
        this.#audio.volume = this.#volume;
        this.#playClip();
      })
      .catch(err => {
        this.#isUnlocking = false;
        if (this.#isDestroyed) return;
        if (err.name === 'NotAllowedError') {
          console.warn(
            `OpenAudio: autoplay blocked during unlock for "${this.#label}". ` +
            'play() must be called synchronously inside a user gesture handler ' +
            '(click / keydown / touchstart).'
          );
        }
        // AbortError or other — leave state clean, do not attempt playback.
      });
  }

  /**
   * Stop playback and rewind to start.
   *
   * Also cancels any in-flight unlock via #playCancelled, so the clip will
   * not start playing after stop() returns even if the async unlock .then()
   * fires a few milliseconds later. No-op after destroy().
   */
  stop() {
    if (this.#isDestroyed) return;
    this.#playCancelled      = true;
    this.#audio.pause();
    this.#audio.currentTime  = 0;
    this.#isPlaying          = false;
    this.#pausedByVisibility = false;
  }

  /**
   * Remove the visibilitychange listener and release the Audio element.
   * Uses removeAttribute('src') + load() per the WHATWG HTMLMediaElement
   * resource-release spec to abort any pending network activity cleanly.
   * Call on SPA component unmount. All subsequent method calls are safe no-ops.
   */
  destroy() {
    if (this.#isDestroyed) return;
    this.#isDestroyed        = true;
    this.#pausedByVisibility = false;
    this.#audio.pause();
    this.#audio.removeEventListener('ended', this.#endedHandler);
    document.removeEventListener('visibilitychange', this.#boundVisibility);
    // WHATWG-specified resource-release sequence: removeAttribute('src') +
    // load() aborts any in-progress network fetch and resets the media element
    // state machine cleanly, avoiding the spurious 'error' events that
    // src = '' can fire on some browsers.
    this.#audio.removeAttribute('src');
    this.#audio.load();
    this.#audio = null;
  }

  /**
   * Check whether the browser can likely play a given audio MIME type.
   * @param  {string}  type  e.g. 'audio/mpeg', 'audio/ogg', 'audio/wav'
   * @returns {boolean}
   */
  static canPlay(type) {
    if (typeof type !== 'string' || !type.trim()) return false;
    return new Audio().canPlayType(type) !== '';
  }

  // ── PRIVATE ─────────────────────────────────────────────────────────────────

  /**
   * Handles visibilitychange events for background tab detection.
   *
   * On hide: fires onHidden; pauses if pauseOnHidden is true and clip is playing.
   * On show: fires onVisible; resumes if pauseOnHidden is true and clip was
   *          paused by this handler (#pausedByVisibility).
   */
  #onVisibilityChange() {
    if (this.#isDestroyed || !this.#audio) return;

    if (document.visibilityState === 'hidden') {
      try { if (this.#onHidden) this.#onHidden(); } catch (e) {
        console.warn(`OpenAudio: onHidden callback error (${this.#label}):`, e);
      }
      if (this.#pauseOnHidden && this.#isPlaying) {
        this.#audio.pause();
        this.#isPlaying          = false;
        this.#pausedByVisibility = true;
      }

    } else if (document.visibilityState === 'visible') {
      try { if (this.#onVisible) this.#onVisible(); } catch (e) {
        console.warn(`OpenAudio: onVisible callback error (${this.#label}):`, e);
      }
      if (this.#pauseOnHidden && this.#pausedByVisibility) {
        this.#pausedByVisibility = false;
        // Set #isPlaying true synchronously before the Promise, then revert in
        // .catch() if play() fails — mirrors the #playClip() pattern, closing
        // the race where a stop() .then() could overwrite stop()'s false.
        this.#isPlaying = true;
        this.#audio.play()
          .catch(err => {
            this.#isPlaying = false;
            if (err.name === 'AbortError') return;
            console.warn(
              `OpenAudio: resume after visibility restore failed for "${this.#label}".\nError:`, err
            );
          });
      }
    }
  }

  /**
   * Play the real clip on the already-unlocked shared Audio element.
   *
   * #isPlaying is set true synchronously before the .play() call so that any
   * rapid second play() call hits the isPlaying guard immediately, closing the
   * race window that previously existed between the call and .then(). On
   * failure, #isPlaying is reverted to false in .catch().
   */
  #playClip() {
    if (this.#isDestroyed) return;

    this.#audio.currentTime  = 0;
    this.#audio.volume       = this.#volume;
    this.#pausedByVisibility = false;
    // Set before the async boundary to close the double-play race window.
    this.#isPlaying          = true;

    this.#audio.play()
      .then(() => {
        if (this.#isDestroyed) return;
        try { if (this.#onPlay) this.#onPlay(); } catch (e) {
          console.warn(`OpenAudio: onPlay callback error (${this.#label}):`, e);
        }
      })
      .catch(err => {
        this.#isPlaying = false;   // revert the optimistic flag on failure
        if (err.name === 'AbortError' || this.#isDestroyed) return;
        if (err.name === 'NotAllowedError') {
          console.warn(
            `OpenAudio: play() blocked by autoplay policy for "${this.#label}". ` +
            'Call play() again inside a user gesture.'
          );
        } else {
          console.warn(`OpenAudio: play() failed for "${this.#label}".\nError:`, err);
        }
      });
  }
}


// ── USAGE EXAMPLES ────────────────────────────────────────────────────────────

/*

// ── Minimal ───────────────────────────────────────────────────────────────────

const player = new OpenAudio('audio/chime.mp3');
document.getElementById('btn').addEventListener('click', () => player.play());


// ── With all options ──────────────────────────────────────────────────────────

const player = new OpenAudio('audio/chime.mp3', {
  volume:        0.8,
  label:         'Chime',
  pauseOnHidden: true,
  onPlay:        () => console.log('playing'),
  onEnd:         () => console.log('done'),
  onHidden:      () => console.log('tab hidden — audio paused'),
  onVisible:     () => console.log('tab visible — audio resumed'),
});


// ── Callbacks only, no auto-pause ─────────────────────────────────────────────

// Audio keeps playing in background; UI is updated via callbacks only.
const player = new OpenAudio('audio/ambient.mp3', {
  onHidden:  () => updateUI('background'),
  onVisible: () => updateUI('foreground'),
});


// ── One-shot on any gesture ───────────────────────────────────────────────────

document.addEventListener('click',      () => player.play(), { once: true });
document.addEventListener('keydown',    () => player.play(), { once: true });
document.addEventListener('touchstart', () => player.play(), { once: true });


// ── Replay ────────────────────────────────────────────────────────────────────

// play() rewinds and replays if the clip has already ended.
// From 1.3.0: replay skips the unlock entirely — preloaded data is preserved.
document.getElementById('replay-btn').addEventListener('click', () => player.play());


// ── Stop mid-playback ─────────────────────────────────────────────────────────

// From 1.3.0: stop() also cancels any in-flight unlock via #playCancelled.
document.getElementById('stop-btn').addEventListener('click', () => player.stop());


// ── Check format support ──────────────────────────────────────────────────────

if (!OpenAudio.canPlay('audio/ogg')) {
  console.warn('OGG not supported — use an MP3 source instead.');
}


// ── SPA teardown (React, Vue, etc.) ──────────────────────────────────────────

// React:
// useEffect(() => {
//   const player = new OpenAudio('audio/chime.mp3', { pauseOnHidden: true });
//   return () => player.destroy();
// }, []);

// Vue:
// onUnmounted(() => player.destroy());

*/
