/**
 * @file        OpenAudio.js
 * @author      Rexore
 * @version     1.1.0
 * @license     GPL-3.0-or-later
 *
 * Plays one audio file once, triggered by any user event.
 *
 * Key behaviours:
 *   - Silent MP3 unlock: satisfies browser autoplay policy on mobile/desktop
 *     by playing a zero-length base64 MP3 synchronously inside the gesture.
 *   - #isUnlocking guard: ignores rapid repeated calls during the async unlock.
 *   - Background tab detection: listens to the Page Visibility API
 *     (document.visibilitychange). Optionally pauses on hide and resumes on
 *     show (pauseOnHidden). Always fires onHidden / onVisible callbacks.
 *     Listener stored as #boundVisibility so destroy() removes the exact
 *     reference — no stale listener accumulation in SPAs.
 *   - Callbacks: onPlay, onEnd, onHidden, onVisible — all wrapped in try/catch
 *     so a throwing handler can never stall playback.
 *   - destroy(): removes the visibilitychange listener and releases the Audio
 *     element. Safe for SPA component teardown.
 *   - canPlay() static: check browser format support before constructing.
 *
 * ============================================================================
 * QUICK START
 * ============================================================================
 *
 *   const player = new OpenAudio('audio/sound.mp3', {
 *     volume:        0.9,
 *     label:         'My Sound',
 *     pauseOnHidden: true,             // pause when tab loses focus
 *     onPlay:        () => console.log('playing'),
 *     onEnd:         () => console.log('done'),
 *     onHidden:      () => console.log('tab hidden'),
 *     onVisible:     () => console.log('tab visible'),
 *   });
 *
 *   // Trigger on any user gesture:
 *   document.getElementById('btn').addEventListener('click', () => player.play());
 *   document.addEventListener('click',      () => player.play(), { once: true });
 *   document.addEventListener('keydown',    () => player.play(), { once: true });
 *   document.addEventListener('touchstart', () => player.play(), { once: true });
 *
 * ============================================================================
 * BROWSER AUTOPLAY POLICY
 * ============================================================================
 *
 * Call play() synchronously inside a user-initiated event handler.
 * Scroll does NOT qualify as a gesture in Chrome or Firefox.
 * play() internally fires a silent base64 MP3 to unlock the audio element
 * before playing the real clip — required for iOS Safari compatibility.
 *
 * ============================================================================
 * BACKGROUND TAB DETECTION
 * ============================================================================
 *
 * This engine listens to the Page Visibility API (document.visibilitychange).
 *
 * Behaviour depends on the pauseOnHidden option (default: false):
 *
 *   pauseOnHidden: false (default)
 *     Audio continues playing when the tab is hidden — browsers do not
 *     throttle active audio playback, only setTimeout timers. onHidden and
 *     onVisible still fire so you can update UI state if needed.
 *
 *   pauseOnHidden: true
 *     The clip is paused when the tab hides and resumed from the same
 *     position when the tab returns to the foreground. Useful when audio
 *     should only play while the page is visible (e.g. in-app sounds, game
 *     audio). Note: after a resume, browsers may require the resume call
 *     to be inside a gesture on stricter autoplay policies — if the user
 *     has not interacted since hiding, resume may be silently blocked.
 *
 * The visibilitychange listener is stored as a bound reference (#boundVisibility)
 * so that destroy() can pass the exact same function to removeEventListener.
 * An inline arrow function would create a new reference each time and could
 * not be removed, causing stale listeners to accumulate in SPAs.
 *
 * ============================================================================
 * CHANGELOG
 * ============================================================================
 *
 * 1.1.0
 *   - Background tab detection via Page Visibility API.
 *   - pauseOnHidden option: pause on hide, resume on show.
 *   - onHidden / onVisible callbacks, wrapped in try/catch.
 *   - #boundVisibility: stored bound reference for clean destroy() removal.
 *   - destroy() now removes the visibilitychange listener.
 *   - Class renamed from SingleAudio to OpenAudio to match filename.
 *
 * 1.0.0
 *   - Initial release. Single-clip, one-shot player.
 *   - Silent MP3 unlock, #isUnlocking guard, onPlay/onEnd callbacks,
 *     destroy(), canPlay() static.
 *
 * ============================================================================
 */

class OpenAudio {

  // ── Silent 1-second MP3 used only to unlock the audio element ──────────────
  static #SILENT_MP3 =
    'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAA' +
    'AAAAAP/7kGQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhgCg' +
    'oKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKD///////' +
    '///////////////////////////////////////////////////////////AAAAAExhdmM1OC41' +
    'NQAAAAAAAAAAAAAAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWluZwAAAA8A' +
    'AAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAv' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

  // ── Private fields ──────────────────────────────────────────────────────────
  #src;
  #label;
  #volume;
  #audio;
  #onPlay;
  #onEnd;
  #onHidden;
  #onVisible;
  #pauseOnHidden;
  #isUnlocking        = false;
  #pausedByVisibility = false;
  #boundVisibility;

  /**
   * @param {string} src                              - Path or data URI for your audio file.
   * @param {object} [options]
   * @param {number}   [options.volume=1.0]           - Playback volume 0.0–1.0.
   * @param {string}   [options.label='']             - Name shown in console warnings.
   * @param {boolean}  [options.pauseOnHidden=false]  - Pause when tab is hidden;
   *                                                    resume when it returns.
   * @param {Function} [options.onPlay]               - Called when playback starts.
   * @param {Function} [options.onEnd]                - Called when playback ends naturally.
   * @param {Function} [options.onHidden]             - Called when the tab becomes hidden.
   * @param {Function} [options.onVisible]            - Called when the tab becomes visible.
   */
  constructor(src, options = {}) {
    if (!src || typeof src !== 'string') {
      throw new TypeError('OpenAudio: src must be a non-empty string.');
    }

    const {
      volume        = 1.0,
      label         = '',
      pauseOnHidden = false,
      onPlay        = null,
      onEnd         = null,
      onHidden      = null,
      onVisible     = null,
    } = options;

    this.#src           = src;
    this.#label         = label || src;
    this.#volume        = Math.min(1, Math.max(0, volume));
    this.#pauseOnHidden = pauseOnHidden;
    this.#onPlay        = onPlay;
    this.#onEnd         = onEnd;
    this.#onHidden      = onHidden;
    this.#onVisible     = onVisible;

    // Single shared Audio element — created once, reused on replay.
    this.#audio         = new Audio();
    this.#audio.volume  = this.#volume;
    this.#audio.preload = 'auto';
    this.#audio.src     = this.#src;

    this.#audio.addEventListener('ended', () => {
      this.isPlaying = false;
      try { if (this.#onEnd) this.#onEnd(); } catch (e) {
        console.warn(`OpenAudio: onEnd callback error (${this.#label}):`, e);
      }
    });

    // Store the bound reference so destroy() removes the exact same function.
    // An inline arrow would create a new reference that removeEventListener
    // could never match — causing stale listeners to accumulate in SPAs.
    this.#boundVisibility = this.#onVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.#boundVisibility);
  }

  // ── Public state ────────────────────────────────────────────────────────────

  /** True while the clip is actively playing. */
  isPlaying = false;

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Unlocks the audio element (if needed) then plays the clip.
   * Must be called synchronously inside a user-gesture event handler on first use.
   *
   * Safe to call repeatedly — ignored while already playing or unlocking.
   * Calling play() after the clip has ended rewinds and replays from the start.
   */
  play() {
    if (this.isPlaying || this.#isUnlocking) return;

    this.#isUnlocking = true;

    // Play the silent MP3 synchronously within the gesture context.
    // This unlocks the audio element for subsequent .play() calls on iOS/Chrome.
    const unlock = new Audio(OpenAudio.#SILENT_MP3);
    unlock.play().then(() => {
      this.#isUnlocking = false;
      this.#playClip();
    }).catch(() => {
      // Unlock failed — still attempt playback (desktop may not need it).
      this.#isUnlocking = false;
      this.#playClip();
    });
  }

  /**
   * Stops playback and rewinds to the start.
   */
  stop() {
    this.#audio.pause();
    this.#audio.currentTime = 0;
    this.isPlaying          = false;
    this.#pausedByVisibility = false;
  }

  /**
   * Removes the visibilitychange listener and releases the Audio element.
   * Call on SPA component unmount. Do not call any other methods after destroy().
   */
  destroy() {
    document.removeEventListener('visibilitychange', this.#boundVisibility);
    this.stop();
    this.#audio.src = '';
    this.#audio     = null;
  }

  /**
   * Returns true if the browser reports it can probably or maybe play the
   * given MIME type. Use before constructing to avoid silent format failures.
   *
   * @param {string} type  e.g. 'audio/ogg', 'audio/wav', 'audio/mpeg'
   * @returns {boolean}
   */
  static canPlay(type) {
    const result = new Audio().canPlayType(type);
    return result === 'probably' || result === 'maybe';
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  /**
   * Handles visibilitychange events.
   *
   * On hide:
   *   - Fires onHidden callback.
   *   - If pauseOnHidden is true and the clip is playing, pauses it and sets
   *     #pausedByVisibility so the resume path knows to restore playback.
   *
   * On show:
   *   - Fires onVisible callback.
   *   - If pauseOnHidden is true and #pausedByVisibility is set, resumes
   *     playback from the same position.
   */
  #onVisibilityChange() {
    if (document.visibilityState === 'hidden') {

      try { if (this.#onHidden) this.#onHidden(); } catch (e) {
        console.warn(`OpenAudio: onHidden callback error (${this.#label}):`, e);
      }

      if (this.#pauseOnHidden && this.isPlaying) {
        this.#audio.pause();
        this.#pausedByVisibility = true;
      }

    } else if (document.visibilityState === 'visible') {

      try { if (this.#onVisible) this.#onVisible(); } catch (e) {
        console.warn(`OpenAudio: onVisible callback error (${this.#label}):`, e);
      }

      if (this.#pauseOnHidden && this.#pausedByVisibility) {
        this.#pausedByVisibility = false;
        this.#audio.play().catch(err => {
          if (err.name === 'AbortError') return;
          console.warn(
            `OpenAudio: resume after visibility restore failed for "${this.#label}".\nError:`, err
          );
        });
      }
    }
  }

  #playClip() {
    // Rewind in case it was played before.
    this.#audio.currentTime  = 0;
    this.#audio.volume       = this.#volume;
    this.#pausedByVisibility = false;

    this.#audio.play().then(() => {
      this.isPlaying = true;
      try { if (this.#onPlay) this.#onPlay(); } catch (e) {
        console.warn(`OpenAudio: onPlay callback error (${this.#label}):`, e);
      }
    }).catch(err => {
      if (err.name === 'AbortError') return;

      if (err.name === 'NotAllowedError') {
        console.warn(
          `OpenAudio: play() blocked by autoplay policy for "${this.#label}". ` +
          `Call play() again inside a user gesture.`
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


// ── With background tab options ───────────────────────────────────────────────

const player = new OpenAudio('audio/chime.mp3', {
  volume:        0.8,
  label:         'Chime',
  pauseOnHidden: true,                          // pause when tab loses focus
  onPlay:        () => console.log('playing'),
  onEnd:         () => console.log('done'),
  onHidden:      () => console.log('tab hidden — audio paused'),
  onVisible:     () => console.log('tab visible — audio resumed'),
});


// ── Callbacks only, no auto-pause ─────────────────────────────────────────────

// Audio keeps playing in background; only UI is updated.
const player = new OpenAudio('audio/ambient.mp3', {
  onHidden:  () => updateUI('background'),
  onVisible: () => updateUI('foreground'),
});


// ── One-shot on any gesture ───────────────────────────────────────────────────

document.addEventListener('click',      () => player.play(), { once: true });
document.addEventListener('keydown',    () => player.play(), { once: true });
document.addEventListener('touchstart', () => player.play(), { once: true });


// ── Replay ────────────────────────────────────────────────────────────────────

// play() rewinds and replays if called again after the clip has ended.
document.getElementById('replay-btn').addEventListener('click', () => player.play());


// ── Stop mid-playback ─────────────────────────────────────────────────────────

document.getElementById('stop-btn').addEventListener('click', () => player.stop());


// ── Check format support ──────────────────────────────────────────────────────

if (!OpenAudio.canPlay('audio/ogg')) {
  console.warn('OGG not supported — use an MP3 source instead.');
}


// ── SPA teardown (React, Vue, etc.) ──────────────────────────────────────────

// React:
// useEffect(() => {
//   const player = new OpenAudio('audio/chime.mp3', { pauseOnHidden: true });
//   return () => player.destroy();  // removes visibilitychange listener on unmount
// }, []);

// Vue:
// onUnmounted(() => player.destroy());

*/
