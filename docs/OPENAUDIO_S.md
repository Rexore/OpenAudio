# OpenAudio_s.js API Reference

**Version:** 1.3.0
**Class:** `SequentialAudio`
**Use Case:** Sequential/playlist playback with manual or auto-advance

---

## Quick Start

```javascript
const player = new SequentialAudio([
  { src: 'intro.mp3',    label: 'Introduction' },
  { src: 'chapter1.mp3', label: 'Chapter 1' },
  { src: 'chapter2.mp3', label: 'Chapter 2' }
], {
  autoAdvance: false,
  onPlay:      (clip) => console.log(`Playing: ${clip.label}`),
  onComplete:  ()     => console.log('All clips finished!')
});

// Start — must be inside a user gesture
document.getElementById('play-btn').addEventListener('click', () => player.play());

// Advance to next clip
document.getElementById('next-btn').addEventListener('click', () => player.next());
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
- **`label`** (string, optional) — Display name for console/callbacks

#### `options` (object, optional)

```javascript
{
  autoAdvance:  false,       // Boolean: auto-play next clip after current ends
  advanceDelay: 0.5,         // Number: seconds to wait before auto-advance
  loop:         false,       // Boolean: loop sequence when complete
  volume:       1.0,         // Number: volume 0.0–1.0
  onPlay:       (clip) => {},// Function: called when clip starts
  onEnd:        (clip) => {},// Function: called when clip ends
  onComplete:   () => {}     // Function: called when sequence finishes
}
```

**All options are optional.**

### Constructor Errors

```javascript
// Throws TypeError
new SequentialAudio();                      // ❌ Missing clips
new SequentialAudio([]);                    // ❌ Empty array
new SequentialAudio([{ src: '' }]);         // ❌ Empty src
new SequentialAudio([{ label: 'No src' }]); // ❌ Missing src

// Valid
new SequentialAudio([{ src: 'clip.mp3', label: 'Clip' }]); // ✅
```

---

## Public Methods

### `play()`

Start the sequence. Must be called inside a user gesture on first use.

```javascript
document.addEventListener('click', () => player.play(), { once: true });
```

**Behavior:**
- If already started or playing: ignored (safe)
- If sequence has not started: unlocks Audio element and plays first clip

---

### `next()`

Advance to the next clip and play it. No-op if `play()` has not been called yet.

```javascript
player.next();
```

**Behavior:**
- Increments clip index by 1
- At end of sequence:
  - `loop: true` → wraps to clip 0
  - `loop: false` → fires `onComplete`, stops

---

### `goto(index)`

Jump to a clip by zero-based index and play it.

```javascript
player.goto(0);   // First clip
player.goto(2);   // Third clip
player.goto(10);  // ❌ Warning if out of range — no-op
```

**Parameters:**
- `index` (number) — 0-based clip index

---

### `gotoLabel(label)`

Jump to a clip by label (exact string match) and play it.

```javascript
player.gotoLabel('Chapter 1');   // ✅ Jumps to matching clip
player.gotoLabel('Chapter 99');  // ❌ Warning if not found — no-op
```

---

### `pause()`

Pause at current playback position.

```javascript
player.play();    // Playing at 2:30
player.pause();   // Paused at 2:30
player.resume();  // Resumes from 2:30
```

---

### `resume()`

Resume from paused position. No-op if not paused.

```javascript
player.resume();  // Resumes from pause point
player.resume();  // No-op if already playing
```

---

### `stop()`

Pause, rewind current clip to 0:00, and cancel any pending auto-advance timer.

```javascript
player.stop();
```

From v1.2.0: `stop()` cancels any pending auto-advance `setTimeout`, so calling `stop()` during the inter-clip delay window correctly prevents the next clip from starting.

From v1.3.0: `stop()` also sets a `#playCancelled` flag. If `play()` is called and `stop()` (or `reset()`) is called before the silent-MP3 unlock resolves (~50–200 ms), the clip will not start when the unlock completes. Previously this race was unguarded — the clip would play despite the explicit stop.

---

### `reset()`

Stop and reset sequence to clip 0. Clears `isStarted` — next `play()` re-runs the unlock.

```javascript
player.goto(3);   // At clip 4
player.reset();   // Back to clip 0, stopped
player.play();    // Starts fresh from clip 0
```

---

### `destroy()`

Release the Audio element, remove event listeners, and cancel any pending auto-advance timer. All subsequent method calls are safe no-ops.

```javascript
player.destroy();

// React example
useEffect(() => {
  const player = new SequentialAudio(clips);
  return () => player.destroy();
}, []);
```

---

### `getCurrentClip()`

Get a **copy** of the current clip object. Returns a copy to prevent mutation of the internal playlist.

```javascript
const clip = player.getCurrentClip();
console.log(clip.label, clip.src);
```

**Returns:** `{ src: string, label: string }` (copy)

---

### `getCurrentIndex()`

Get the current clip index (0-based).

```javascript
const index = player.getCurrentIndex();
console.log(`Clip ${index + 1} of ${player.getClipCount()}`);
```

---

### `getClipCount()`

Get total number of clips.

```javascript
const total = player.getClipCount();
```

---

### `getClips()`

Get a **deep copy** of all clip objects. Inner objects are copied to prevent callers from mutating the internal playlist.

```javascript
const allClips = player.getClips();
```

**Returns:** `Array<{ src: string, label: string }>` (deep copy)

---

### `canPlay(type)` — Static Method

Check if browser supports an audio format.

```javascript
SequentialAudio.canPlay('audio/mpeg')  // → boolean
SequentialAudio.canPlay('audio/ogg')   // → boolean
SequentialAudio.canPlay('audio/wav')   // → boolean
SequentialAudio.canPlay('audio/webm')  // → boolean
```

**Returns:** `true` if supported, `false` if unsupported or input is not a string.

```javascript
if (!SequentialAudio.canPlay('audio/ogg')) {
  console.warn('OGG not supported — use MP3 sources instead');
}
```

---

## Public Properties

### `isPlaying`

**Type:** `boolean` (read-only getter)

`true` if a clip is actively playing, `false` if paused, stopped, or between clips.

```javascript
if (player.isPlaying) {
  player.pause();
}
```

---

### `isStarted`

**Type:** `boolean` (read-only getter)

`true` after `play()` has been called and the sequence has been unlocked. `false` before first `play()` or after `reset()`.

```javascript
console.log(player.isStarted); // false
player.play();
console.log(player.isStarted); // true
player.reset();
console.log(player.isStarted); // false
```

---

## Callbacks

### `onPlay(clip)`

Called when a clip **starts playing**.

```javascript
const player = new SequentialAudio(clips, {
  onPlay: (clip) => {
    updateProgressBar(clip.label);
  }
});
```

**Parameter:** `clip` — a copy of the clip object `{ src, label }`.

**Error handling:** Errors are caught and logged. A throwing callback will not stall playback.

---

### `onEnd(clip)`

Called when a clip **finishes naturally**. Does not fire if `stop()` or `pause()` interrupts the clip.

```javascript
const player = new SequentialAudio(clips, {
  onEnd: (clip) => {
    console.log(`Finished: ${clip.label}`);
  }
});
```

**After `onEnd`:**
- `autoAdvance: true` → next clip starts after `advanceDelay` seconds
- `autoAdvance: false` → sequence waits for `next()` call

---

### `onComplete()`

Called when the entire sequence finishes (no more clips and `loop: false`).

```javascript
const player = new SequentialAudio(clips, {
  onComplete: () => {
    showCongratulationsScreen();
  }
});
```

---

## Usage Patterns

### Narrated Story (Manual Advance)

```javascript
const story = new SequentialAudio([
  { src: 'chapter1.mp3', label: 'Chapter 1' },
  { src: 'chapter2.mp3', label: 'Chapter 2' },
  { src: 'chapter3.mp3', label: 'Chapter 3' }
], {
  autoAdvance: false,
  onPlay:      (clip) => updateUI(`Reading: ${clip.label}`),
  onComplete:  ()     => showTheEnd()
});

document.addEventListener('click', () => story.play(), { once: true });
document.getElementById('next-btn').addEventListener('click', () => story.next());
document.getElementById('prev-btn').addEventListener('click', () => {
  story.goto(Math.max(0, story.getCurrentIndex() - 1));
});
```

---

### Tutorial with Auto-Advance

```javascript
const tutorial = new SequentialAudio([
  { src: 'intro.mp3',       label: 'Introduction' },
  { src: 'step1.mp3',       label: 'Step 1' },
  { src: 'step2.mp3',       label: 'Step 2' },
  { src: 'conclusion.mp3',  label: 'Conclusion' }
], {
  autoAdvance:  true,
  advanceDelay: 0.5,
  onPlay:       (clip) => highlightStep(clip.label),
  onComplete:   ()     => showCompletionCertificate()
});

document.getElementById('start-tutorial').addEventListener('click', () => tutorial.play());
```

---

### Interactive Quiz

```javascript
const quiz = new SequentialAudio([
  { src: 'question1.mp3', label: 'Question 1' },
  { src: 'question2.mp3', label: 'Question 2' },
  { src: 'results.mp3',   label: 'Results' }
], {
  autoAdvance: false,
  onPlay:      (clip) => showQuestion(clip.label),
  onComplete:  ()     => showResults()
});

function submitAnswer(answer) {
  recordAnswer(answer);
  quiz.next();
}
```

---

### Guided Tour with Skip/Rewind

```javascript
const tour = new SequentialAudio([
  { src: 'welcome.mp3',  label: 'Welcome' },
  { src: 'feature1.mp3', label: 'Feature 1: Dashboard' },
  { src: 'feature2.mp3', label: 'Feature 2: Settings' },
  { src: 'thanks.mp3',   label: 'Thanks' }
], {
  onPlay:     (clip) => highlightFeature(clip.label),
  onComplete: ()     => completeTour()
});

document.getElementById('start-tour').addEventListener('click',        () => tour.play());
document.getElementById('skip-to-settings').addEventListener('click', () => tour.gotoLabel('Feature 2: Settings'));
document.getElementById('previous').addEventListener('click',          () => tour.goto(Math.max(0, tour.getCurrentIndex() - 1)));
document.getElementById('next').addEventListener('click',              () => tour.next());
```

---

## Troubleshooting

### Audio Won't Play on First Click

```javascript
// ✅ Correct
document.addEventListener('click', () => player.play());

// ❌ Wrong
setTimeout(() => player.play(), 1000);
```

### Stop Doesn't Prevent Auto-Advance (v1.1.0 and earlier)

This was fixed in v1.2.0. `stop()` now calls `clearTimeout` on the pending advance timer. Upgrade to v1.2.0 to resolve.

### Stop During Unlock Still Plays Clip (v1.2.0 and earlier)

This was fixed in v1.3.0. `stop()` and `reset()` now set a `#playCancelled` flag that the unlock `.then()` checks before starting playback. Previously, calling `stop()` or `reset()` in the ~50–200 ms window between `play()` being called and the silent-MP3 unlock resolving was silently ignored — the clip would start anyway. Upgrade to v1.3.0 to resolve.

### Progress Bar Shows Wrong Index

`getCurrentIndex()` is 0-based:
```javascript
const index = player.getCurrentIndex();
console.log(`Clip ${index + 1} of ${player.getClipCount()}`);
```

---

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 70+ | ✅ Full | Gesture required first time |
| Firefox 65+ | ✅ Full | Same as Chrome |
| Safari 12+ | ✅ Full | iOS: gesture required |
| Edge 79+ | ✅ Full | Same as Chrome |
| iOS Safari 12+ | ✅ Full | Extensively tested |
| Chrome Android | ✅ Full | Gesture required |

---

## Performance

- **File Size:** ~5 KB (minified)
- **Gzipped:** ~2 KB
- **Runtime Memory:** < 150 KB per player
- **CPU:** Negligible

---

## Changelog

### v1.3.0 (March 2026)
- **`#playCancelled` flag** — `stop()` and `reset()` now plant a cancellation token that the in-flight silent-MP3 unlock `.then()` checks before calling `#playClip()`. Previously, calling `stop()` or `reset()` during the ~50–200 ms unlock window was silently ignored — the clip would start regardless.
- **`stop()` doc updated** — Behaviour note now covers both the auto-advance timer cancellation (v1.2.0) and the new unlock cancellation (v1.3.0).
- **Usage example fix** — `goto(getCurrentIndex() - 1)` in the guided-tour example now uses `Math.max(0, …)`, preventing a spurious out-of-range `console.warn` when the user is already on the first clip.

### v1.2.0 (March 2026)
- `isPlaying` and `isStarted` are now read-only getters backed by private fields
- `#isPlaying` and `#isStarted` set synchronously before `#audio.play()` in `#playClip()`, closing double-play race window
- `#advanceTimer` stored and cleared by `stop()`, `reset()`, and `destroy()`
- `resume()` race fixed — `#isPlaying` set synchronously, reverted in `.catch()`
- `destroy()` uses `removeAttribute('src')` + `load()` per WHATWG spec
- `getCurrentClip()` returns shallow copy; `getClips()` deep-copies inner objects

### v1.1.0 (March 2026)
- Unlock now plays on the shared `#audio` element (fixes `NotAllowedError` on iOS Safari)
- `play()` guard extended to check `isStarted`
- `next()` / `goto()` / `gotoLabel()` guard against uninitialised player
- `pause()` / `resume()` guard on `isStarted`
- `destroy()` removes `ended` listener via stored `#endedHandler` reference
- `#isDestroyed` flag — all public methods safe no-ops after `destroy()`
- `advanceDelay` option added (default `0.5s`)

### v1.0.0 (March 2026)
- Initial release: sequential playlist player
- Click-to-advance playback control
- Jump to clip by index (`goto()`) or label (`gotoLabel()`)
- Pause/resume support
- Progress tracking (`getCurrentClip()`, `getCurrentIndex()`, `getClipCount()`)

---

## License

Apache License 2.0. See [LICENSE](../LICENSE).

---

## See Also

- [OpenAudio_r.js API](./OPENAUDIO_R.md) — Randomized scheduler
- [OpenAudio.js API](./OPENAUDIO.md) — Single-clip player
- [Feature Comparison](./COMPARISON.md) — Decide which library fits
- [Main README](../README.md) — OpenAudio suite overview

---

*Last updated: March 2026*
