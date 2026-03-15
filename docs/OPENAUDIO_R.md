# OpenAudio_r.js API Reference

**Version:** 2.4.0  
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
  lowTime:  3000,    // Min delay between clips (ms)
  maxTime:  5000,    // Max delay between clips (ms)
  volume:   0.8,
  onPlay:   () => console.log('Playing'),
  onEnd:    () => console.log('Finished'),
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
  label: 'Clip Name'         // Optional: name for logging
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
  { src: 'ambient/rain.mp3', label: 'Rain Sounds' }
]);

// With data URIs
const engine = new AudioEngine([
  { src: 'data:audio/mp3;base64,SUQzBA...', label: 'Embedded' }
]);
```

#### `options` (object, optional)

```javascript
{
  lowTime:       3000,      // Min delay (ms), default: 3000
  maxTime:       5000,      // Max delay (ms), default: 5000
  volume:        0.8,       // Volume 0.0–1.0, default: 1.0
  onPlay:        fn,        // Callback when clip starts
  onEnd:         fn,        // Callback when clip ends
  onCycleReset:  fn         // Callback when cycle resets
}
```

**All options are optional.**

---

## Public Methods

### `start()`

Begin playback. Must be called inside a user gesture on first use.

```javascript
// First call (inside gesture - REQUIRED)
document.addEventListener('click', () => engine.start(), { once: true });

// Subsequent calls
engine.start();  // Safe to call anytime
```

**Behavior:**
- If already playing: ignored (safe)
- If stopped: resumes cycle from next clip
- First call: plays silent unlock MP3, then starts scheduling

**Browser Autoplay Policy:**
- ✅ Works: click, keydown, touchstart, mousedown
- ❌ Doesn't work: scroll, page load, setTimeout

---

### `stop()`

Stop playback and reset the engine.

```javascript
engine.stop();
```

**Behavior:**
- Pauses current clip
- Resets timer
- Next `start()` begins a fresh cycle

```javascript
engine.start();     // Playing clip
engine.stop();      // Stopped
engine.start();     // Starts new cycle
```

---

### `setVolume(value)`

Change volume during playback (runtime control).

```javascript
engine.setVolume(0.5);  // 50% volume
engine.setVolume(1.0);  // Full volume
```

**Parameter:**
- `value` (number) — Volume 0.0–1.0
- Clamped to valid range automatically

**Example:**
```javascript
// Volume slider
document.getElementById('volume-slider').addEventListener('input', (e) => {
  engine.setVolume(e.target.value / 100);
});
```

---

### `addClip(src, label)`

Add a clip to the engine at runtime.

```javascript
engine.addClip('audio/new-clip.mp3');
engine.addClip('audio/new-clip.mp3', 'New Sound');
```

**Parameters:**
- `src` (string) — Audio URL or data URI
- `label` (string, optional) — Name for logging

**Behavior:**
- New clip is added to the shuffle bag
- Takes effect on next cycle
- Doesn't interrupt current playback

---

### `destroy()`

Clean up and remove listeners (essential for SPAs).

```javascript
engine.destroy();
```

**Behavior:**
- Removes visibilitychange listener
- Stops playback
- Releases audio element
- After this, don't call other methods

**React Example:**
```javascript
useEffect(() => {
  const engine = new AudioEngine([...]);
  return () => engine.destroy();  // Clean up on unmount
}, []);
```

---

### `canPlay(type)` — Static Method

Check if browser supports a format.

```javascript
if (AudioEngine.canPlay('audio/ogg')) {
  // Use .ogg files
} else {
  // Use .mp3 fallback
}
```

**Supported types:**
- `'audio/mpeg'` or `'audio/mp3'` — MP3
- `'audio/ogg'` — OGG Vorbis
- `'audio/wav'` — WAV
- `'audio/webm'` — WebM
- `'audio/flac'` — FLAC

---

## Public Properties

### `isStarted`

**Type:** `boolean` (read-only)

`true` if engine is currently running, `false` if stopped.

```javascript
const engine = new AudioEngine([...]);

console.log(engine.isStarted);  // false
engine.start();
console.log(engine.isStarted);  // true
engine.stop();
console.log(engine.isStarted);  // false
```

---

## Callbacks

### `onPlay()`

Called when a clip **starts** playback.

```javascript
const engine = new AudioEngine([...], {
  onPlay: () => {
    console.log('Clip started');
    updateUI('playing');
  }
});
```

**Timing:** Fires after silent unlock completes.

**Error handling:** Errors are caught and logged. A throwing `onPlay` won't stall the engine.

```javascript
onPlay: () => {
  throw new Error('Oops!');  // Caught, logged, won't break engine
}
```

---

### `onEnd()`

Called when a clip **finishes naturally** (reaches end).

Does **not** fire if you call `stop()` before clip ends.

```javascript
const engine = new AudioEngine([...], {
  onEnd: () => {
    console.log('Clip finished, scheduling next');
  }
});
```

**Timing:** Fires after clip ends, before next clip's delay starts.

**Error handling:** Same as `onPlay()` — errors are caught.

---

### `onCycleReset()`

Called when all clips have played and the shuffle bag resets (new cycle begins).

```javascript
const engine = new AudioEngine(
  [
    { src: 'clip1.mp3', label: 'One' },
    { src: 'clip2.mp3', label: 'Two' },
    { src: 'clip3.mp3', label: 'Three' }
  ],
  {
    onCycleReset: () => {
      console.log('Completed full cycle, starting again');
    }
  }
);
```

**Behavior:**
- Fires when all N clips have played once
- Shuffle bag is reset with same N clips
- Cycle can start with any clip (no repeat rule)
- Clip that ended current cycle won't be first clip of next cycle (unless only 1 clip)

**Error handling:** Wrapped in try/catch (v2.4.0+).

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
❌ Random repetition: [A, A, B, C, A]
```

**Benefits:**
- Prevents same clip twice in a row
- Guarantees variety within a cycle
- Feels more natural than pure random

---

## Background Tab Throttling Mitigation

Browsers throttle timers in background tabs. This engine detects and compensates.

**Example:**
- You set `maxTime: 5000` (5-second max delay)
- Tab goes to background for 10 seconds
- When tab returns, engine recalculates
- If 5+ seconds have elapsed, next clip plays immediately
- Otherwise, remaining time is scheduled

**Result:** Audio doesn't bunch up when tab returns.

---

## Usage Patterns

### Ambient Soundscape (Game)

```javascript
const ambient = new AudioEngine([
  { src: 'ambient/wind.mp3', label: 'Wind' },
  { src: 'ambient/birds.mp3', label: 'Birds' },
  { src: 'ambient/rustling.mp3', label: 'Rustling' }
], {
  lowTime:  2000,
  maxTime:  8000,
  volume:   0.6,
  onCycleReset: () => console.log('Ambient cycle complete')
});

// Start on game begin
startButton.addEventListener('click', () => ambient.start());
```

---

### Dynamic Volume Control

```javascript
const engine = new AudioEngine([...], { volume: 0.5 });

// Slider control
volumeSlider.addEventListener('input', (e) => {
  engine.setVolume(e.target.value / 100);
});

// Fade out on game pause
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
  engine.addClip(sound.path, sound.name);
});
```

---

### React Component

```javascript
import { useEffect } from 'react';
import AudioEngine from './OpenAudio_r.js';

export default function AmbientPlayer() {
  useEffect(() => {
    const engine = new AudioEngine([
      { src: 'audio/clip1.mp3', label: 'One' },
      { src: 'audio/clip2.mp3', label: 'Two' }
    ], {
      onPlay: () => setIsPlaying(true),
      onEnd: () => setIsPlaying(false)
    });

    document.addEventListener('click', () => engine.start(), { once: true });

    return () => engine.destroy();  // Clean up on unmount
  }, []);

  return <div>Audio Engine Ready</div>;
}
```

---

## Troubleshooting

### Audio Won't Play (Silent)

**Problem:** `start()` is called but nothing happens.

**Causes:**
1. Called outside a user gesture
2. CORS or mixed-content issue
3. Browser doesn't support audio format
4. Audio file doesn't exist (404)

**Solutions:**
```javascript
// ✅ Correct: inside gesture
document.addEventListener('click', () => engine.start(), { once: true });

// ❌ Wrong: no gesture
setTimeout(() => engine.start(), 1000);

// ✅ Check format support
if (!AudioEngine.canPlay('audio/ogg')) {
  // Use .mp3 instead
}
```

---

### "NotAllowedError" in Console

**Problem:** `NotAllowedError: play() failed due to autoplay policy`

**Cause:** `start()` not called inside a user gesture.

**Solution:** Wrap `start()` in a click, keydown, or touch event.

---

### Stale Listeners in React

**Problem:** Multiple engine instances leave listeners behind.

**Cause:** Not calling `destroy()` on unmount.

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
- **CPU:** Minimal (just HTML5 Audio API)

Creating multiple engines is fine:
```javascript
const forest = new AudioEngine([...]);
const city = new AudioEngine([...]);
const space = new AudioEngine([...]);
// All three use minimal resources
```

---

## Changelog

### v2.4.0 (March 2025)
- `#isUnlocking` flag prevents spam-click race conditions
- `destroy()` method removes listeners properly (SPA fix)
- `canPlay()` static format checking
- `onCycleReset` callback wrapped in try/catch
- Comprehensive documentation

### v2.3.0 (February 2025)
- Clip src validation
- Next-clip prefetch (eliminates network gaps)
- Background tab throttling mitigation
- Wall-clock time recalculation

### v2.2.0 (January 2025)
- True private fields (#)
- NotAllowedError handling
- Silent base64 unlock
- `setVolume()` runtime control

### v2.1.0 (December 2024)
- Single reusable Audio element
- Mobile autoplay fix (iOS)
- `stop()` race condition fix

### v2.0.0 (October 2024)
- Initial public release
- Shuffle bag algorithm
- Callbacks (onPlay, onEnd, onCycleReset)
- `addClip()` runtime insertion

---

## License

GNU General Public License v3.0 or later. See [LICENSE](../LICENSE).

---

## See Also

- [OpenAudio_s.js API](./OPENAUDIO_S.md) — Sequential player
- [OpenAudio.js API](./OPENAUDIO.md) — Single-clip player
- [Feature Comparison](./COMPARISON.md) — Which library to use
- [Main README](../README.md) — OpenAudio suite overview

---

*Last updated: March 2025*
