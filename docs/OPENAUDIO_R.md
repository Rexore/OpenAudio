# OpenAudio_r.js API Reference

**Version:** 2.6.0
**Class:** `AudioEngine`
**Use Case:** Randomized multi-clip scheduler with shuffle bag algorithm

---

## Quick Start

```javascript
const engine = new AudioEngine([
  { src: 'audio/forest.mp3', label: 'Forest' },
  { src: 'audio/rain.mp3',   label: 'Rain' },
  { src: 'audio/birds.mp3',  label: 'Birds' }
], {
  lowTime:  3,
  maxTime:  5,
  volume:   0.8,
  onPlay:   (clip) => console.log('Playing:', clip.label),
  onEnd:    (clip) => console.log('Finished:', clip.label),
  onCycleReset: () => console.log('New cycle')
});

// Start on first user gesture
document.addEventListener('click', () => engine.start(), { once: true });
```

---

## Constructor

```javascript
new AudioEngine(clips, options)
```

### Parameters

#### `clips` (array, required)
Array of audio clip objects. Each clip must have:

```javascript
{
  src: 'path/to/audio.mp3',  // Required: URL or data URI
  label: 'Clip Name'         // Optional: name for logging/callbacks
}
```

**Examples:**
```javascript
// Minimal
const engine = new AudioEngine([
  { src: 'audio/clip1.mp3' },
  { src: 'audio/clip2.mp3' }
]);

// With labels
const engine = new AudioEngine([
  { src: 'ambient/forest.mp3', label: 'Forest Ambience' },
  { src: 'ambient/rain.mp3',   label: 'Rain Sounds' }
]);

// With data URIs
const engine = new AudioEngine([
  { src: 'data:audio/mp3;base64,SUQzBA...', label: 'Embedded' }
]);
```

#### `options` (object, optional)

```javascript
{
  lowTime:       1,         // Min delay between clips (seconds), default: 1
  maxTime:       10,        // Max delay between clips (seconds), default: 10
  volume:        0.85,      // Volume 0.0–1.0, default: 0.85
  onPlay:        fn,        // Callback when clip starts
  onEnd:         fn,        // Callback when clip ends
  onCycleReset:  fn         // Callback when all clips have played and cycle resets
}
```

**All options are optional.**

---

## Public Methods

### `start()`

Begin playback. Must be called inside a user gesture on first use. No-op after `destroy()`.

```javascript
// First call (inside gesture — REQUIRED)
document.addEventListener('click', () => engine.start(), { once: true });

// Subsequent calls
engine.start();  // Safe to call anytime — ignored if already running
```

**Behavior:**
- If already started or unlocking: ignored (safe)
- If stopped: resumes cycle from next clip
- First call: plays silent unlock MP3, then schedules first clip

**Browser Autoplay Policy:**
- ✅ Works: click, keydown, touchstart, mousedown
- ❌ Doesn't work: scroll, page load, setTimeout

---

### `stop()`

Stop playback and preserve cycle state. No-op after `destroy()`.

```javascript
engine.stop();
```

**Behavior:**
- Pauses current clip
- Cancels pending timer
- Preserves played flags — next `start()` picks up from the same cycle position

```javascript
engine.start();     // Playing
engine.stop();      // Stopped
engine.start();     // Resumes same cycle
```

---

### `reset()`

Stop and clear all played flags. No-op after `destroy()`.

```javascript
engine.reset();
engine.start();  // Starts a completely fresh random cycle
```

---

### `setVolume(value)`

Change volume during playback. No-op after `destroy()`.

```javascript
engine.setVolume(0.5);  // 50% volume
engine.setVolume(1.0);  // Full volume
engine.setVolume(0.0);  // Mute (engine keeps running)
```

**Parameter:**
- `value` (number) — Volume 0.0–1.0. Clamped automatically.

```javascript
// Volume slider
document.getElementById('volume-slider').addEventListener('input', (e) => {
  engine.setVolume(e.target.value / 100);
});
```

---

### `addClip(clip)`

Add a clip to the engine at runtime. No-op after `destroy()`.

```javascript
engine.addClip({ src: 'audio/new-clip.mp3' });
engine.addClip({ src: 'audio/new-clip.mp3', label: 'New Sound' });
```

**Parameters:**
- `clip.src` (string, required) — Audio URL or data URI. Throws if missing or empty.
- `clip.label` (string, optional) — Name for logging.

**Behavior:** New clip enters the shuffle pool immediately with `played = false`. Takes effect on the current or next selection — does not interrupt current playback.

---

### `destroy()`

Stop the engine, release the Audio element, and remove all document-level listeners. No-op if called more than once.

```javascript
engine.destroy();
```

**Behavior:**
- Cancels pending timer
- Pauses current clip
- Removes `visibilitychange` listener
- Releases Audio element via `removeAttribute('src')` + `load()` (WHATWG spec)
- All subsequent method calls are safe no-ops

**React Example:**
```javascript
useEffect(() => {
  const engine = new AudioEngine([...]);
  return () => engine.destroy();  // Clean up on unmount
}, []);
```

---

### `canPlay(type)` — Static Method

Check if browser supports a format before constructing.

```javascript
if (AudioEngine.canPlay('audio/ogg')) {
  // Use .ogg files
} else {
  // Use .mp3 fallback
}
```

**Supported types:**
- `'audio/mpeg'` — MP3
- `'audio/ogg'` — OGG Vorbis
- `'audio/wav'` — WAV
- `'audio/webm'` — WebM
- `'audio/flac'` — FLAC

---

## Public Properties

### `isStarted`

**Type:** `boolean` (read-only getter)

`true` if engine has been started, `false` if stopped or not yet started.

```javascript
const engine = new AudioEngine([...]);

console.log(engine.isStarted);  // false
engine.start();
console.log(engine.isStarted);  // true
engine.stop();
console.log(engine.isStarted);  // false
```

---

### `isPlaying`

**Type:** `boolean` (read-only getter)

`true` while a clip is actively playing, `false` between clips or when stopped.

```javascript
engine.start();
// Shortly after...
console.log(engine.isPlaying);  // true (clip playing)
// During inter-clip gap...
console.log(engine.isPlaying);  // false (waiting)
```

---

## Callbacks

### `onPlay(clip)`

Called when a clip **starts** playback.

```javascript
const engine = new AudioEngine([...], {
  onPlay: (clip) => {
    console.log('Clip started:', clip.label);
    updateUI('playing');
  }
});
```

**Parameter:** `clip` — the clip object `{ src, label }` currently playing.

**Error handling:** Errors are caught and logged. A throwing `onPlay` will not stall the engine.

---

### `onEnd(clip)`

Called when a clip **finishes naturally** (reaches end). Does not fire if `stop()` is called before the clip ends.

```javascript
const engine = new AudioEngine([...], {
  onEnd: (clip) => {
    console.log('Finished:', clip.label);
  }
});
```

**Timing:** Fires after the clip ends, before the next inter-clip delay starts.

---

### `onCycleReset()`

Called when all clips have played once and the shuffle bag resets for a new cycle.

```javascript
const engine = new AudioEngine(clips, {
  onCycleReset: () => {
    console.log('Full cycle complete — starting again');
  }
});
```

**Behavior:**
- Fires when all N clips have played once
- The clip that ended the previous cycle will not be the first clip of the next cycle (with 2+ clips)
- Error handling: wrapped in try/catch

---

## Shuffle Bag Algorithm

Each cycle, every clip plays exactly once before repeating.

**Example (3 clips):**
```
Cycle 1:  [Clip B, Clip A, Clip C]
Cycle 2:  [Clip C, Clip B, Clip A]
Cycle 3:  [Clip A, Clip C, Clip B]
```

**Not:**
```
❌ Pure random: [A, A, B, C, A, A, C]
```

**Benefits:**
- Prevents same clip twice in a row
- Guarantees variety within a cycle
- Feels more natural than pure random

---

## Background Tab Throttling Mitigation

Browsers throttle `setTimeout` in background tabs (Chrome/Firefox: ~1Hz; some mobile power-saving modes may suspend entirely).

This engine compensates using the Page Visibility API:

- When the tab returns to the foreground and a timer is pending, the elapsed wall-clock time is compared to the intended delay
- If the delay has already elapsed, `#playNext()` fires immediately
- Otherwise, a precise reschedule is set for the remaining duration

**Result:** Inter-clip timing recovers cleanly after backgrounding without bunching up missed clips.

---

## Usage Patterns

### Ambient Soundscape

```javascript
const ambient = new AudioEngine([
  { src: 'ambient/wind.mp3',     label: 'Wind' },
  { src: 'ambient/birds.mp3',    label: 'Birds' },
  { src: 'ambient/rustling.mp3', label: 'Rustling' }
], {
  lowTime:  2,
  maxTime:  8,
  volume:   0.6,
  onCycleReset: () => console.log('Ambient cycle complete')
});

startButton.addEventListener('click', () => ambient.start());
```

---

### Dynamic Volume Control

```javascript
const engine = new AudioEngine([...], { volume: 0.5 });

volumeSlider.addEventListener('input', (e) => {
  engine.setVolume(e.target.value / 100);
});

pauseButton.addEventListener('click', () => {
  engine.setVolume(0);
  engine.stop();
});
```

---

### Add Clips at Runtime

```javascript
const engine = new AudioEngine([
  { src: 'ambient/base1.mp3' },
  { src: 'ambient/base2.mp3' }
]);

// User unlocks new sounds
unlockedSounds.forEach(sound => {
  engine.addClip({ src: sound.path, label: sound.name });
});
```

---

### React Component

```javascript
import { useEffect } from 'react';

export default function AmbientPlayer() {
  useEffect(() => {
    const engine = new AudioEngine([
      { src: 'audio/clip1.mp3', label: 'One' },
      { src: 'audio/clip2.mp3', label: 'Two' }
    ], {
      onPlay: (clip) => console.log('Playing:', clip.label)
    });

    document.addEventListener('click', () => engine.start(), { once: true });

    return () => engine.destroy();  // Releases audio, removes listeners on unmount
  }, []);

  return <div>Audio Engine Ready</div>;
}
```

---

## Troubleshooting

### Audio Won't Play (Silent)

**Causes:**
1. `start()` called outside a user gesture
2. CORS or mixed-content issue
3. Browser doesn't support the audio format
4. Audio file not found (404)

**Solutions:**
```javascript
// ✅ Correct: inside gesture
document.addEventListener('click', () => engine.start(), { once: true });

// ❌ Wrong: no gesture context
setTimeout(() => engine.start(), 1000);

// ✅ Check format support
if (!AudioEngine.canPlay('audio/ogg')) {
  // Use .mp3 instead
}
```

---

### "NotAllowedError" in Console

**Cause:** `start()` not called inside a user gesture.
**Solution:** Wrap `start()` in a click, keydown, or touchstart handler.

---

### Stale Listeners in React / SPA

**Cause:** Not calling `destroy()` on component unmount.
**Solution:**
```javascript
useEffect(() => {
  const engine = new AudioEngine([...]);
  return () => engine.destroy();  // Always clean up
}, []);
```

---

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 70+ | ✅ Full | Autoplay: gesture required |
| Firefox 65+ | ✅ Full | Same as Chrome |
| Safari 12+ | ✅ Full | iOS Safari: gesture required |
| Edge 79+ | ✅ Full | Chromium-based |
| iOS Safari 12+ | ✅ Full | Gesture required |
| Chrome Android | ✅ Full | Touchstart counts as gesture |

---

## Performance

- **File Size:** ~9 KB (minified)
- **Gzipped:** ~3 KB
- **Runtime Memory:** < 200 KB
- **CPU:** Minimal (HTML5 Audio API only)

Multiple engines can run simultaneously without conflict.

---

## Changelog

### v2.6.0 (March 2026)
- All constructor and `addClip()` validation throws changed from `Error` to `TypeError`, matching ECMAScript convention and the behaviour of `OpenAudio.js` and `OpenAudio_s.js`. Callers catching errors via `instanceof TypeError` now correctly catch `AudioEngine` validation failures.
- `#isStarted` is now set `true` inside the unlock `.then()` (after the Audio element is confirmed usable), not at the top of `start()` before the unlock. The duplicate-start guard during the unlock window is handled by `#isUnlocking`. This aligns state machine semantics with `OpenAudio_s.js`.
- Expanded three compact single-line `try/catch` blocks (in the `onended` handler, `#resetCycle()`, and `#playNext()` `.then()`) to multi-line style, matching the formatting convention used throughout the suite.

### v2.5.0 (March 2026)
- `isStarted` and `isPlaying` are now read-only getters backed by private fields
- `#isDestroyed` flag — all public methods are safe no-ops after `destroy()`
- `destroy()` releases Audio element via `removeAttribute('src')` + `load()` (WHATWG spec)
- `#isPlaying` set synchronously before `#audio.play()` in `#playNext()`, closing race window

### v2.4.1 (March 2026)
- Licence changed from GPL-3.0-or-later to Apache-2.0

### v2.4.0 (March 2026)
- `#isUnlocking` flag prevents spam-click race conditions
- `destroy()` removes `visibilitychange` listener properly
- `canPlay()` static format checking
- `onCycleReset` callback wrapped in try/catch

### v2.3.0 (February 2026)
- Clip src validation
- Next-clip prefetch (eliminates network gaps)
- Background tab throttling mitigation

### v2.2.0 (January 2026)
- True private fields (`#`)
- NotAllowedError handling
- Silent base64 unlock
- `setVolume()` runtime control

### v2.1.0 (December 2025)
- Single reusable Audio element
- `stop()` race condition fix

### v2.0.0 (October 2025)
- Initial public release. Shuffle bag algorithm. Callbacks. `addClip()`.

---

## License

Apache License 2.0. See [LICENSE](../LICENSE).

---

## See Also

- [OpenAudio_s.js API](./OPENAUDIO_S.md) — Sequential player
- [OpenAudio.js API](./OPENAUDIO.md) — Single-clip player
- [Feature Comparison](./COMPARISON.md) — Which library to use
- [Main README](../README.md) — OpenAudio suite overview

---

*Last updated: March 2026 — v2.6.0*
