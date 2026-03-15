# OpenAudio_s.js API Reference

**Version:** 1.0.0  
**Class:** `SequentialAudio`  
**Use Case:** Sequential/playlist playback with manual or auto-advance

---

## Quick Start

```javascript
// Create a player
const player = new SequentialAudio([
  { src: 'intro.mp3', label: 'Introduction' },
  { src: 'chapter1.mp3', label: 'Chapter 1' },
  { src: 'chapter2.mp3', label: 'Chapter 2' }
], {
  autoAdvance: false,  // Require manual click to advance
  onPlay: (clip) => console.log(`Playing: ${clip.label}`),
  onComplete: () => console.log('All clips finished!')
});

// Start the sequence
document.getElementById('play-btn').addEventListener('click', () => {
  player.play();
});

// Advance to next clip
document.getElementById('next-btn').addEventListener('click', () => {
  player.next();
});
```

---

## Constructor

```javascript
new SequentialAudio(clips, options)
```

### Parameters

#### `clips` (array, required)
Array of clip objects in playback order.

```javascript
[
  { src: 'clip1.mp3', label: 'First Clip' },
  { src: 'clip2.mp3', label: 'Second Clip' },
  { src: 'clip3.mp3', label: 'Third Clip' }
]
```

Each clip object:
- **`src`** (string, required) — Path or data URI to audio file
- **`label`** (string) — Display name for console/callbacks

#### `options` (object, optional)

```javascript
{
  autoAdvance: false,        // Boolean: auto-play next clip after current ends
  loop:        false,        // Boolean: loop sequence when complete
  onPlay:      (clip) => {}, // Function: called when clip starts
  onEnd:       (clip) => {}, // Function: called when clip ends
  onComplete:  () => {}      // Function: called when sequence finishes
}
```

**All options are optional.**

### Constructor Examples

```javascript
// Minimal
const player = new SequentialAudio([
  { src: 'clip1.mp3' },
  { src: 'clip2.mp3' }
]);

// With manual advance (require click between clips)
const player = new SequentialAudio(clips, {
  autoAdvance: false,
  onPlay: (clip) => updateUI(clip.label)
});

// With auto-advance (play next automatically)
const player = new SequentialAudio(clips, {
  autoAdvance: true,
  onComplete: () => showFinishScreen()
});

// With looping
const player = new SequentialAudio(clips, {
  loop: true,  // Restart sequence when complete
  onComplete: () => console.log('Looping...')
});
```

### Constructor Errors

```javascript
// Throws TypeError if clips is missing, empty, or invalid
new SequentialAudio();                    // ❌ TypeError
new SequentialAudio([]);                  // ❌ TypeError
new SequentialAudio([{ src: '' }]);       // ❌ Empty src
new SequentialAudio([{ label: 'No src' }]); // ❌ Missing src

// Valid
new SequentialAudio([
  { src: 'clip.mp3', label: 'Clip' }
]); // ✅
```

---

## Public Methods

### `play()`

Start playback from the first clip (or current position if paused).

**Must be called inside a user gesture on first use.**

```javascript
// First call (inside gesture)
document.addEventListener('click', () => {
  player.play();  // ✅ Starts from clip 0
});

// Subsequent calls
player.play();  // Safe to call anytime
```

**Behavior:**
- If already playing: ignored (safe)
- If paused: resumes from current position
- If finished: starts from beginning

---

### `next()`

Advance to the next clip and play it.

```javascript
player.next();  // Play next clip
```

**Behavior:**
- Increments clip index by 1
- Plays the new clip
- At end of sequence:
  - If `loop: true` → Wraps to beginning and plays clip 0
  - If `loop: false` → Stops and fires `onComplete`

```javascript
const player = new SequentialAudio([clip1, clip2, clip3], {
  loop: false
});

player.goto(0);   // Clip 0
player.next();    // Clip 1
player.next();    // Clip 2
player.next();    // Stops, fires onComplete
```

---

### `goto(index)`

Jump to a specific clip by index and play it immediately.

```javascript
player.goto(0);   // Jump to first clip
player.goto(2);   // Jump to third clip
```

**Parameters:**
- **`index`** (number) — 0-based clip index

**Behavior:**
- Jumps to the specified clip and plays it
- Validates index (warns if out of range, no-op)

```javascript
const player = new SequentialAudio([c1, c2, c3, c4]);

player.goto(1);   // ✅ Play clip 2
player.goto(10);  // ❌ Warning: out of range
```

---

### `gotoLabel(label)`

Jump to a clip by its label and play it.

```javascript
player.gotoLabel('Chapter 5');
```

**Parameters:**
- **`label`** (string) — Exact label match

**Behavior:**
- Searches clips for matching label
- Jumps to first match
- Warns if label not found

```javascript
const player = new SequentialAudio([
  { src: 'intro.mp3', label: 'Introduction' },
  { src: 'ch1.mp3', label: 'Chapter 1' },
  { src: 'ch2.mp3', label: 'Chapter 2' }
]);

player.gotoLabel('Chapter 1');   // ✅ Jumps to index 1
player.gotoLabel('Chapter 99');  // ❌ Warning: not found
```

---

### `pause()`

Pause playback without changing the clip or position.

```javascript
player.pause();
```

**Behavior:**
- Pauses audio at current position
- Sets `isPlaying = false`
- Call `resume()` to continue from same position

```javascript
player.play();      // Playing clip 1, 2:30 elapsed
player.pause();     // Paused at 2:30
player.resume();    // Resume from 2:30
```

---

### `resume()`

Resume playback from where it was paused.

```javascript
player.resume();
```

**Behavior:**
- If paused: resumes audio
- If already playing: no-op (safe)

```javascript
player.play();      // Playing
player.pause();     // Paused
player.resume();    // Resume from pause point
player.resume();    // No-op (already playing)
```

---

### `stop()`

Stop playback and rewind to the beginning of the current clip.

```javascript
player.stop();
```

**Behavior:**
- Pauses audio
- Rewinds to 0:00 of current clip
- Sets `isPlaying = false`
- Calling `play()` after will restart from beginning

```javascript
player.play();      // Playing clip 1, 2:30 elapsed
player.stop();      // Stopped, rewound to 0:00
player.play();      // Restart from 0:00
```

---

### `reset()`

Reset the sequence to the first clip without playing.

```javascript
player.reset();
```

**Behavior:**
- Stops playback
- Resets to clip index 0
- Resets `isStarted` flag
- Calling `play()` will start from beginning

```javascript
player.goto(3);     // At clip 4
player.reset();     // Back to clip 0, stopped
player.play();      // Play clip 0
```

---

### `getCurrentClip()`

Get the current clip object.

```javascript
const clip = player.getCurrentClip();
console.log(clip.label, clip.src);
```

**Returns:** Current clip object `{ src, label, ... }`

---

### `getCurrentIndex()`

Get the current clip index (0-based).

```javascript
const index = player.getCurrentIndex();
console.log(`Playing clip ${index + 1}`);
```

**Returns:** Number (0 to clipCount - 1)

---

### `getClipCount()`

Get total number of clips in the sequence.

```javascript
const total = player.getClipCount();
console.log(`${total} clips in sequence`);
```

**Returns:** Number

---

### `getClips()`

Get a copy of all clips.

```javascript
const allClips = player.getClips();
console.log(`Sequence has ${allClips.length} clips`);
```

**Returns:** Array of clip objects (copy, not reference)

---

### `destroy()`

Clean up and remove all references. Call on SPA unmount.

```javascript
player.destroy();
```

**Behavior:**
- Stops playback
- Clears audio element
- Nullifies internal references
- After this, don't call any other methods

```javascript
// React example
useEffect(() => {
  const player = new SequentialAudio(clips);
  return () => player.destroy();
}, []);
```

---

### `canPlay(type)` — Static Method

Check if browser supports an audio format.

```javascript
SequentialAudio.canPlay('audio/mpeg') → boolean
```

**Parameters:**
- **`type`** (string) — MIME type to check
  - `'audio/mpeg'` — MP3
  - `'audio/ogg'` — OGG Vorbis
  - `'audio/wav'` — WAV
  - `'audio/webm'` — WebM

**Returns:** `true` if supported, `false` otherwise

```javascript
if (SequentialAudio.canPlay('audio/ogg')) {
  // Use OGG files
} else {
  // Fall back to MP3
}
```

---

## Public Properties

### `isPlaying`

**Type:** `boolean` (read-only)

`true` if a clip is actively playing, `false` if paused or stopped.

```javascript
player.play();

if (player.isPlaying) {
  console.log('Clip is playing');
} else {
  console.log('Clip is paused or stopped');
}
```

---

### `isStarted`

**Type:** `boolean` (read-only)

`true` after first `play()` call (sequence has been unlocked and started).

```javascript
const player = new SequentialAudio(clips);

console.log(player.isStarted); // false

player.play();

console.log(player.isStarted); // true
```

---

## Callbacks

### `onPlay(clip)`

Called when a clip **starts playing**.

```javascript
const player = new SequentialAudio(clips, {
  onPlay: (clip) => {
    console.log(`Now playing: ${clip.label}`);
    updateProgressBar(clip.label);
  }
});
```

**Parameter:**
- **`clip`** — The clip object being played `{ src, label }`

**Thrown errors are caught:** If your callback throws, the error is logged but playback continues.

```javascript
const player = new SequentialAudio(clips, {
  onPlay: (clip) => {
    throw new Error('Oops!');
    // Error logged, playback unaffected
  }
});
```

---

### `onEnd(clip)`

Called when a clip **finishes playing** (reaches natural end).

Does NOT fire if you call `stop()` or `pause()` before the clip ends.

```javascript
const player = new SequentialAudio(clips, {
  onEnd: (clip) => {
    console.log(`Finished: ${clip.label}`);
    // Auto-advance is handled separately
  }
});
```

**Parameter:**
- **`clip`** — The clip object that ended

**After `onEnd`:**
- If `autoAdvance: true` → Next clip starts automatically (after 500ms delay)
- If `autoAdvance: false` → Sequence pauses, waiting for `next()` call

---

### `onComplete()`

Called when the entire sequence finishes (no more clips).

Only fires if `autoAdvance: true` OR user explicitly calls `next()` on the last clip.

```javascript
const player = new SequentialAudio(clips, {
  onComplete: () => {
    console.log('Sequence complete!');
    showCongratulationsScreen();
  }
});
```

**After `onComplete`:**
- If `loop: true` → Sequence wraps to beginning, ready for replay
- If `loop: false` → Sequence stops

---

## Usage Patterns

### Pattern 1: Narrated Story (Manual Advance)

```javascript
const story = new SequentialAudio([
  { src: 'chapter1.mp3', label: 'Chapter 1' },
  { src: 'chapter2.mp3', label: 'Chapter 2' },
  { src: 'chapter3.mp3', label: 'Chapter 3' }
], {
  autoAdvance: false,  // User controls pacing
  onPlay: (clip) => updateUI(`Reading: ${clip.label}`),
  onComplete: () => showTheEnd()
});

document.addEventListener('click', () => story.play(), { once: true });
document.getElementById('next-btn').addEventListener('click', () => story.next());
document.getElementById('prev-btn').addEventListener('click', () => {
  story.goto(Math.max(0, story.getCurrentIndex() - 1));
});
```

---

### Pattern 2: Tutorial with Auto-Advance

```javascript
const tutorial = new SequentialAudio([
  { src: 'intro.mp3', label: 'Introduction' },
  { src: 'step1.mp3', label: 'Step 1' },
  { src: 'step2.mp3', label: 'Step 2' },
  { src: 'conclusion.mp3', label: 'Conclusion' }
], {
  autoAdvance: true,  // Auto-play next step
  onPlay: (clip) => highlightStep(clip.label),
  onComplete: () => showCompletionCertificate()
});

document.getElementById('start-tutorial').addEventListener('click', () => {
  tutorial.play();
});
```

---

### Pattern 3: Interactive Quiz with Narration

```javascript
const quiz = new SequentialAudio([
  { src: 'question1.mp3', label: 'Question 1' },
  { src: 'question2.mp3', label: 'Question 2' },
  { src: 'question3.mp3', label: 'Question 3' },
  { src: 'results.mp3', label: 'Results' }
], {
  autoAdvance: false,
  onPlay: (clip) => {
    // Show question UI
    showQuestion(clip.label);
  },
  onComplete: () => {
    // Show final score
    showResults();
  }
});

// User answers question, then advances
function submitAnswer(answer) {
  recordAnswer(answer);
  quiz.next();  // Move to next question
}
```

---

### Pattern 4: Looping Background Narration

```javascript
const loopingNarration = new SequentialAudio([
  { src: 'intro.mp3', label: 'Intro' },
  { src: 'main.mp3', label: 'Main Message' },
  { src: 'outro.mp3', label: 'Outro' }
], {
  autoAdvance: true,
  loop: true,  // Restart after outro
  onPlay: (clip) => console.log(`[${clip.label}]`)
});

document.addEventListener('click', () => loopingNarration.play(), { once: true });
```

---

### Pattern 5: Guided Tour with Skip/Rewind

```javascript
const tour = new SequentialAudio([
  { src: 'welcome.mp3', label: 'Welcome' },
  { src: 'feature1.mp3', label: 'Feature 1: Dashboard' },
  { src: 'feature2.mp3', label: 'Feature 2: Settings' },
  { src: 'feature3.mp3', label: 'Feature 3: Profile' },
  { src: 'thanks.mp3', label: 'Thanks' }
], {
  onPlay: (clip) => highlightFeature(clip.label),
  onComplete: () => completeTour()
});

// Play from start
document.getElementById('start-tour').addEventListener('click', () => tour.play());

// Jump to specific section
document.getElementById('skip-to-settings').addEventListener('click', () => {
  tour.gotoLabel('Feature 2: Settings');
});

// Rewind one step
document.getElementById('previous').addEventListener('click', () => {
  const idx = Math.max(0, tour.getCurrentIndex() - 1);
  tour.goto(idx);
});

// Forward one step
document.getElementById('next').addEventListener('click', () => {
  tour.next();
});
```

---

## Troubleshooting

### Audio Won't Play on First Click

**Problem:** Calling `play()` outside a user gesture.

**Solution:**
```javascript
// ✅ Correct
document.addEventListener('click', () => player.play());

// ❌ Wrong
setTimeout(() => player.play(), 1000);
```

---

### Can't Advance to Next Clip

**Problem:** Calling `next()` but nothing happens.

**Cause:** Already at last clip and `loop: false`.

**Solution:**
```javascript
if (player.getCurrentIndex() < player.getClipCount() - 1) {
  player.next();
} else if (loop) {
  // Already handled by library
  player.next();
}
```

---

### Progress Bar Shows Wrong Index

**Problem:** UI shows wrong clip number.

**Solution:** `getCurrentIndex()` is 0-based, so display `index + 1`:

```javascript
const index = player.getCurrentIndex();
console.log(`Clip ${index + 1} of ${player.getClipCount()}`);
```

---

### onComplete Fires Too Early

**Problem:** Callback fires before last clip actually ends.

**Cause:** `autoAdvance: true` fires `next()` → triggers `onComplete` before last clip fully plays.

**Solution:** Use manual advance or check if you really want `onComplete` at this time:

```javascript
const player = new SequentialAudio(clips, {
  autoAdvance: false,  // User controls advancement
  onComplete: () => {
    // Now fires only when user explicitly ends sequence
  }
});
```

---

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 70+ | ✅ Full | Autoplay policy: gesture required first time |
| Firefox 65+ | ✅ Full | Same as Chrome |
| Safari 12+ | ✅ Full | iOS: gesture required; Desktop: autoplay OK |
| Edge 79+ | ✅ Full | Same as Chrome |
| iOS Safari 12+ | ✅ Full | Gesture required; extensively tested |
| Chrome Android | ✅ Full | Gesture required |

---

## Performance

- **File Size:** ~5 KB (minified)
- **Gzipped:** ~2 KB
- **Runtime Memory:** < 150 KB per player
- **CPU:** Negligible — HTML5 Audio element management only

---

## License

GNU General Public License v3.0 or later. See [LICENSE](../LICENSE).

---

## See Also

- [OpenAudio_r.js API](./OPENAUDIO_R.md) — Randomized scheduler
- [OpenAudio.js API](./OPENAUDIO.md) — Single-clip player
- [Feature Comparison](./COMPARISON.md) — Decide which library fits
- [Main README](../README.md) — OpenAudio suite overview

---

*Last updated: March 2025*
