/**
 * @file        OpenAudio_r.js
 * @author      Rexore
 * @version     2.6.0
 * @license     Apache-2.0
 *
 * OpenAudio_r.js — A self-contained, randomised audio scheduling engine.
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
 * Attach to any element or user action. No dependencies.
 * ============================================================================
 * QUICK START
 * ============================================================================
 *
 * 1. Include the script:
 *
 *      <script src="OpenAudio_r.js"></script>
 *
 * 2. Create an engine instance with your clips:
 *
 *      const engine = new AudioEngine([
 *        { src: 'audio/clip1.mp3', label: 'Clip One' },
 *        { src: 'audio/clip2.mp3', label: 'Clip Two' },
 *        { src: 'audio/clip3.mp3', label: 'Clip Three' }
 *      ]);
 *
 * 3. Attach to any element or action:
 *
 *      // Button
 *      document.getElementById('my-btn').addEventListener('click', () => engine.start());
 *
 *      // First click anywhere
 *      document.addEventListener('click', () => engine.start(), { once: true });
 *
 *      // Keydown
 *      document.addEventListener('keydown', () => engine.start(), { once: true });
 *
 *      // Custom app hook
 *      function onGameStart() { engine.start(); }
 *
 * ============================================================================
 * BROWSER AUTOPLAY POLICY
 * ============================================================================
 *
 * Browsers block audio.play() until the user performs a genuine gesture
 * (click, keydown, touchstart). Scroll does NOT qualify in Chrome or Firefox.
 *
 * Rule: call engine.start() synchronously inside a user-initiated event
 * handler on first call. After the first successful play(), all subsequent
 * clips schedule themselves via setTimeout — no further interaction needed.
 *
 * start() unlocks the shared Audio element by playing a silent 1-second
 * base64 MP3 synchronously within the gesture context. The first real clip
 * then plays after a random delay in [lowTime, maxTime], just like all
 * subsequent clips. This allows the engine to respect the initial delay
 * setting without sacrificing mobile autoplay compatibility.
 *
 * ============================================================================
 * BACKGROUND TAB THROTTLING
 * ============================================================================
 *
 * Browsers aggressively throttle setTimeout when a tab loses focus. Chrome
 * and Firefox typically cap background timers to fire no more than once per
 * second; some power-saving modes on mobile may suspend them entirely.
 *
 * Impact on this engine: the inter-clip delays configured via lowTime and
 * maxTime will stretch when the tab is hidden. Audio playback itself is not
 * affected — a clip that has already started will continue at normal speed —
 * but the gap before the *next* clip begins will be longer than configured.
 *
 * Mitigation: this engine listens to the Page Visibility API
 * (document.visibilitychange). When the tab returns to the foreground and a
 * timer is still pending, the remaining delay is recalculated against the
 * wall-clock time elapsed since the timer was set. If the throttled timer has
 * already overrun the intended delay, #playNext() fires immediately on
 * visibility restore rather than waiting for the lagging setTimeout.
 *
 * This does not provide frame-perfect scheduling. For that, see the Web Audio
 * API note below.
 *
 * ============================================================================
 * WEB AUDIO API — WHEN TO GRADUATE FROM THIS ENGINE
 * ============================================================================
 *
 * This engine is built on the HTML5 <audio> element, which is the right
 * choice for the majority of ambient / randomised scheduling use cases:
 *   • No dependencies, minimal setup, broad compatibility.
 *   • Works on mobile without AudioContext unlock boilerplate.
 *   • Per-clip src swapping handles arbitrary file formats.
 *
 * However, the HTML5 <audio> element has hard ceilings that no wrapper code
 * can fully overcome:
 *
 *   1. Scheduling is tied to setTimeout, which is subject to background
 *      throttling and the browser event loop — not a hardware clock.
 *      Sub-second precision is not reliable.
 *
 *   2. Crossfading between clips is not natively possible without a second
 *      Audio element, which reintroduces the iOS autoplay problem.
 *
 *   3. A tab suspended entirely by aggressive mobile power-saving will see
 *      gaps that the visibility recalculation above cannot recover from.
 *
 * Consider the Web Audio API (AudioContext) when:
 *   • You need crossfading or seamless looping between clips.
 *   • Timing requirements are sub-second and must be precise.
 *   • Background-tab immunity is critical (AudioContext.currentTime runs
 *     against the audio hardware clock, unaffected by tab visibility).
 *   • You need runtime DSP effects (reverb, EQ, compression).
 *
 * The Web Audio API requires AudioContext.resume() inside a user gesture and
 * more complex buffer management. It is a significant architectural change,
 * not a drop-in upgrade from this engine.
 *
 * ============================================================================
 * SHUFFLE BAG ALGORITHM
 * ============================================================================
 *
 * Clips are drawn from an unplayed pool rather than selected from the full
 * array each time. This guarantees every clip plays exactly once per cycle
 * before any clip repeats — solving the birthday problem that naive
 * Math.random() selection causes with small collections.
 *
 * Each clip carries a `played` boolean. On each selection:
 *   1. Filter clips to the unplayed pool.
 *   2. If pool is empty, reset all played flags (lazy cycle reset).
 *   3. Pick uniformly at random from the pool.
 *   4. Mark the selected clip played = true immediately.
 *   5. Play it. On 'ended', schedule the next clip after a random interval.
 *
 * The reset is lazy — it happens at selection time, not at the end of the
 * last clip. This means there is no gap between cycles and the engine keeps
 * running seamlessly.
 *
 * ============================================================================
 * CHANGELOG
 * ============================================================================
 *
 * 2.6.0
 *   - All constructor and addClip() validation throws changed from Error to
 *     TypeError. This matches the ECMAScript convention (and the behaviour of
 *     OpenAudio.js and OpenAudio_s.js) that type-mismatch errors should be
 *     TypeError so callers can distinguish them via instanceof.
 *   - #isStarted is now set true inside the unlock .then() (after the Audio
 *     element is confirmed usable), not at the top of start() before the
 *     unlock. The duplicate-start guard during the unlock window is handled
 *     by #isUnlocking, which is set immediately. This aligns the state machine
 *     semantics with OpenAudio_s.js (D3).
 *   - Expanded three compact single-line try/catch blocks in the onended
 *     handler, #resetCycle(), and #playNext() .then() to multi-line style,
 *     matching the formatting convention used in OpenAudio.js and
 *     OpenAudio_s.js (S2).
 *
 * 2.5.0
 *   - isStarted and isPlaying are now private fields (#isStarted, #isPlaying)
 *     exposed via read-only getters. Previously they were plain public
 *     properties, allowing callers to silently corrupt the state machine.
 *     All internal guards updated to use #isStarted / #isPlaying.
 *   - #isDestroyed flag: all public methods (start, stop, reset, setVolume,
 *     addClip, destroy) now return immediately after destroy() has been
 *     called, making post-destroy calls safe no-ops. Previously destroy()
 *     documented post-destroy behaviour as "undefined"; in practice, calling
 *     start() after destroy() would silently re-run the engine without a
 *     visibility listener, causing partially torn-down state.
 *   - destroy() now releases the Audio element via removeAttribute('src') +
 *     load() per the WHATWG HTMLMediaElement resource-release spec, then nulls
 *     #audio. Previously the element was kept live with its src intact.
 *   - #isPlaying is now set true synchronously before #audio.play() in
 *     #playNext(), closing the race window where isPlaying reported false
 *     while audio was starting. Reverted to false in .catch() on failure.
 *
 * 2.4.1
 *   - Licence changed from GPL-3.0-or-later to Apache-2.0 across the suite.
 *
 * 2.4.0
 *   - #isUnlocking flag: start() now sets a private boolean during the silent
 *     MP3 unlock phase. Rapid repeated calls to start() before the unlock
 *     promise resolves are ignored, preventing multiple overlapping unlock
 *     attempts from racing each other.
 *   - destroy() method: removes the visibilitychange listener added in the
 *     constructor using a stored bound handler reference (#boundVisibility).
 *   - AudioEngine.canPlay(type) static method: wraps HTMLAudioElement
 *     .canPlayType() with a clean boolean return.
 *   - onCycleReset callback wrapped in try/catch.
 *   - Documentation: added HTML5 AUDIO vs. WEB AUDIO API comparison table and
 *     CALLBACK RESILIENCE section.
 *
 * 2.3.0
 *   - Clip src validation in constructor and addClip().
 *   - Next-clip prefetch: #scheduleNext() sets #audio.src to the next selected
 *     clip during the inter-clip gap, eliminating network fetch delay.
 *   - Background tab throttling mitigation via wall-clock correction.
 *
 * 2.2.0
 *   - True private fields (#) replace pseudo-private (_) properties.
 *   - NotAllowedError handling: engine halts rather than silent-loops.
 *   - Silent base64 unlock in start().
 *   - setVolume(value) public method.
 *
 * 2.1.1
 *   - Constructor validates lowTime and maxTime.
 *   - #scheduleNext() clears existing timer before setting new one.
 *   - Cycle-boundary repeat fix.
 *   - stop() no longer resets currentTime.
 *
 * 2.1.0
 *   - Single reusable Audio element created once in constructor.
 *   - #scheduleNext() extracted as a named method.
 *   - AbortError handling in #playNext().
 *   - onerror listener attached once in constructor.
 *
 * 2.0.0
 *   - Initial public release. Shuffle bag algorithm. onPlay / onEnd /
 *     onCycleReset callbacks. addClip() runtime insertion.
 *
 * ============================================================================
 * HTML5 AUDIO vs. WEB AUDIO API — QUICK REFERENCE
 * ============================================================================
 *
 * Feature                  HTML5 Audio (this engine)   Web Audio API (AudioContext)
 * ─────────────────────────────────────────────────────────────────────────────
 * Scheduling precision     Event-loop (~10–50ms jitter) Hardware clock (sample-accurate)
 * Crossfading              Not possible (1 element)     Native / straightforward
 * Background tab           setTimeout throttled         Unaffected (hardware clock)
 * Setup complexity         Very low — drop-in           High (buffer management)
 * Mobile autoplay          Solved via element blessing  Requires AudioContext.resume()
 * Runtime DSP effects      None                         Reverb, EQ, compression, etc.
 *
 * See the WEB AUDIO API section above for migration guidance.
 *
 * ============================================================================
 * CALLBACK RESILIENCE
 * ============================================================================
 *
 * onPlay, onEnd, and onCycleReset are all wrapped in try/catch. A throwing
 * user callback will log a console warning but will never stall the engine's
 * internal scheduling loop. This means a bug in your UI update code (e.g. a
 * reference error in onPlay) will not silence the engine — it will keep
 * running and log a warning so the error is still visible and fixable.
 *
 * ============================================================================
 * CONFIGURATION OPTIONS
 * ============================================================================
 *
 *   lowTime      {number}    Min seconds between clips        default: 1
 *   maxTime      {number}    Max seconds between clips        default: 10
 *   volume       {number}    Playback volume 0.0–1.0          default: 0.85
 *   onPlay       {Function}  Called when a clip starts        default: null
 *   onEnd        {Function}  Called when a clip ends          default: null
 *   onCycleReset {Function}  Called when all clips have played and cycle resets
 *
 * ============================================================================
 * PUBLIC API
 * ============================================================================
 *
 *   engine.start()             Start the engine. Must be inside a gesture handler.
 *                              Safe to call multiple times — ignored if running.
 *                              Ignores rapid repeat calls during the unlock phase
 *                              via an internal #isUnlocking flag.
 *                              No-op after destroy().
 *
 *   engine.stop()              Stop engine. Cancels timer, pauses audio.
 *                              Preserves cycle state — start() resumes it.
 *                              No-op after destroy().
 *
 *   engine.reset()             Stop and clear all played flags.
 *                              Next start() begins a fresh random cycle.
 *                              No-op after destroy().
 *
 *   engine.destroy()           Stop the engine, release the Audio element, and
 *                              remove all document-level event listeners. Call
 *                              when tearing down in SPAs. All subsequent method
 *                              calls are safe no-ops.
 *
 *   engine.addClip(clip)       Add a clip at runtime. Enters the pool immediately.
 *                              Throws if clip.src is missing or not a string.
 *                              No-op after destroy().
 *
 *   engine.setVolume(value)    Set volume (0.0–1.0) immediately, affects live
 *                              playback. No-op after destroy().
 *
 *   engine.isStarted           {boolean}  Read-only. True after first start() call.
 *   engine.isPlaying           {boolean}  Read-only. True while a clip is playing.
 *
 * ── STATIC UTILITY ──────────────────────────────────────────────────────────
 *
 *   AudioEngine.canPlay(type)  Returns true if the browser can likely play the
 *                              given MIME type (e.g. 'audio/ogg', 'audio/wav').
 *                              Wraps HTMLAudioElement.canPlayType() — returns
 *                              false for an empty string or 'no' response.
 *                              Use this before constructing an engine with
 *                              non-MP3 sources to check format support.
 *
 * ============================================================================
 */

// Silent 1-second MP3 encoded as base64.
// Used by start() to unlock the shared Audio element within the gesture
// context before the first real clip is scheduled via setTimeout.
const SILENT_MP3 =
  'data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsgU291bmQgRWZmZWN0cyBMaWJyYXJ5Ly8v' +
  'VFNTTQAAAAALAAADAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAA' +
  'AP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP//' +
  '//8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8A' +
  'AAAAAAAAAP////8=';

class AudioEngine {

  // ── True private fields ────────────────────────────────────────────────────
  // Declared here; JavaScript enforces access at the class boundary.
  // Attempting to read or write these from outside throws a SyntaxError.
  #clips;
  #lowTime;
  #maxTime;
  #volume;
  #onPlay;
  #onEnd;
  #onCycleReset;
  #timer;
  #timerSetAt;      // wall-clock ms at which the current inter-clip delay was set
  #timerDelay;      // intended delay duration in ms (for visibility recalculation)
  #audio;
  #currentClip;
  #nextClip;        // pre-selected clip loaded into #audio during the inter-clip gap
  #isUnlocking;     // true while the silent-MP3 unlock play() promise is pending
  #isDestroyed;     // true after destroy(); all public methods become safe no-ops
  #boundVisibility; // bound handler reference stored for removeEventListener in destroy()
  // Backing fields for the read-only isStarted / isPlaying getters.
  #isStarted;
  #isPlaying;

  /**
   * @param {Array<{ src: string, label?: string }>} clips
   *   Array of clip objects. `src` is required. `label` is optional and used
   *   in callbacks and console warnings.
   *
   * @param {Object}   [options={}]
   * @param {number}   [options.lowTime=1]
   * @param {number}   [options.maxTime=10]
   * @param {number}   [options.volume=0.85]
   * @param {Function} [options.onPlay]
   * @param {Function} [options.onEnd]
   * @param {Function} [options.onCycleReset]
   */
  constructor(clips = [], options = {}) {
    if (!Array.isArray(clips) || clips.length === 0) {
      throw new TypeError('AudioEngine: clips must be a non-empty array.');
    }

    // Validate every clip has a non-empty string src before doing anything else
    const badClip = clips.findIndex(c => !c || typeof c.src !== 'string' || c.src.trim() === '');
    if (badClip !== -1) {
      throw new TypeError(`AudioEngine: clips[${badClip}] is missing a valid src string.`);
    }

    // Defensive copy — never mutate the caller's original array
    this.#clips = clips.map(c => ({
      src:    c.src,
      label:  c.label || c.src,
      played: false
    }));

    this.#lowTime = options.lowTime ?? 1;
    this.#maxTime = options.maxTime ?? 10;
    this.#volume  = options.volume  ?? 0.85;

    if (typeof this.#lowTime !== 'number' || this.#lowTime < 0) {
      throw new TypeError('AudioEngine: lowTime must be a non-negative number.');
    }
    if (typeof this.#maxTime !== 'number' || this.#maxTime < 0) {
      throw new TypeError('AudioEngine: maxTime must be a non-negative number.');
    }
    if (this.#lowTime > this.#maxTime) {
      throw new TypeError(`AudioEngine: lowTime (${this.#lowTime}) must not exceed maxTime (${this.#maxTime}).`);
    }

    this.#onPlay       = options.onPlay       || null;
    this.#onEnd        = options.onEnd        || null;
    this.#onCycleReset = options.onCycleReset || null;

    this.#timer       = null;
    this.#timerSetAt  = null;
    this.#timerDelay  = null;
    this.#isStarted   = false;
    this.#isPlaying   = false;
    this.#isUnlocking = false;
    this.#isDestroyed = false;

    // Single reusable Audio element — created once here so that mobile browsers
    // (iOS Safari) keep it within the gesture activation context for all
    // subsequent play() calls, satisfying strict autoplay policies.
    this.#audio       = new Audio();
    this.#currentClip = null;
    this.#nextClip    = null;

    // Listeners attached once to avoid duplicates and memory leaks.
    this.#audio.onended = () => {
      if (!this.#isStarted) return;
      // Schedule next BEFORE firing callback — a throwing onEnd can never stall the engine.
      this.#scheduleNext();
      try {
        if (this.#onEnd) this.#onEnd(this.#currentClip);
      } catch (e) {
        console.warn('AudioEngine: onEnd callback error:', e);
      }
    };

    this.#audio.onerror = (e) => {
      console.warn(`AudioEngine: audio error on "${this.#currentClip?.label}":`, e);
      if (!this.#isStarted) return;
      this.#scheduleNext();
    };

    // Store the bound handler so destroy() can pass the exact same reference
    // to removeEventListener — an inline arrow would not match on removal.
    this.#boundVisibility = this.#onVisibilityChange.bind(this);

    // Background tab throttling mitigation — see #onVisibilityChange below.
    document.addEventListener('visibilitychange', this.#boundVisibility);
  }

  // ── PUBLIC API ─────────────────────────────────────────────────────────────

  /** @returns {boolean} True after first start() call. Read-only. */
  get isStarted() { return this.#isStarted; }

  /** @returns {boolean} True while a clip is actively playing. Read-only. */
  get isPlaying() { return this.#isPlaying; }

  /**
   * Start the engine.
   *
   * Call this synchronously inside a user gesture event handler on first use.
   * This satisfies the browser autoplay policy.
   *
   * A silent MP3 is played immediately to unlock the Audio element within the
   * gesture context. The first real clip is then scheduled via #scheduleNext(),
   * respecting the configured lowTime/maxTime delay — exactly like all
   * subsequent clips.
   *
   * Safe to call multiple times — silently ignored if already started or if
   * the unlock phase is still in progress (#isUnlocking), preventing a rapid
   * sequence of start() calls from triggering duplicate #scheduleNext() calls
   * before the first unlock promise resolves. No-op after destroy().
   *
   * Design note (D3): #isStarted is set true inside the unlock .then(), after
   * the Audio element is confirmed usable. This aligns with OpenAudio_s.js,
   * which also sets #isStarted after the unlock resolves (inside #playClip()).
   * The guard against duplicate start() calls during the unlock window is
   * handled by #isUnlocking, not #isStarted.
   */
  start() {
    if (this.#isDestroyed || this.#isStarted || this.#isUnlocking) return;
    this.#isUnlocking = true;

    // Play the silent clip synchronously within the gesture context.
    // This "blesses" the Audio element on strict autoplay browsers (iOS Safari)
    // without making the user hear anything. After this resolves, all
    // subsequent play() calls on the same element are permitted.
    this.#audio.src    = SILENT_MP3;
    this.#audio.volume = 0;
    this.#audio.play()
      .then(() => {
        this.#isUnlocking = false;
        if (this.#isDestroyed) return;
        // Mark started only after the element is confirmed usable.
        this.#isStarted    = true;
        // Restore volume and schedule the first real clip with a random delay.
        this.#audio.volume = Math.min(1, Math.max(0, this.#volume));
        this.#scheduleNext();
      })
      .catch(err => {
        this.#isUnlocking = false;
        if (err.name === 'NotAllowedError') {
          // Autoplay is blocked even for the silent unlock clip — the gesture
          // context was not valid. Halt cleanly rather than looping silently.
          console.warn(
            'AudioEngine: autoplay blocked during unlock. ' +
            'start() must be called synchronously inside a user gesture handler ' +
            '(click / keydown / touchstart).'
          );
          this.stop();
        }
        // AbortError or other — safe to ignore; stop() cleans up if needed.
      });
  }

  /**
   * Stop the engine.
   * Cancels any pending timer and stops the current audio.
   * Played flags are preserved — call start() again to begin the next
   * clip in the cycle (the interrupted clip is not replayed).
   * No-op after destroy().
   */
  stop() {
    if (this.#isDestroyed) return;
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.#isStarted = false;
    this.#isPlaying = false;
    this.#audio.pause();
  }

  /**
   * Stop the engine and reset all cycle state.
   * All played flags cleared — next start() begins a completely fresh cycle.
   * No-op after destroy().
   */
  reset() {
    if (this.#isDestroyed) return;
    this.stop();
    this.#clips.forEach(c => c.played = false);
  }

  /**
   * Add a clip to the engine at runtime.
   * The clip is inserted into the pool immediately with played = false,
   * making it available for selection in the current or next cycle.
   * No-op after destroy().
   *
   * @param {{ src: string, label?: string }} clip
   */
  addClip(clip) {
    if (this.#isDestroyed) return;
    if (!clip || typeof clip.src !== 'string' || clip.src.trim() === '') {
      throw new TypeError('AudioEngine.addClip: clip must have a non-empty string src property.');
    }
    this.#clips.push({
      src:    clip.src,
      label:  clip.label || clip.src,
      played: false
    });
  }

  /**
   * Set the playback volume immediately.
   * Applies to the currently playing clip as well as all future clips.
   * No-op after destroy().
   *
   * @param {number} value  Volume level from 0.0 (silent) to 1.0 (full).
   *                        Values outside this range are clamped.
   */
  setVolume(value) {
    if (this.#isDestroyed) return;
    this.#volume = Math.min(1, Math.max(0, value));
    this.#audio.volume = this.#volume;
  }

  /**
   * Destroy the engine instance.
   *
   * Stops the engine, releases the Audio element per the WHATWG
   * HTMLMediaElement resource-release spec (removeAttribute('src') + load()),
   * and removes the visibilitychange event listener from document using the
   * stored bound handler reference. Always call this when tearing down an
   * AudioEngine in a Single Page Application (React, Vue, Angular, etc.) to
   * prevent stale listeners accumulating on the document object across
   * component mounts and unmounts.
   *
   * All subsequent method calls after destroy() are safe no-ops.
   */
  destroy() {
    if (this.#isDestroyed) return;
    this.#isDestroyed = true;
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.#isStarted = false;
    this.#isPlaying = false;
    this.#audio.pause();
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
   * Wraps HTMLAudioElement.canPlayType() with a clean boolean return.
   *
   * canPlayType() returns 'probably', 'maybe', or '' (unsupported).
   * This method returns true for 'probably' or 'maybe', and false for ''.
   * Note: 'maybe' means the browser recognises the format but cannot
   * guarantee support without attempting to load a real file.
   *
   * Use this before constructing an engine with non-MP3 sources:
   *
   *   if (!AudioEngine.canPlay('audio/ogg')) {
   *     console.warn('OGG not supported — falling back to MP3 sources');
   *   }
   *
   * @param  {string}  type  MIME type string, e.g. 'audio/ogg', 'audio/wav'
   * @returns {boolean}
   */
  static canPlay(type) {
    if (typeof type !== 'string' || type.trim() === '') return false;
    const probe = new Audio();
    return probe.canPlayType(type) !== '';
  }

  // ── PRIVATE ────────────────────────────────────────────────────────────────

  /**
   * Returns all clips not yet played in the current cycle.
   * @returns {Array}
   */
  #getUnplayed() {
    return this.#clips.filter(c => !c.played);
  }

  /**
   * Resets all clips to unplayed, beginning a new cycle.
   * Called lazily at selection time when the unplayed pool is empty.
   */
  #resetCycle() {
    this.#clips.forEach(c => c.played = false);
    try {
      if (this.#onCycleReset) this.#onCycleReset();
    } catch (e) {
      console.warn('AudioEngine: onCycleReset callback error:', e);
    }
  }

  /**
   * Handles visibilitychange events to mitigate background tab throttling.
   *
   * When the tab returns to the foreground, checks whether the pending inter-
   * clip timer has already overrun its intended delay (common when browsers
   * cap background setTimeout to ~1Hz). If the delay has been met or exceeded,
   * #playNext() fires immediately. Otherwise, a precise reschedule is set for
   * the remaining duration.
   *
   * Stored as a bound reference in #boundVisibility so that destroy() can
   * remove this exact listener from document.
   */
  #onVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    if (!this.#isStarted || !this.#timer || this.#timerSetAt === null) return;

    const elapsed = Date.now() - this.#timerSetAt;
    if (elapsed >= this.#timerDelay) {
      // Timer should already have fired — play immediately.
      clearTimeout(this.#timer);
      this.#timer      = null;
      this.#timerSetAt = null;
      this.#timerDelay = null;
      this.#playNext();
    } else {
      // Reschedule precisely for the remaining duration.
      const remaining = this.#timerDelay - elapsed;
      clearTimeout(this.#timer);
      this.#timerSetAt = Date.now();
      this.#timerDelay = remaining;
      this.#timer = setTimeout(() => this.#playNext(), remaining);
    }
  }

  /**
   * Schedules the next clip after a random inter-clip delay in [lowTime, maxTime].
   *
   * Pre-selects and pre-fetches the clip during the gap so the browser starts
   * buffering the file immediately after the current clip ends, rather than
   * waiting for the timer to fire. This eliminates network fetch latency that
   * would otherwise be noticeable on slow connections or large files.
   *
   * #timerSetAt and #timerDelay are recorded so the visibilitychange listener
   * can recalculate remaining time accurately after background tab throttling.
   */
  #scheduleNext() {
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.#isPlaying = false;

    // Pre-select the next clip now, during the gap, so shuffle-bag state
    // stays consistent regardless of how long the delay runs.
    this.#nextClip = this.#selectNext();

    // Begin buffering the next clip immediately while we wait.
    // Volume is set to 0 so any brief decode artefact is inaudible.
    if (this.#nextClip) {
      this.#audio.src    = this.#nextClip.src;
      this.#audio.volume = 0;
      this.#audio.load();
    }

    const delay = (this.#lowTime + Math.random() * (this.#maxTime - this.#lowTime)) * 1000;
    this.#timerSetAt = Date.now();
    this.#timerDelay = delay;
    this.#timer = setTimeout(() => {
      this.#timerSetAt = null;
      this.#timerDelay = null;
      this.#playNext();
    }, delay);
  }

  /**
   * Selects and marks the next clip from the shuffle bag, handling lazy cycle
   * reset and cycle-boundary repeat prevention.
   *
   * Extracted from #playNext() so that #scheduleNext() can pre-select during
   * the inter-clip gap for prefetching purposes.
   *
   * @returns {{ src: string, label: string, played: boolean }}
   */
  #selectNext() {
    let pool = this.#getUnplayed();

    if (pool.length === 0) {
      this.#resetCycle();
      pool = this.#clips.length > 1 && this.#currentClip
        ? this.#clips.filter(c => c !== this.#currentClip)
        : this.#clips.slice();
    }

    const clip = pool[Math.floor(Math.random() * pool.length)];
    clip.played = true;
    return clip;
  }

  /**
   * Core engine step: play the pre-selected and pre-fetched clip, then
   * schedule the next one.
   *
   * #nextClip is set by #scheduleNext() during the inter-clip gap. By the
   * time this method fires, the browser has had the full delay period to
   * buffer the file, eliminating the fetch latency that would occur if src
   * were assigned here instead.
   *
   * #isPlaying is set true synchronously before #audio.play() to close the
   * race window where isPlaying reported false while audio was starting.
   * Reverted in .catch() on real failure.
   */
  #playNext() {
    if (!this.#isStarted) return;

    // Consume the pre-selected clip. If somehow null (e.g. called directly
    // before #scheduleNext has run), fall back to selecting now.
    const clip = this.#nextClip ?? this.#selectNext();
    this.#nextClip    = null;
    this.#currentClip = clip;

    // Restore volume — was zeroed during prefetch to suppress decode artefacts.
    this.#audio.volume = Math.min(1, Math.max(0, this.#volume));
    this.#audio.loop   = false;

    // src is already set and buffering from #scheduleNext; just play.
    // If #nextClip was null and we selected now, set src before playing.
    if (this.#audio.src !== clip.src) {
      this.#audio.src = clip.src;
    }

    // Set before the async boundary to close the isPlaying race window.
    this.#isPlaying = true;

    this.#audio.play()
      .then(() => {
        if (!this.#isStarted || this.#isDestroyed) {
          this.#audio?.pause();
          this.#isPlaying = false;
          return;
        }
        try {
          if (this.#onPlay) this.#onPlay(clip);
        } catch (e) {
          console.warn('AudioEngine: onPlay callback error:', e);
        }
      })
      .catch(err => {
        this.#isPlaying = false;   // revert the optimistic flag on failure
        if (err.name === 'AbortError' || !this.#isStarted) return;

        if (err.name === 'NotAllowedError') {
          console.warn(
            `AudioEngine: play() blocked by autoplay policy for "${clip.label}". ` +
            `Halting engine. Call start() again inside a user gesture to resume.`
          );
          this.stop();
        } else {
          console.warn(`AudioEngine: play() failed for "${clip.label}".\nError: ${err}`);
          this.#scheduleNext();
        }
      });
  }
}


// ── USAGE EXAMPLES ────────────────────────────────────────────────────────────

/*

// ── Minimal setup ─────────────────────────────────────────────────────────────

const engine = new AudioEngine([
  { src: 'audio/clip1.mp3', label: 'Clip One'   },
  { src: 'audio/clip2.mp3', label: 'Clip Two'   },
  { src: 'audio/clip3.mp3', label: 'Clip Three' }
]);

document.getElementById('start-btn').addEventListener('click', () => engine.start());


// ── With full options ─────────────────────────────────────────────────────────

const engine = new AudioEngine(clips, {
  lowTime:      1,
  maxTime:      10,
  volume:       0.85,
  onPlay:       clip => console.log('Now playing:', clip.label),
  onEnd:        clip => console.log('Finished:',   clip.label),
  onCycleReset: ()   => console.log('Cycle reset — all clips played'),
});


// ── Attach to any element ─────────────────────────────────────────────────────

// Any button
document.getElementById('my-btn').addEventListener('click', () => engine.start());

// First click anywhere on the page
document.addEventListener('click', () => engine.start(), { once: true });

// First keydown
document.addEventListener('keydown', () => engine.start(), { once: true });

// First touchstart (mobile)
document.addEventListener('touchstart', () => engine.start(), { once: true });

// Custom app event
function onGameStart() { engine.start(); }
function onLevelLoad()  { engine.start(); }
function onModalOpen()  { engine.start(); }


// ── Stop and resume ───────────────────────────────────────────────────────────

engine.stop();   // pauses, preserves cycle position
engine.start();  // resumes — must still be inside a gesture handler


// ── Hard reset ────────────────────────────────────────────────────────────────

engine.reset();  // stops and clears all played flags
engine.start();  // starts a completely fresh random cycle


// ── Volume control ────────────────────────────────────────────────────────────

engine.setVolume(0.5);  // immediately updates live playback and future clips
engine.setVolume(0.0);  // effectively mutes without stopping the engine
engine.setVolume(1.0);  // full volume


// ── Add clips at runtime ──────────────────────────────────────────────────────

engine.addClip({ src: 'audio/bonus.mp3', label: 'Bonus Clip' });


// ── Embedded base64 (no external files needed) ───────────────────────────────

const engine = new AudioEngine([
  { src: 'data:audio/mp3;base64,SUQzBA...', label: 'Embedded Clip' }
]);


// ── Check format support before constructing ──────────────────────────────────

if (!AudioEngine.canPlay('audio/ogg')) {
  console.warn('OGG not supported — use MP3 sources instead');
}


// ── SPA teardown (React, Vue, etc.) ──────────────────────────────────────────

// React example:
// useEffect(() => {
//   const engine = new AudioEngine(clips);
//   return () => engine.destroy(); // removes listener, releases audio on unmount
// }, []);

// Vue example:
// onUnmounted(() => engine.destroy());


// ── Check engine state ────────────────────────────────────────────────────────

console.log(engine.isStarted); // true after first start() call
console.log(engine.isPlaying); // true while a clip is actively playing

*/
