/**
 * @file        OpenAudio_s.js
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
 * Sequential audio player: plays clips one at a time, advances on demand.
 * Perfect for interactive narratives, tutorials, quizzes, and guided tours.
 *
 * Key differences from OpenAudio_r.js:
 *   - Plays clips in fixed sequence (no randomization)
 *   - User controls when next clip plays (manual or auto-advance)
 *   - Tracks current clip index and progress
 *   - Can loop the entire sequence
 *
 * Inherited from parent architecture:
 *   - Silent MP3 unlock on the shared Audio element: satisfies autoplay policy
 *   - #isUnlocking guard: prevents duplicate unlock attempts
 *   - Callbacks: onPlay, onEnd, onComplete — all wrapped in try/catch
 *   - destroy(): removes listeners and clears timers; safe for SPA teardown
 *   - canPlay() static: check browser format support before constructing
 *
 * ============================================================================
 * QUICK START
 * ============================================================================
 *
 *   const player = new SequentialAudio([
 *     { src: 'intro.mp3',    label: 'Introduction' },
 *     { src: 'chapter1.mp3', label: 'Chapter 1'    },
 *     { src: 'chapter2.mp3', label: 'Chapter 2'    }
 *   ], {
 *     autoAdvance: false,
 *     onPlay:      (clip) => console.log(`Playing: ${clip.label}`),
 *     onEnd:       (clip) => console.log(`Finished: ${clip.label}`),
 *     onComplete:  ()     => console.log('Sequence complete!')
 *   });
 *
 *   // First play — must be inside a user gesture
 *   document.getElementById('play-btn').addEventListener('click', () => player.play());
 *
 *   // Advance to next clip
 *   document.getElementById('next-btn').addEventListener('click', () => player.next());
 *
 * ============================================================================
 * BROWSER AUTOPLAY POLICY
 * ============================================================================
 *
 * First call to play() must be inside a user gesture (click, keydown, etc.).
 * The shared Audio element is unlocked by playing a silent base64 MP3
 * synchronously within the gesture context. All subsequent play() calls on
 * the same element (including next(), goto(), resume()) are permitted without
 * further user interaction.
 *
 * ============================================================================
 * CHANGELOG
 * ============================================================================
 *
 * 1.3.0
 *   - #playCancelled flag: stop() and reset() now plant a cancellation token
 *     that the in-flight silent-MP3 unlock .then() checks before calling
 *     #playClip(). Previously, calling reset() (or stop()) during the ~50–200ms
 *     unlock window was ignored: .then() would fire unconditionally and start
 *     the first clip regardless. The fix mirrors the pattern introduced in
 *     OpenAudio.js 1.3.0.
 *   - play() doc comment updated to explain that #isStarted becomes true inside
 *     #playClip() (after the unlock), not before. This is a deliberate design
 *     choice that differs from OpenAudio_r.js, which sets #isStarted before the
 *     unlock. Both approaches are valid; the difference is documented so readers
 *     of both files are not surprised.
 *   - Usage example: goto(prev) now uses Math.max(0, index - 1) guard,
 *     matching the published API docs and avoiding a spurious out-of-range
 *     console.warn when the user is already on the first clip.
 *
 * 1.2.0
 *   - isPlaying and isStarted are now private fields (#isPlaying, #isStarted)
 *     exposed via read-only getters. Previously they were plain public
 *     properties, allowing callers to silently corrupt the state machine.
 *   - #isPlaying and #isStarted are now set true synchronously before the
 *     #audio.play() call in #playClip(), closing the double-play race window
 *     where rapid next()/goto() calls could bypass guards and abort a clip
 *     mid-start. #isPlaying is reverted in .catch() on real failures.
 *   - #advanceTimer: the auto-advance setTimeout handle is now stored and
 *     cleared by stop(), reset(), and destroy(). Previously stop() or reset()
 *     called during the advance delay would not cancel the pending next(),
 *     causing the next clip to start after an explicit stop.
 *   - resume(): #isPlaying now set synchronously before #audio.play(), then
 *     reverted in .catch(). Previously the .then() could overwrite a
 *     concurrent stop()'s isPlaying = false.
 *   - destroy() now uses removeAttribute('src') + load() per the WHATWG
 *     HTMLMediaElement resource-release spec, replacing src = ''.
 *   - getCurrentClip() now returns a shallow copy ({ ...clip }) instead of a
 *     live reference. getClips() now deep-copies inner objects. Prevents
 *     callers from mutating the internal playlist.
 *   - Removed unreachable this.#audio?.pause() from #playClip() .then().
 *
 * 1.1.0
 *   - Unlock now plays the silent MP3 on the shared #audio element rather than
 *     creating a throwaway new Audio(). Previously the throwaway element was
 *     blessed but #audio was not, causing NotAllowedError on iOS Safari for
 *     every clip after the first.
 *   - play() guard extended: now checks isStarted as well as isPlaying and
 *     #isUnlocking. Previously calling play() after a clip ended (isPlaying
 *     false) triggered a redundant second unlock attempt mid-sequence.
 *   - next() now guards against being called before play() has ever been
 *     invoked. Calling next() on an uninitialised player previously bypassed
 *     the unlock and threw NotAllowedError on first use.
 *   - pause() and resume() now guard on isStarted to prevent silent state
 *     corruption before the sequence begins.
 *   - destroy() now removes the 'ended' event listener before nulling #audio,
 *     preventing a potential callback-into-null race on teardown.
 *   - advanceDelay option (default 500ms): replaces the hardcoded 500ms gap
 *     between auto-advance clips. Configurable at construction time.
 *   - #isDestroyed flag: all public methods check this and return immediately
 *     after destroy() has been called, making post-destroy calls safe rather
 *     than throwing on the nulled #audio element.
 *
 * 1.0.0
 *   - Initial release.
 *   - Sequential playback with manual or auto-advance.
 *   - goto() / gotoLabel() navigation.
 *   - pause() / resume() / stop() / reset() transport controls.
 *   - loop option for continuous cycling.
 *   - onPlay / onEnd / onComplete callbacks.
 *
 * ============================================================================
 * CONFIGURATION OPTIONS
 * ============================================================================
 *
 *   autoAdvance  {boolean}   Auto-play next clip when current ends  default: false
 *   advanceDelay {number}    Seconds to wait before auto-advance    default: 0.5
 *   loop         {boolean}   Loop sequence when complete            default: false
 *   volume       {number}    Playback volume 0.0–1.0                default: 1.0
 *   onPlay       {Function}  Called when a clip starts              default: null
 *   onEnd        {Function}  Called when a clip ends                default: null
 *   onComplete   {Function}  Called when sequence finishes (no loop) default: null
 *
 * ============================================================================
 * PUBLIC API
 * ============================================================================
 *
 *   player.play()              Start the sequence. Must be inside a gesture handler
 *                              on first call. Safe to call if already playing —
 *                              ignored once the sequence has started.
 *
 *   player.next()              Advance to the next clip and play it.
 *                              Calls onComplete (or loops) at end of sequence.
 *                              No-op if sequence has not been started via play().
 *
 *   player.goto(index)         Jump to clip by zero-based index and play it.
 *   player.gotoLabel(label)    Jump to clip by label (exact match) and play it.
 *
 *   player.pause()             Pause at current position.
 *   player.resume()            Resume from paused position.
 *   player.stop()              Pause, rewind current clip, and cancel any pending
 *                              auto-advance timer.
 *   player.reset()             Stop and return sequence to clip 0.
 *
 *   player.destroy()           Stop, clear timers, remove event listeners, release
 *                              Audio element. Call on SPA component unmount.
 *
 *   player.getCurrentClip()    Returns a copy of the current clip { src, label }.
 *   player.getCurrentIndex()   Returns current clip index (number).
 *   player.getClipCount()      Returns total number of clips (number).
 *   player.getClips()          Returns a deep copy of the clips array.
 *
 *   player.isPlaying           {boolean}  Read-only. True while a clip is playing.
 *   player.isStarted           {boolean}  Read-only. True after first play().
 *
 * ── STATIC UTILITY ──────────────────────────────────────────────────────────
 *
 *   SequentialAudio.canPlay(type)  Returns true if the browser can likely play
 *                                  the given MIME type. Wraps canPlayType().
 *
 * ============================================================================
 */

// Silent 1-second MP3 — used to unlock the shared Audio element within the
// gesture context before the first real clip is played.
const _SEQUENTIAL_SILENT_MP3 =
  'data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsgU291bmQgRWZmZWN0cyBMaWJyYXJ5Ly8v' +
  'VFNTTQAAAAALAAADAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAA' +
  'AP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP//' +
  '//8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8AAAAAAAAAAP////8A' +
  'AAAAAAAAAP////8=';

class SequentialAudio {

  // ── Private fields ──────────────────────────────────────────────────────────
  #clips;
  #currentIndex;
  #audio;
  #endedHandler;    // stored reference for removeEventListener in destroy()
  #isUnlocking;
  #isDestroyed;
  #autoAdvance;
  #advanceDelay;
  // Stored handle for the auto-advance setTimeout — cleared by stop(),
  // reset(), and destroy() to prevent phantom next() calls after an explicit
  // stop during the advance delay window.
  #advanceTimer;
  #loop;
  #volume;
  #onPlay;
  #onEnd;
  #onComplete;
  // Backing fields for the read-only isPlaying / isStarted getters.
  #isPlaying;
  #isStarted;
  // Written by stop()/reset() and read by the async unlock .then() to prevent
  // #playClip() from running after an explicit stop during the unlock window.
  // Mirrors the pattern used in OpenAudio.js (#playCancelled).
  #playCancelled = false;

  /**
   * @param {Array<{ src: string, label?: string }>} clips
   * @param {Object}   [options={}]
   * @param {boolean}  [options.autoAdvance=false]
   * @param {number}   [options.advanceDelay=0.5]   Seconds before auto-advance fires.
   * @param {boolean}  [options.loop=false]
   * @param {number}   [options.volume=1.0]
   * @param {Function} [options.onPlay]
   * @param {Function} [options.onEnd]
   * @param {Function} [options.onComplete]
   */
  constructor(clips, options = {}) {
    if (!Array.isArray(clips) || clips.length === 0) {
      throw new TypeError('SequentialAudio: clips must be a non-empty array.');
    }
    const badClip = clips.findIndex(c => !c || typeof c.src !== 'string' || !c.src.trim());
    if (badClip !== -1) {
      throw new TypeError(`SequentialAudio: clips[${badClip}].src must be a non-empty string.`);
    }

    this.#clips        = clips.map(c => ({ src: c.src, label: c.label || c.src }));
    this.#currentIndex = 0;
    this.#isUnlocking  = false;
    this.#isDestroyed  = false;
    this.#advanceTimer = null;
    this.#isPlaying    = false;
    this.#isStarted    = false;

    this.#autoAdvance  = options.autoAdvance  ?? false;
    this.#advanceDelay = options.advanceDelay ?? 0.5;
    this.#loop         = options.loop         ?? false;
    this.#volume       = Math.min(1, Math.max(0, options.volume ?? 1.0));
    this.#onPlay       = options.onPlay       || null;
    this.#onEnd        = options.onEnd        || null;
    this.#onComplete   = options.onComplete   || null;

    // Single shared Audio element — created here so mobile browsers keep it
    // within the gesture activation context for all subsequent play() calls.
    this.#audio         = new Audio();
    this.#audio.preload = 'auto';
    this.#audio.volume  = this.#volume;

    // Store the handler reference so destroy() can remove it cleanly.
    this.#endedHandler = () => {
      if (this.#isDestroyed) return;
      this.#isPlaying = false;
      const clip = this.#clips[this.#currentIndex];
      try { if (this.#onEnd) this.#onEnd({ ...clip }); } catch (e) {
        console.warn(`SequentialAudio: onEnd callback error (${clip.label}):`, e);
      }
      if (this.#autoAdvance) {
        // Store handle so stop()/reset()/destroy() can cancel before it fires.
        this.#advanceTimer = setTimeout(() => {
          this.#advanceTimer = null;
          if (!this.#isDestroyed) this.next();
        }, this.#advanceDelay * 1000);
      }
    };

    this.#audio.addEventListener('ended', this.#endedHandler);
  }

  // ── PUBLIC API ──────────────────────────────────────────────────────────────

  /** @returns {boolean} True while a clip is actively playing. Read-only. */
  get isPlaying() { return this.#isPlaying; }

  /** @returns {boolean} True after the first successful play(). Read-only. */
  get isStarted() { return this.#isStarted; }

  /**
   * Unlock the Audio element and play the current clip.
   *
   * Must be called synchronously inside a user gesture on first use.
   * Ignored if the sequence has already started (isStarted), is currently
   * playing, or the unlock is already in progress.
   *
   * Design note (D3): #isStarted becomes true inside #playClip(), which runs
   * after the unlock resolves. This differs from OpenAudio_r.js, which sets
   * #isStarted = true at the top of start() before the unlock. Both choices
   * are valid; the difference is intentional and documented here to avoid
   * confusion when reading both files side-by-side.
   */
  play() {
    if (this.#isDestroyed || this.#isStarted || this.#isPlaying || this.#isUnlocking) return;

    // Reset the cancellation token on every fresh play() invocation.
    this.#playCancelled = false;

    this.#isUnlocking = true;

    // Unlock the SHARED element — not a throwaway — so that all future
    // play() calls on #audio are permitted by the browser's autoplay policy.
    this.#audio.src    = _SEQUENTIAL_SILENT_MP3;
    this.#audio.volume = 0;
    this.#audio.play()
      .then(() => {
        this.#isUnlocking = false;
        // Honour a stop() or reset() call that arrived during the unlock.
        if (this.#isDestroyed || this.#playCancelled) return;
        this.#audio.volume = this.#volume;
        this.#playClip();
      })
      .catch(err => {
        this.#isUnlocking = false;
        if (this.#isDestroyed) return;
        if (err.name === 'NotAllowedError') {
          console.warn(
            'SequentialAudio: autoplay blocked during unlock. ' +
            'play() must be called synchronously inside a user gesture handler ' +
            '(click / keydown / touchstart).'
          );
        }
        // AbortError or other — do not attempt to play; leave state clean.
      });
  }

  /**
   * Advance to the next clip and play it.
   * No-op if the sequence has not been started via play() first.
   * At end of sequence: loops if loop:true, otherwise fires onComplete.
   */
  next() {
    if (this.#isDestroyed || !this.#isStarted) return;

    this.#currentIndex++;

    if (this.#currentIndex >= this.#clips.length) {
      if (this.#loop) {
        this.#currentIndex = 0;
        this.#playClip();
      } else {
        // Stay on the last clip index so getCurrentClip() remains valid.
        this.#currentIndex = this.#clips.length - 1;
        this.#isPlaying    = false;
        try { if (this.#onComplete) this.#onComplete(); } catch (e) {
          console.warn('SequentialAudio: onComplete callback error:', e);
        }
      }
      return;
    }

    this.#playClip();
  }

  /**
   * Jump to a clip by zero-based index and play it.
   * @param {number} index
   */
  goto(index) {
    if (this.#isDestroyed || !this.#isStarted) return;
    if (index < 0 || index >= this.#clips.length) {
      console.warn(`SequentialAudio: goto() index ${index} out of range [0, ${this.#clips.length - 1}].`);
      return;
    }
    this.#currentIndex = index;
    this.#playClip();
  }

  /**
   * Jump to a clip by label (exact match) and play it.
   * @param {string} label
   */
  gotoLabel(label) {
    if (this.#isDestroyed || !this.#isStarted) return;
    const index = this.#clips.findIndex(c => c.label === label);
    if (index === -1) {
      console.warn(`SequentialAudio: no clip with label "${label}".`);
      return;
    }
    this.goto(index);
  }

  /**
   * Pause at current playback position.
   */
  pause() {
    if (this.#isDestroyed || !this.#isStarted) return;
    this.#audio.pause();
    this.#isPlaying = false;
  }

  /**
   * Resume from paused position. No-op if not paused.
   *
   * #isPlaying is set true synchronously before the Promise, then reverted in
   * .catch() if play() fails — closes the race where a concurrent stop() call
   * in the .then() window would leave isPlaying incorrectly true.
   */
  resume() {
    if (this.#isDestroyed || !this.#isStarted || !this.#audio.paused) return;
    // Set before the async boundary; revert in .catch() on failure.
    this.#isPlaying = true;
    this.#audio.play()
      .catch(err => {
        this.#isPlaying = false;
        if (err.name !== 'AbortError') {
          console.warn('SequentialAudio: resume() failed:', err);
        }
      });
  }

  /**
   * Pause and rewind current clip to its start.
   * Also cancels any pending auto-advance timer so the next clip does not
   * start after stop() returns. Sets #playCancelled so that any in-flight
   * silent-MP3 unlock will not proceed to #playClip() when it resolves.
   */
  stop() {
    if (this.#isDestroyed) return;
    // Signal the async unlock not to proceed if it is still in flight.
    this.#playCancelled = true;
    // Cancel any pending auto-advance before pausing.
    if (this.#advanceTimer !== null) {
      clearTimeout(this.#advanceTimer);
      this.#advanceTimer = null;
    }
    this.#audio.pause();
    this.#audio.currentTime = 0;
    this.#isPlaying         = false;
  }

  /**
   * Stop and reset sequence to clip 0.
   * isStarted is cleared — next play() will re-run the unlock.
   * Also cancels any pending auto-advance timer.
   */
  reset() {
    if (this.#isDestroyed) return;
    this.stop();                    // stop() clears #advanceTimer
    this.#currentIndex = 0;
    this.#isStarted    = false;
  }

  /**
   * Release the Audio element and remove all event listeners.
   * Cancels any pending auto-advance timer.
   * Call this on SPA component unmount to prevent memory leaks.
   * All method calls after destroy() are safe no-ops.
   */
  destroy() {
    if (this.#isDestroyed) return;
    this.#isDestroyed = true;
    // Cancel any pending auto-advance before teardown.
    if (this.#advanceTimer !== null) {
      clearTimeout(this.#advanceTimer);
      this.#advanceTimer = null;
    }
    this.#audio.pause();
    this.#audio.removeEventListener('ended', this.#endedHandler);
    // WHATWG-specified resource-release sequence: removeAttribute('src') +
    // load() aborts any in-progress network fetch and resets the media element
    // state machine cleanly, avoiding the spurious 'error' events that
    // src = '' can fire on some browsers.
    this.#audio.removeAttribute('src');
    this.#audio.load();
    this.#audio = null;
  }

  /**
   * Returns a copy of the current clip object { src, label }.
   * A copy is returned to prevent callers from mutating the internal playlist.
   * @returns {{ src: string, label: string }}
   */
  getCurrentClip() { return { ...this.#clips[this.#currentIndex] }; }

  /** @returns {number} */
  getCurrentIndex() { return this.#currentIndex; }

  /** @returns {number} */
  getClipCount() { return this.#clips.length; }

  /**
   * Returns a deep copy of the clips array.
   * Inner objects are copied to prevent callers from mutating the playlist.
   * @returns {Array<{ src: string, label: string }>}
   */
  getClips() { return this.#clips.map(c => ({ ...c })); }

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
   * Load and play the clip at #currentIndex on the shared Audio element.
   * Called only after the element has been unlocked via play().
   *
   * #isPlaying and #isStarted are set true synchronously before #audio.play()
   * to close the race window where a rapid next()/goto() call between the
   * .play() call and its .then() resolution could bypass guards and attempt
   * concurrent playback. #isPlaying is reverted in .catch() on real failures.
   */
  #playClip() {
    if (this.#isDestroyed) return;

    const clip = this.#clips[this.#currentIndex];

    this.#audio.src         = clip.src;
    this.#audio.currentTime = 0;
    this.#audio.volume      = this.#volume;

    // Set before the async boundary to close the double-play race window.
    this.#isPlaying = true;
    this.#isStarted = true;

    this.#audio.play()
      .then(() => {
        if (this.#isDestroyed) return;
        try { if (this.#onPlay) this.#onPlay({ ...clip }); } catch (e) {
          console.warn(`SequentialAudio: onPlay callback error (${clip.label}):`, e);
        }
      })
      .catch(err => {
        this.#isPlaying = false;   // revert the optimistic flag on failure
        if (err.name === 'AbortError' || this.#isDestroyed) return;
        if (err.name === 'NotAllowedError') {
          console.warn(
            `SequentialAudio: play() blocked by autoplay policy for "${clip.label}". ` +
            `Call play() again inside a user gesture to resume.`
          );
        } else {
          console.warn(`SequentialAudio: play() failed for "${clip.label}".\nError:`, err);
        }
      });
  }
}


// ── USAGE EXAMPLES ────────────────────────────────────────────────────────────

/*

// ── Minimal ───────────────────────────────────────────────────────────────────

const player = new SequentialAudio([
  { src: 'clip1.mp3', label: 'Clip 1' },
  { src: 'clip2.mp3', label: 'Clip 2' },
  { src: 'clip3.mp3', label: 'Clip 3' }
]);

document.getElementById('play-btn').addEventListener('click', () => player.play());
document.getElementById('next-btn').addEventListener('click', () => player.next());


// ── With options ──────────────────────────────────────────────────────────────

const player = new SequentialAudio(clips, {
  autoAdvance:  true,   // Auto-play next clip when current finishes
  advanceDelay: 1.0,    // 1 second gap between auto-advance clips
  loop:         true,   // Loop back to beginning when sequence ends
  volume:       0.9,
  onPlay:       (clip) => console.log(`Playing: ${clip.label}`),
  onEnd:        (clip) => console.log(`Finished: ${clip.label}`),
  onComplete:   ()     => console.log('Sequence complete!')
});


// ── Guided tour ───────────────────────────────────────────────────────────────

const tour = new SequentialAudio([
  { src: 'welcome.mp3',  label: 'Welcome'   },
  { src: 'feature1.mp3', label: 'Feature 1' },
  { src: 'feature2.mp3', label: 'Feature 2' },
  { src: 'goodbye.mp3',  label: 'Goodbye'   }
], {
  onPlay:     (clip) => showStep(clip.label),
  onComplete: ()     => showCompletionMessage()
});

document.addEventListener('click', () => tour.play(), { once: true });
document.getElementById('next-btn').addEventListener('click', () => tour.next());
document.getElementById('prev-btn').addEventListener('click', () => {
  tour.goto(Math.max(0, tour.getCurrentIndex() - 1));
});


// ── Narrated story ────────────────────────────────────────────────────────────

const story = new SequentialAudio([
  { src: 'chapter1.mp3', label: 'Chapter 1' },
  { src: 'chapter2.mp3', label: 'Chapter 2' },
  { src: 'chapter3.mp3', label: 'Chapter 3' }
], {
  autoAdvance: false,
  onPlay:      (clip) => updateUI(`Now reading: ${clip.label}`),
  onComplete:  ()     => showCongratulations()
});

document.getElementById('play-btn').addEventListener('click',   () => story.play());
document.getElementById('next-btn').addEventListener('click',   () => story.next());
document.getElementById('pause-btn').addEventListener('click',  () => story.pause());
document.getElementById('resume-btn').addEventListener('click', () => story.resume());


// ── Jump to clip by label ─────────────────────────────────────────────────────

player.gotoLabel('Chapter 2');


// ── Get current progress ──────────────────────────────────────────────────────

const current = player.getCurrentClip();
const index   = player.getCurrentIndex();
const total   = player.getClipCount();
console.log(`Playing clip ${index + 1} of ${total}: ${current.label}`);


// ── SPA teardown (React, Vue, etc.) ───────────────────────────────────────────

// React:
// useEffect(() => {
//   const player = new SequentialAudio(clips);
//   return () => player.destroy();
// }, []);

// Vue:
// onUnmounted(() => player.destroy());


// ── Check format support ──────────────────────────────────────────────────────

if (!SequentialAudio.canPlay('audio/ogg')) {
  console.warn('OGG not supported — use MP3 sources instead');
}

*/
