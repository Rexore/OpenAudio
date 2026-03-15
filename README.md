# OpenAudio Suite

A family of **zero-dependency, browser-native audio utilities** for web projects. Choose the library that fits your use case.

![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)
[![No Dependencies](https://img.shields.io/badge/Dependencies-None-brightgreen)]()

### npm i openaudio-suite

---

## Three Libraries in This Suite

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

**Version:** 2.4.0 | **File:** `OpenAudio_r.js` (~9 KB, 3 KB gzipped)

---

### **OpenAudio_s.js** — Sequential Playlist
*For click-to-advance or auto-play sequential audio*

```javascript
const player = new SequentialAudio([
  { src: 'intro.mp3', label: 'Introduction' },
  { src: 'chapter1.mp3', label: 'Chapter 1' },
  { src: 'chapter2.mp3', label: 'Chapter 2' }
], {
  autoAdvance: false  // Require click to advance
});

document.addEventListener('click', () => player.play(), { once: true });
document.getElementById('next-btn').addEventListener('click', () => player.next());
```

**Key Features:**
- ▶️ **Sequential playback** — Plays clips in fixed order
- 🖱️ **Manual or auto-advance** — User controls pacing or auto-play
- 🔀 **Jump & navigation** — Goto clip by index or label
- ⏸️ **Play/pause/resume** — Full transport controls
- 📊 **Progress tracking** — Know your current position in sequence

**Version:** 1.0.0 | **File:** `OpenAudio_s.js` (~5 KB, 2 KB gzipped)

---

### **OpenAudio.js** — Simple Player
*For single-clip, one-shot audio playback with background tab awareness*

```javascript
const player = new OpenAudio('audio/chime.mp3', {
  volume: 0.8,
  pauseOnHidden: true,  // Pause when tab loses focus
  onPlay:   () => console.log('Playing'),
  onEnd:    () => console.log('Done'),
  onHidden: () => console.log('Tab hidden'),
  onVisible: () => console.log('Tab visible')
});

document.getElementById('btn').addEventListener('click', () => player.play());
```

**Key Features:**
- ▶️ **One-shot playback** — Plays a single audio file once
- 🔁 **Replayable** — Call `play()` again to replay from start
- ⏹️ **Stop control** — Pause and rewind mid-playback
- 🔍 **Background tab detection** — Detects when tab loses/regains focus
- ⏸️ **Smart pause/resume** — Optional pause on background, resume on return
- 📱 **Same autoplay unlock** — Silent MP3 unlock as others

**Version:** 1.1.0 | **File:** `OpenAudio.js` (~5 KB, 2 KB gzipped)

---

## Quick Comparison

| Feature | OpenAudio_r.js | OpenAudio_s.js | OpenAudio.js |
|---------|---|---|---|
| **Clips** | Multiple | Multiple | Single |
| **Order** | Random | Sequential | N/A |
| **Scheduling** | Delays between clips | Manual or auto-advance | On-demand |
| **Shuffle Bag** | ✅ Yes | ❌ No | ❌ N/A |
| **Navigation** | ❌ No | ✅ Goto/label jump | ❌ N/A |
| **Volume Control** | ✅ Runtime | ❌ Constructor | ✅ Constructor |
| **Callbacks** | onPlay, onEnd, onCycleReset | onPlay, onEnd, onComplete | onPlay, onEnd, onHidden, onVisible |
| **Pause/Resume** | ❌ No | ✅ Yes | ✅ Yes (pauseOnHidden) |
| **Background Tab Detection** | ✅ Yes | ❌ No | ✅ Yes |
| **File Size** | ~9 KB | ~5 KB | ~5 KB |
| **Use Case** | Ambient, randomized | Guided tours, tutorials, stories | UI sounds, notifications, game audio |

---

## Use Case Decision Tree

```
START

Q1: How many audio clips do you need?
├─ ONE: Use OpenAudio.js (Single-clip player)
└─ MULTIPLE: Continue to Q2

Q2: What order should clips play?
├─ RANDOM: Use OpenAudio_r.js (Randomized scheduler)
├─ SEQUENTIAL: Continue to Q3
└─ ON-DEMAND: Use OpenAudio.js (one instance per sound)

Q3: How should users advance through the sequence?
├─ MANUAL CLICKS: Use OpenAudio_s.js with autoAdvance: false
├─ AUTO-ADVANCE: Use OpenAudio_s.js with autoAdvance: true
└─ NO CONTROL: Use OpenAudio_r.js

Q4: Do you need frame-perfect scheduling or effects?
├─ YES: Graduate to Web Audio API
└─ NO: You're set!
```

---

## Installation

### Option 1: Direct Script Tags
```html
<!-- Use whichever you need -->
<script src="OpenAudio_r.js"></script>  <!-- Randomized scheduler -->
<script src="OpenAudio_s.js"></script>  <!-- Sequential player -->
<script src="OpenAudio.js"></script>    <!-- Single-clip player -->

<!-- Or combine as needed -->
<script src="OpenAudio_s.js"></script>
<script src="OpenAudio.js"></script>
```

### Option 2: ES6 Modules
```javascript
import { AudioEngine } from './OpenAudio_r.js';
import { SequentialAudio } from './OpenAudio_s.js';
import { SingleAudio } from './OpenAudio.js';
```

### Option 3: npm (when published)
```bash
npm install openaudio-suite
```

```javascript
import { AudioEngine, SequentialAudio, SingleAudio } from 'openaudio-suite';
```

---

## Examples

### Scenario 1: Game with Ambient + UI Sounds

```javascript
// Ambient soundscape
const ambience = new AudioEngine([
  { src: 'forest.mp3' },
  { src: 'rain.mp3' }
], { lowTime: 5, maxTime: 15, volume: 0.6 });

// UI sounds
const clickSound = new SingleAudio('ui/click.mp3', { volume: 0.8 });

// Start
document.addEventListener('click', () => ambience.start(), { once: true });
document.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => clickSound.play());
});
```

---

### Scenario 2: Narrated Story with Pause/Resume

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
document.getElementById('pause-btn').addEventListener('click', () => story.pause());
document.getElementById('resume-btn').addEventListener('click', () => story.resume());
```

---

### Scenario 3: Tutorial with Auto-Advance

```javascript
const tutorial = new SequentialAudio([
  { src: 'intro.mp3', label: 'Intro' },
  { src: 'step1.mp3', label: 'Step 1' },
  { src: 'step2.mp3', label: 'Step 2' }
], {
  autoAdvance: true,  // Auto-play next step
  onPlay: (clip) => highlightStep(clip.label),
  onComplete: () => showCertificate()
});

document.getElementById('start-tutorial').addEventListener('click', () => {
  tutorial.play();
});
```

---

### Scenario 4: Notification System

```javascript
const sounds = {
  email: new SingleAudio('email.mp3'),
  message: new SingleAudio('message.mp3'),
  alert: new SingleAudio('alert.mp3')
};

function notify(type, message) {
  sounds[type].play();
  showNotification(message);
}
```

---

## Browser Compatibility

All three libraries require:
- **HTML5 Audio element support** (universal)
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

## API Quick Reference

### OpenAudio_r.js (AudioEngine)
```javascript
engine.start()          // Begin playback
engine.stop()           // Pause
engine.reset()          // Stop & reset cycle
engine.setVolume(0.5)   // Set volume
engine.addClip(clip)    // Add clip at runtime
engine.destroy()        // Cleanup
```

See [OPENAUDIO_R.md](./docs/OPENAUDIO_R.md) for full API.

---

### OpenAudio_s.js (SequentialAudio)
```javascript
player.play()              // Start playback
player.next()              // Advance to next clip
player.goto(index)         // Jump to clip by index
player.gotoLabel(label)    // Jump to clip by label
player.pause()             // Pause
player.resume()            // Resume from pause
player.stop()              // Stop & rewind
player.reset()             // Reset to start
player.destroy()           // Cleanup
```

See [OPENAUDIO_S.md](./docs/OPENAUDIO_S.md) for full API.

---

### OpenAudio.js (SingleAudio)
```javascript
player.play()     // Play the clip
player.stop()     // Stop & rewind
player.destroy()  // Cleanup
```

See [OPENAUDIO.md](./docs/OPENAUDIO.md) for full API.

---

## Troubleshooting

### Audio Won't Play
**Cause:** Not called inside a user gesture.
**Fix:** Call `play()` or `start()` inside a click, keydown, or touchstart handler.

```javascript
// ✅ Correct
document.addEventListener('click', () => player.play());

// ❌ Wrong
setTimeout(() => player.play(), 1000);
```

---

### "NotAllowedError" in Console
**Cause:** Autoplay policy blocked playback.
**Fix:** Same as above — use a user gesture.

---

### Multiple Libraries in Same Project
**No problem!** They don't conflict.

```javascript
const ambience = new AudioEngine([...]);    // OpenAudio_r.js
const story = new SequentialAudio([...]);   // OpenAudio_s.js
const click = new SingleAudio('sound.mp3'); // OpenAudio.js

// All three can run simultaneously
```

---

## Performance & Sizing

| Scenario | Size | Memory |
|----------|------|--------|
| OpenAudio_r.js only | 9 KB | < 1 MB |
| OpenAudio_s.js only | 5 KB | < 150 KB |
| OpenAudio.js only | 4 KB | < 100 KB |
| All three combined | ~18 KB | < 2 MB |
| All three gzipped | ~6.5 KB | — |

No external dependencies. Pure HTML5 Audio API.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Bug reports
- Feature requests
- Code style
- Testing checklist
- PR guidelines

---

## License

All libraries are licensed under **Apache-2.0**.

See [LICENSE](./LICENSE) for the full text.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

**Current Versions:**
- OpenAudio_r.js: **2.4.0** (March 2025)
- OpenAudio_s.js: **1.0.0** (March 2025)
- OpenAudio.js: **1.0.0** (March 2025)

---

## Documentation

- 📖 [OpenAudio_r.js API](./docs/OPENAUDIO_R.md) — Randomized scheduler
- 📖 [OpenAudio_s.js API](./docs/OPENAUDIO_S.md) — Sequential player
- 📖 [OpenAudio.js API](./docs/OPENAUDIO.md) — Single-clip player
- 📊 [Feature Comparison](./docs/COMPARISON.md) — Detailed comparison
- 💻 [Examples](./examples/) — Working demos

---

Have questions? Open a GitHub Issue or Discussion.

---

## FAQ

**Q: Can I use all three in the same project?**  
A: Yes! They complement each other and don't conflict.

**Q: Do I need a build system?**  
A: No. All work as plain `<script>` tags. No bundler needed.

**Q: Can I modify these?**  
A: Yes, under GPL-3.0. Include the license and note your changes.

**Q: Commercial use?**  
A: Yes. GPL-3.0 allows commercial use. You must provide source code and include the license.

**Q: What about Web Audio API?**  
A: These libraries use HTML5 Audio. Web Audio API is for advanced features (effects, visualization, frame-perfect timing). See [COMPARISON.md](./docs/COMPARISON.md).

---

## Resources

- 📖 [HTML5 Audio — MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio)
- 🎛️ [Web Audio API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- 🎮 [Browser Autoplay Policy — Chrome Blog](https://developer.chrome.com/blog/autoplay/)
- 📱 [Page Visibility API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)

---

*Last updated: March 2025*
