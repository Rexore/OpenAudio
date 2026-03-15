# OpenAudio Suite

A family of **zero-dependency, browser-native audio utilities** for web projects. Choose the library that fits your use case.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL_3.0-blue.svg)](./LICENSE)
[![No Dependencies](https://img.shields.io/badge/Dependencies-None-brightgreen)]()

---

## 📚 Libraries in This Suite

### **OpenAudio_r.js** — Randomized Scheduler
*For ambient, looped, or randomized audio playback*

```javascript
const engine = new AudioEngine([
  { src: 'ambient/forest.mp3', label: 'Forest' },
  { src: 'ambient/rain.mp3',   label: 'Rain' },
  { src: 'ambient/birds.mp3',  label: 'Birds' }
]);

// Plays clips in random order, every 3–5 seconds
document.addEventListener('click', () => engine.start(), { once: true });
```

**Key Features:**
- 🎲 **Shuffle bag algorithm** — Each clip plays exactly once per cycle
- 🔄 **Ambient scheduling** — Random inter-clip delays (customizable)
- 📱 **Mobile-friendly** — Handles autoplay policies automatically
- 🌙 **Background tab resilience** — Detects visibility changes, recalculates timing
- 🎛️ **Lifecycle callbacks** — `onPlay`, `onEnd`, `onCycleReset`
- ⚙️ **Runtime control** — Add clips, set volume, stop/start mid-cycle

**Best for:** Games, ambient soundscapes, randomized audio environments, binaural beats, background music

**Version:** 2.4.0  
**File:** `OpenAudio_r.js` (~9 KB, 3 KB gzipped)

---

### **OpenAudio.js** — Simple Player
*For single-clip, one-shot audio playback*

```javascript
const player = new SingleAudio('audio/chime.mp3', {
  volume: 0.8,
  onPlay: () => console.log('Playing'),
  onEnd:  () => console.log('Done')
});

document.getElementById('btn').addEventListener('click', () => player.play());
```

**Key Features:**
- ▶️ **One-shot playback** — Plays a single audio file once
- 🔁 **Replayable** — Call `play()` again to replay from start
- ⏹️ **Stop control** — Pause and rewind mid-playback
- 📱 **Same autoplay unlock** — Same silent MP3 unlock as OpenAudio_r
- 🎛️ **Callbacks** — `onPlay`, `onEnd` for lifecycle control
- 🛠️ **SPA-safe** — `destroy()` method for clean component teardown

**Best for:** UI sounds, chimes, notifications, button clicks, single music tracks, sound effects

**Version:** 1.0.0  
**File:** `OpenAudio.js` (~4 KB, 1.5 KB gzipped)

---

## Quick Comparison

| Feature | OpenAudio_r.js | OpenAudio.js |
|---------|---|---|
| **Clips** | Multiple | Single |
| **Scheduling** | Random with delays | One-shot on demand |
| **Shuffle Bag** | ✅ Yes | ❌ N/A |
| **Volume Control** | ✅ `setVolume()` | ✅ Constructor option |
| **Callbacks** | `onPlay`, `onEnd`, `onCycleReset` | `onPlay`, `onEnd` |
| **Background Tab Detection** | ✅ Yes | ❌ No inter-clip gaps |
| **File Size** | ~9 KB | ~4 KB |
| **Use Case** | Ambient, scheduling | UI sounds, one-shots |

---

## Installation

### Option 1: Direct Script Tags
```html
<!-- Use OpenAudio_r.js for scheduling -->
<script src="OpenAudio_r.js"></script>

<!-- Or use OpenAudio.js for single clips -->
<script src="OpenAudio.js"></script>

<!-- Or both, if you need both in the same project -->
<script src="OpenAudio_r.js"></script>
<script src="OpenAudio.js"></script>
```

### Option 2: ES6 Modules
```javascript
import { AudioEngine } from './OpenAudio_r.js';
import { SingleAudio } from './OpenAudio.js';
```

### Option 3: npm (when published)
```bash
npm install openaudio-suite
```

```javascript
import { AudioEngine, SingleAudio } from 'openaudio-suite';
```

---

## Use Case Decision Tree

**Do you need to play multiple clips in a randomized/looped sequence?**  
→ Yes: Use **OpenAudio_r.js** (randomized scheduler)  
→ No: Continue below

**Do you need to play one audio file on demand (UI sound, notification, chime)?**  
→ Yes: Use **OpenAudio.js** (simple player)  
→ No: Neither library may be the right fit

**Need frame-perfect scheduling, crossfading, or real-time DSP effects?**  
→ Graduate to the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

## API Reference

### OpenAudio_r.js (AudioEngine)

```javascript
// Constructor
const engine = new AudioEngine(clips, options);

// Public Methods
engine.start()                    // Unlock & begin playback
engine.stop()                     // Pause (preserve position)
engine.reset()                    // Stop & clear played flags
engine.setVolume(level)           // Set volume (0–1)
engine.addClip(clip)              // Add clip at runtime
engine.destroy()                  // Clean up listeners (SPA teardown)
AudioEngine.canPlay(type)         // Static: check format support

// Public Properties
engine.isStarted                  // Boolean
engine.isPlaying                  // Boolean

// Constructor Options
{
  lowTime:      3,               // Min seconds between clips (default: 3)
  maxTime:      5,               // Max seconds between clips (default: 5)
  volume:       0.8,             // Volume 0–1 (default: 0.8)
  onPlay:       (clip) => {},    // Fired when clip starts
  onEnd:        (clip) => {},    // Fired when clip ends
  onCycleReset: () => {}         // Fired when all clips played once
}
```

See [`OpenAudio_r.js` documentation](./docs/OPENAUDIO_R.md) for detailed API.

---

### OpenAudio.js (SingleAudio)

```javascript
// Constructor
const player = new SingleAudio(src, options);

// Public Methods
player.play()                     // Unlock & play the clip
player.stop()                     // Pause & rewind
player.destroy()                  // Clean up (SPA teardown)
SingleAudio.canPlay(type)         // Static: check format support

// Public Properties
player.isPlaying                  // Boolean

// Constructor Options
{
  volume:  1.0,                  // Volume 0–1 (default: 1.0)
  label:   'My Sound',           // Display name for console warnings
  onPlay:  () => {},             // Fired when playback starts
  onEnd:   () => {}              // Fired when playback ends
}
```

See [`OpenAudio.js` documentation](./docs/OPENAUDIO.md) for detailed API.

---

## Examples

### OpenAudio_r.js — Ambient Game Loop

```javascript
const ambientClips = [
  { src: 'wind-1.mp3', label: 'Wind Gust 1' },
  { src: 'wind-2.mp3', label: 'Wind Gust 2' },
  { src: 'leaves.mp3', label: 'Rustling Leaves' },
  { src: 'distant-bird.mp3', label: 'Distant Bird' }
];

const ambience = new AudioEngine(ambientClips, {
  lowTime: 5,
  maxTime: 15,
  volume: 0.6,
  onPlay: (clip) => console.log(`Ambient: ${clip.label}`),
  onCycleReset: () => console.log('Ambient cycle reset')
});

// Start on first user interaction
document.addEventListener('click', () => ambience.start(), { once: true });

// Stop when game pauses
function onGamePause() { ambience.stop(); }
function onGameResume() { ambience.start(); } // Must be in user event
```

### OpenAudio.js — UI Sound Effects

```javascript
const uiSounds = {
  click:   new SingleAudio('ui/click.mp3', { volume: 0.7, label: 'Click' }),
  hover:   new SingleAudio('ui/hover.mp3', { volume: 0.5, label: 'Hover' }),
  error:   new SingleAudio('ui/error.mp3', { volume: 0.8, label: 'Error' }),
  success: new SingleAudio('ui/success.mp3', { volume: 0.9, label: 'Success' })
};

// Attach to UI elements
document.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    uiSounds.click.play();
    // ... handle click
  });
  
  btn.addEventListener('mouseenter', (e) => {
    uiSounds.hover.play();
  });
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  Object.values(uiSounds).forEach(sound => sound.destroy());
});
```

### Combined: Game with Ambient + UI Sounds

```javascript
// Ambient soundscape
const ambience = new AudioEngine([
  { src: 'ambient/forest.mp3', label: 'Forest' },
  { src: 'ambient/rain.mp3', label: 'Rain' }
], { lowTime: 10, maxTime: 20, volume: 0.5 });

// UI sounds
const clickSound = new SingleAudio('ui/click.mp3', { volume: 0.8 });
const victorySound = new SingleAudio('ui/victory.mp3', { volume: 1.0 });

// Start ambient on game start (inside a gesture)
document.getElementById('start-game').addEventListener('click', () => {
  ambience.start();
  victorySound.play(); // Play fanfare
});

// Play click on button press
document.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => clickSound.play());
});
```

---

## Browser Compatibility

Both libraries require:
- **HTML5 Audio element support** (universal in modern browsers)
- **User gesture** for first audio playback (autoplay policy)

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 70+ | ✅ Full support |
| Firefox | 65+ | ✅ Full support |
| Safari | 12+ | ✅ Full support |
| Edge | 79+ | ✅ Full support |
| iOS Safari | 12+ | ✅ Full support |
| Chrome Android | Latest | ✅ Full support |

---

## Troubleshooting

### Audio Won't Play
**Issue:** Silent autoplay or "NotAllowedError"

**Solution:** Call `play()` or `start()` **synchronously inside a user event handler** (click, keydown, touchstart).

```javascript
// ✅ Correct
document.addEventListener('click', () => engine.start());

// ❌ Wrong (not in gesture)
setTimeout(() => engine.start(), 1000);
```

### Slow Clip Transitions
**Issue:** First clip takes a while to start when you press play

**Solution (OpenAudio_r.js):** This is network prefetch during inter-clip gaps. File buffers during the delay, so subsequent clips are faster. Use precompressed audio or serve from a CDN.

### Background Tab Gaps
**Issue (OpenAudio_r.js only):** When you return from another tab, clips bunch together

**Solution:** The engine detects tab visibility and recalculates delays using wall-clock time. If a large gap occurred, the next clip plays immediately on tab return. This is by design.

### Memory Leaks in SPAs
**Issue:** Creating/destroying engines rapidly causes memory bloat

**Solution:** Always call `destroy()` when removing an engine instance.

```javascript
// React
useEffect(() => {
  const engine = new AudioEngine(clips);
  return () => engine.destroy(); // Clean up on unmount
}, []);
```

---

## Performance & Sizing

| Library | Minified | Gzipped | Runtime Memory |
|---------|----------|---------|---|
| OpenAudio_r.js | ~9 KB | ~3 KB | < 1 MB (10 clips) |
| OpenAudio.js | ~4 KB | ~1.5 KB | < 100 KB |
| Both | ~13 KB | ~4.5 KB | < 2 MB (combined) |

No external dependencies. Pure HTML5 Audio API.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Bug report guidelines
- Feature request process
- Code style & testing checklist
- PR submission process

---

## License

Both libraries are licensed under **GNU General Public License v3.0 or later**.

See [LICENSE](./LICENSE) for the full text.

**Commercial use permitted** — You must include the license and copyright notice. Derivative works must also be GPL-3.0-or-later.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

**Current Versions:**
- OpenAudio_r.js: **2.4.0** (March 2025)
- OpenAudio.js: **1.0.0** (March 2025)

---

## Made with ❤️ by Rexore

Have questions? Open a GitHub Issue or Discussion.

---

## FAQ

**Q: Can I use both libraries in the same project?**  
A: Yes! They don't conflict. Use `AudioEngine` for ambient/looped audio and `SingleAudio` for UI sounds.

**Q: Which one should I use?**  
A: Use the [decision tree](#use-case-decision-tree) above, or: random scheduling → OpenAudio_r.js; one-shot sounds → OpenAudio.js.

**Q: Do I need npm or a build system?**  
A: No. Both libraries work as plain `<script>` tags. No dependencies, no bundler needed.

**Q: Can I modify these for my project?**  
A: Yes, under GPL-3.0. Include the license and note your changes.

**Q: What's the difference between this and Web Audio API?**  
A: These libraries use simple, mobile-friendly HTML5 Audio. Web Audio API gives you crossfading, real-time DSP, and frame-perfect scheduling, but with more setup and mobile complexity. See the [comparison table](#quick-comparison) and README files for details.

**Q: Can I use this commercially?**  
A: Yes. GPL-3.0 allows commercial use. You must provide source code and include the license.

---

## Resources

- 📖 [HTML5 Audio Element — MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio)
- 🎛️ [Web Audio API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- 🎮 [Browser Autoplay Policy — Chrome Blog](https://developer.chrome.com/blog/autoplay/)
- 📱 [Page Visibility API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)

---

## Directory Structure

```
OpenAudio/
├── OpenAudio_r.js           # Randomized scheduler (2.4.0)
├── OpenAudio.js             # Single-clip player (1.0.0)
├── README.md                # This file
├── LICENSE                  # GPL-3.0-or-later
├── CONTRIBUTING.md          # How to contribute
├── CHANGELOG.md             # Version history
├── .gitignore               # Git ignore rules
├── package.json             # npm metadata
├── /docs                    # Detailed documentation
│   ├── OPENAUDIO_R.md       # OpenAudio_r.js API reference
│   ├── OPENAUDIO.md         # OpenAudio.js API reference
│   └── COMPARISON.md        # Feature comparison & use cases
└── /examples                # HTML demo files
    ├── ambient-scheduler.html
    ├── ui-sounds.html
    └── combined-game.html
```
