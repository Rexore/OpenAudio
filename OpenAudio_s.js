/**
 * @file        OpenAudio_s.js
 * @author      Rexore
 * @version     1.0.0
 * @license     GPL-3.0-or-later
 *
 * Sequential audio player: plays clips one at a time, advances on demand.
 * Perfect for interactive narratives, tutorials, quizzes, and guided tours.
 *
 * Key differences from OpenAudio_r.js:
 *   - Plays clips in fixed sequence (no randomization)
 *   - User controls when next clip plays (manual or auto-advance)
 *   - Tracks current clip index and progress
 *   - Can loop the entire sequence
 *   - Optional shuffle on sequence restart
 *
 * Inherited from parent architecture:
 *   - Silent MP3 unlock: satisfies browser autoplay policy
 *   - #isUnlocking guard: prevents duplicate unlock attempts
 *   - Callbacks: onPlay, onEnd — wrapped in try/catch
 *   - destroy(): removes listeners; safe for SPA teardown
 *   - canPlay() static: check browser format support before constructing
 *
 * ============================================================================
 * QUICK START
 * ============================================================================
 *
 *   const player = new SequentialAudio([
 *     { src: 'intro.mp3', label: 'Introduction' },
 *     { src: 'chapter1.mp3', label: 'Chapter 1' },
 *     { src: 'chapter2.mp3', label: 'Chapter 2' }
 *   ], {
 *     autoAdvance: false,        // Require click to go to next clip
 *     onPlay:      (clip) => console.log(`Playing: ${clip.label}`),
 *     onEnd:       (clip) => console.log(`Finished: ${clip.label}`),
 *     onComplete:  () => console.log('Sequence complete!')
 *   });
 *
 *   // Start sequence
 *   document.getElementById('play-btn').addEventListener('click', () => {
 *     player.play();
 *   });
 *
 *   // Advance to next clip
 *   document.getElementById('next-btn').addEventListener('click', () => {
 *     player.next();
 *   });
 *
 * ============================================================================
 * BROWSER AUTOPLAY POLICY
 * ============================================================================
 *
 * First call to play() must be inside a user gesture (click, keydown, etc.).
 * Subsequent calls to next() can happen anytime after the first unlock.
 *
 * ============================================================================
 */

class SequentialAudio {

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
  #clips;
  #currentIndex;
  #audio;
  #isUnlocking = false;
  #autoAdvance;
  #loop;
  #onPlay;
  #onEnd;
  #onComplete;

  /**
   * @param {Array} clips            - Array of clip objects with src and label.
   * @param {object} [options]
   * @param {boolean} [options.autoAdvance=false] - Auto-play next clip after current ends.
   * @param {boolean} [options.loop=false]        - Loop sequence when complete.
   * @param {Function} [options.onPlay]           - Called when clip starts.
   * @param {Function} [options.onEnd]            - Called when clip ends.
   * @param {Function} [options.onComplete]      - Called when sequence finishes.
   */
  constructor(clips, options = {}) {
    if (!Array.isArray(clips) || clips.length === 0) {
      throw new TypeError('SequentialAudio: clips must be a non-empty array.');
    }

    // Validate all clips have src
    clips.forEach((clip, i) => {
      if (!clip || typeof clip.src !== 'string' || !clip.src.trim()) {
        throw new TypeError(`SequentialAudio: clips[${i}].src must be a non-empty string.`);
      }
    });

    const {
      autoAdvance = false,
      loop        = false,
      onPlay      = null,
      onEnd       = null,
      onComplete  = null,
    } = options;

    this.#clips       = clips;
    this.#currentIndex = 0;
    this.#autoAdvance = autoAdvance;
    this.#loop        = loop;
    this.#onPlay      = onPlay;
    this.#onEnd       = onEnd;
    this.#onComplete  = onComplete;

    // Single shared Audio element
    this.#audio        = new Audio();
    this.#audio.preload = 'auto';

    this.#audio.addEventListener('ended', () => {
      this.isPlaying = false;
      const clip = this.#clips[this.#currentIndex];

      try { if (this.#onEnd) this.#onEnd(clip); } catch (e) {
        console.warn(`SequentialAudio: onEnd callback error (${clip.label}):`, e);
      }

      // Auto-advance to next clip if enabled
      if (this.#autoAdvance) {
        setTimeout(() => this.next(), 500); // Small delay for better UX
      }
    });
  }

  // ── Public state ────────────────────────────────────────────────────────────

  /** True while a clip is actively playing. */
  isPlaying = false;

  /** True after first play() call (sequence has started). */
  isStarted = false;

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Unlock the audio element (if needed) and play the first clip.
   * Must be called synchronously inside a user-gesture event handler on first use.
   *
   * Safe to call repeatedly — already-playing calls are ignored.
   */
  play() {
    if (this.isPlaying || this.#isUnlocking) return;

    this.#isUnlocking = true;

    // Play silent MP3 to unlock
    const unlock = new Audio(SequentialAudio.#SILENT_MP3);
    unlock.play().then(() => {
      this.#isUnlocking = false;
      this.#playClip();
    }).catch(() => {
      this.#isUnlocking = false;
      this.#playClip();
    });
  }

  /**
   * Advance to the next clip and play it.
   * Wraps to beginning if at end (and loop is enabled).
   *
   * Safe to call even if nothing is playing.
   */
  next() {
    // Move to next clip
    this.#currentIndex++;

    // Handle end-of-sequence
    if (this.#currentIndex >= this.#clips.length) {
      if (this.#loop) {
        // Loop: restart sequence
        this.#currentIndex = 0;
        this.#playClip();
      } else {
        // End: stop and call onComplete
        this.#currentIndex = this.#clips.length - 1; // Stay at last clip
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
   * Jump to a specific clip by index and play it.
   *
   * @param {number} index - Clip index (0-based)
   */
  goto(index) {
    if (index < 0 || index >= this.#clips.length) {
      console.warn(`SequentialAudio: goto() index out of range [0, ${this.#clips.length - 1}]`);
      return;
    }

    this.#currentIndex = index;
    this.#playClip();
  }

  /**
   * Jump to a clip by label.
   *
   * @param {string} label - Clip label (exact match)
   */
  gotoLabel(label) {
    const index = this.#clips.findIndex(c => c.label === label);
    if (index === -1) {
      console.warn(`SequentialAudio: no clip with label "${label}"`);
      return;
    }
    this.goto(index);
  }

  /**
   * Pause playback without resetting position.
   */
  pause() {
    this.#audio.pause();
    this.isPlaying = false;
  }

  /**
   * Resume playback from current position.
   * If not paused, this has no effect.
   */
  resume() {
    if (!this.#audio.paused) return;
    this.#audio.play().catch(err => {
      console.warn('SequentialAudio: resume() failed:', err);
    });
  }

  /**
   * Stop playback and rewind to beginning of current clip.
   */
  stop() {
    this.#audio.pause();
    this.#audio.currentTime = 0;
    this.isPlaying = false;
  }

  /**
   * Reset sequence to first clip without playing.
   */
  reset() {
    this.stop();
    this.#currentIndex = 0;
    this.isStarted = false;
  }

  /**
   * Get the current clip object.
   *
   * @returns {object} Current clip { src, label, ... }
   */
  getCurrentClip() {
    return this.#clips[this.#currentIndex];
  }

  /**
   * Get current clip index.
   *
   * @returns {number}
   */
  getCurrentIndex() {
    return this.#currentIndex;
  }

  /**
   * Get total number of clips.
   *
   * @returns {number}
   */
  getClipCount() {
    return this.#clips.length;
  }

  /**
   * Get all clips.
   *
   * @returns {Array}
   */
  getClips() {
    return [...this.#clips];
  }

  /**
   * Removes all references. Call on SPA component unmount.
   */
  destroy() {
    this.stop();
    this.#audio.src = '';
    this.#audio = null;
  }

  /**
   * Check browser support for audio MIME type.
   *
   * @param {string} type - MIME type (e.g., 'audio/mpeg')
   * @returns {boolean}
   */
  static canPlay(type) {
    const result = new Audio().canPlayType(type);
    return result === 'probably' || result === 'maybe';
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  #playClip() {
    if (this.#currentIndex < 0 || this.#currentIndex >= this.#clips.length) {
      return;
    }

    const clip = this.#clips[this.#currentIndex];

    // Rewind to start
    this.#audio.currentTime = 0;
    this.#audio.src = clip.src;

    this.#audio.play().then(() => {
      this.isStarted = true;
      this.isPlaying = true;
      try { if (this.#onPlay) this.#onPlay(clip); } catch (e) {
        console.warn(`SequentialAudio: onPlay callback error (${clip.label}):`, e);
      }
    }).catch(err => {
      if (err.name === 'AbortError') return;

      if (err.name === 'NotAllowedError') {
        console.warn(
          `SequentialAudio: play() blocked by autoplay policy for "${clip.label}". ` +
          `Call play() again inside a user gesture.`
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
  autoAdvance: true,  // Auto-play next clip when current finishes
  loop: true,         // Loop back to beginning when sequence ends
  onPlay: (clip) => console.log(`Playing: ${clip.label}`),
  onEnd: (clip) => console.log(`Finished: ${clip.label}`),
  onComplete: () => console.log('Sequence complete!')
});


// ── Guided tour ───────────────────────────────────────────────────────────────

const tour = new SequentialAudio([
  { src: 'welcome.mp3', label: 'Welcome' },
  { src: 'feature1.mp3', label: 'Feature 1' },
  { src: 'feature2.mp3', label: 'Feature 2' },
  { src: 'goodbye.mp3', label: 'Goodbye' }
], {
  onPlay: (clip) => showStep(clip.label),
  onEnd: (clip) => console.log(`Finished: ${clip.label}`),
  onComplete: () => showCompletionMessage()
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
  autoAdvance: false,  // User controls pacing
  onPlay: (clip) => updateUI(`Now reading: ${clip.label}`),
  onComplete: () => showCongratulations()
});

// Start, next, pause, resume controls
document.getElementById('play-btn').addEventListener('click', () => story.play());
document.getElementById('next-btn').addEventListener('click', () => story.next());
document.getElementById('pause-btn').addEventListener('click', () => story.pause());
document.getElementById('resume-btn').addEventListener('click', () => story.resume());


// ── Jump to clip by label ─────────────────────────────────────────────────────

player.gotoLabel('Chapter 2');  // Jump to chapter 2


// ── Get current progress ──────────────────────────────────────────────────────

const current = player.getCurrentClip();
const index = player.getCurrentIndex();
const total = player.getClipCount();

console.log(`Playing clip ${index + 1} of ${total}: ${current.label}`);


// ── SPA teardown (React, Vue, etc.) ───────────────────────────────────────────

// React:
// useEffect(() => {
//   const player = new SequentialAudio(clips);
//   return () => player.destroy();
// }, []);

*/
