/**
 * @file        OpenAudio_s.js
 * @author      Rexore
 * @version     1.1.0
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
 *   - destroy(): removes listeners; safe for SPA teardown
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
 *   player.stop()              Pause and rewind current clip to start.
 *   player.reset()             Stop and return sequence to clip 0.
 *
 *   player.destroy()           Stop, remove event listeners, release Audio element.
 *                              Call on SPA component unmount.
 *
 *   player.getCurrentClip()    Returns current clip object { src, label }.
 *   player.getCurrentIndex()   Returns current clip index (number).
 *   player.getClipCount()      Returns total number of clips (number).
 *   player.getClips()          Returns defensive copy of clips array.
 *
 *   player.isPlaying           {boolean}  True while a clip is actively playing.
 *   player.isStarted           {boolean}  True after first successful play().
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
  #endedHandler;   // stored reference for removeEventListener in destroy()
  #isUnlocking;
  #isDestroyed;
  #autoAdvance;
  #advanceDelay;
  #loop;
  #volume;
  #onPlay;
  #onEnd;
  #onComplete;

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

    this.#autoAdvance  = options.autoAdvance  ?? false;
    this.#advanceDelay = options.advanceDelay ?? 0.5;
    this.#loop         = options.loop         ?? false;
    this.#volume       = Math.min(1, Math.max(0, options.volume ?? 1.0));
    this.#onPlay       = options.onPlay       || null;
    this.#onEnd        = options.onEnd        || null;
    this.#onComplete   = options.onComplete   || null;

    this.isPlaying = false;
    this.isStarted = false;

    // Single shared Audio element — created here so mobile browsers keep it
    // within the gesture activation context for all subsequent play() calls.
    this.#audio         = new Audio();
    this.#audio.preload = 'auto';
    this.#audio.volume  = this.#volume;

    // Store the handler reference so destroy() can remove it cleanly.
    this.#endedHandler = () => {
      if (this.#isDestroyed) return;
      this.isPlaying = false;
      const clip = this.#clips[this.#currentIndex];
      try { if (this.#onEnd) this.#onEnd(clip); } catch (e) {
        console.warn(`SequentialAudio: onEnd callback error (${clip.label}):`, e);
      }
      if (this.#autoAdvance) {
        setTimeout(() => {
          if (!this.#isDestroyed) this.next();
        }, this.#advanceDelay * 1000);
      }
    };

    this.#audio.addEventListener('ended', this.#endedHandler);
  }

  // ── PUBLIC API ──────────────────────────────────────────────────────────────

  /**
   * Unlock the Audio element and play the current clip.
   *
   * Must be called synchronously inside a user gesture on first use.
   * Ignored if the sequence has already started (isStarted), is currently
   * playing, or the unlock is already in progress.
   */
  play() {
    if (this.#isDestroyed || this.isStarted || this.isPlaying || this.#isUnlocking) return;

    this.#isUnlocking = true;

    // Unlock the SHARED element — not a throwaway — so that all future
    // play() calls on #audio are permitted by the browser's autoplay policy.
    this.#audio.src    = _SEQUENTIAL_SILENT_MP3;
    this.#audio.volume = 0;
    this.#audio.play()
      .then(() => {
        this.#isUnlocking = false;
        if (this.#isDestroyed) return;
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
        // AbortError or other — do not attempt to play; leave state clean
      });
  }

  /**
   * Advance to the next clip and play it.
   * No-op if the sequence has not been started via play() first.
   * At end of sequence: loops if loop:true, otherwise fires onComplete.
   */
  next() {
    if (this.#isDestroyed || !this.isStarted) return;

    this.#currentIndex++;

    if (this.#currentIndex >= this.#clips.length) {
      if (this.#loop) {
        this.#currentIndex = 0;
        this.#playClip();
      } else {
        // Stay on the last clip index so getCurrentClip() remains valid
        this.#currentIndex = this.#clips.length - 1;
        this.isPlaying = false;
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
    if (this.#isDestroyed || !this.isStarted) return;
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
    if (this.#isDestroyed || !this.isStarted) return;
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
    if (this.#isDestroyed || !this.isStarted) return;
    this.#audio.pause();
    this.isPlaying = false;
  }

  /**
   * Resume from paused position. No-op if not paused.
   */
  resume() {
    if (this.#isDestroyed || !this.isStarted || !this.#audio.paused) return;
    this.#audio.play()
      .then(() => { this.isPlaying = true; })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.warn('SequentialAudio: resume() failed:', err);
        }
      });
  }

  /**
   * Pause and rewind current clip to its start.
   */
  stop() {
    if (this.#isDestroyed) return;
    this.#audio.pause();
    this.#audio.currentTime = 0;
    this.isPlaying = false;
  }

  /**
   * Stop and reset sequence to clip 0.
   * isStarted is cleared — next play() will re-run the unlock.
   */
  reset() {
    if (this.#isDestroyed) return;
    this.stop();
    this.#currentIndex = 0;
    this.isStarted = false;
  }

  /**
   * Release the Audio element and remove all event listeners.
   * Call this on SPA component unmount to prevent memory leaks.
   * All method calls after destroy() are safe no-ops.
   */
  destroy() {
    if (this.#isDestroyed) return;
    this.#isDestroyed = true;
    this.#audio.pause();
    this.#audio.removeEventListener('ended', this.#endedHandler);
    this.#audio.src = '';
    this.#audio = null;
  }

  /**
   * Returns the current clip object { src, label }.
   * @returns {{ src: string, label: string }}
   */
  getCurrentClip() { return this.#clips[this.#currentIndex]; }

  /** @returns {number} */
  getCurrentIndex() { return this.#currentIndex; }

  /** @returns {number} */
  getClipCount() { return this.#clips.length; }

  /** @returns {Array} Defensive copy. */
  getClips() { return [...this.#clips]; }

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
   */
  #playClip() {
    if (this.#isDestroyed) return;

    const clip = this.#clips[this.#currentIndex];

    this.#audio.src         = clip.src;
    this.#audio.currentTime = 0;
    this.#audio.volume      = this.#volume;

    this.#audio.play()
      .then(() => {
        if (this.#isDestroyed) { this.#audio?.pause(); return; }
        this.isStarted = true;
        this.isPlaying = true;
        try { if (this.#onPlay) this.#onPlay(clip); } catch (e) {
          console.warn(`SequentialAudio: onPlay callback error (${clip.label}):`, e);
        }
      })
      .catch(err => {
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
  tour.goto(tour.getCurrentIndex() - 1);
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
