# OpenAudio Suite — Feature Comparison

**Quick Answer:** Use **OpenAudio_r.js** for ambient/randomized audio; **OpenAudio_s.js** for sequential; **OpenAudio.js** for UI sounds and one-shots.

---

## Side-by-Side Comparison

| Feature | OpenAudio_r.js | OpenAudio_s.js | OpenAudio.js | Notes |
|---------|---|---|---|---|
| **Clips** | Multiple | Multiple | Single | r: 3–1000+; s: ordered list; single: one file |
| **Scheduling** | Random with delays | Sequential | On-demand | r: 3–5 sec between; s: manual or auto-advance; single: plays when called |
| **Shuffle Bag** | ✅ Yes | ❌ No | ❌ N/A | r: each clip plays once per cycle |
| **Inter-Clip Delays** | ✅ Configurable | ❌ No | ❌ N/A | r: minTime/maxTime (milliseconds) |
| **Volume Control** | ✅ `setVolume()` | ❌ No | ✅ Constructor | r: runtime; single: constructor only |
| **Navigation** | ❌ No | ✅ goto/gotoLabel | ❌ No | s: jump to any clip in sequence |
| **Callbacks** | `onPlay`, `onEnd`, `onCycleReset` | `onPlay`, `onEnd`, `onComplete` | `onPlay`, `onEnd`, `onHidden`, `onVisible` | r: cycle events; s: completion; single: tab focus |
| **Background Tab Detection** | ✅ Yes (recalculates) | ❌ No | ✅ Yes (pause/resume) | r: timing resilient; single: smart pause |
| **Add Clips at Runtime** | ✅ `addClip()` | ❌ No | ❌ No | r only |
| **Stop/Pause/Resume** | ✅ Yes/No/No | ✅ Yes/Yes/Yes | ✅ Yes/No/No (pauseOnHidden) | All can stop; s & single have pause |
| **Format Support Check** | ✅ `canPlay()` | ✅ `canPlay()` | ✅ `canPlay()` | Static method in all |
| **SPA Cleanup** | ✅ `destroy()` | ✅ `destroy()` | ✅ `destroy()` | Essential for React/Vue/Svelte |
| **File Size (Minified)** | ~9 KB | ~5 KB | ~5 KB | Uncompressed |
| **Gzipped** | ~3 KB | ~2 KB | ~2 KB | Network transfer size |
| **Dependencies** | None | None | None | Pure HTML5 Audio API |
| **Browser Support** | Chrome 70+, FF 65+, Safari 12+, Edge 79+, iOS 12+ | Same | Same | All modern browsers |
| **Mobile** | ✅ iOS & Android | ✅ iOS & Android | ✅ iOS & Android | All mobile-friendly |

---

## Use Case Decision Tree

```
START

Q1: Do you need to play multiple audio clips?
├─ YES: Continue to Q2
└─ NO: Go to "Use OpenAudio.js" (below)

Q2: Do you want clips to play in a randomized schedule?
├─ YES (random): Go to "Use OpenAudio_r.js" (below)
├─ NO (ordered): Continue to Q3

Q3: Do you need manual or auto-advance control?
├─ YES: Go to "Use OpenAudio_s.js" (below)
└─ NO: Go to "Use OpenAudio_r.js" (below)

================

USE OpenAudio_r.js IF:
  ✓ Ambient soundscapes (forest, rain, wind)
  ✓ Game background music cycling
  ✓ Random sound effects (footsteps, birds, etc.)
  ✓ Binaural beats or meditation audio
  ✓ Randomized event sounds (explosions, impacts)
  ✓ Audio with long inter-clip delays (5–30 seconds)

DO NOT use OpenAudio_r.js IF:
  ✗ You only have one audio file
  ✗ You want precise timing (< 1 second differences)
  ✗ You need crossfading or audio effects (DSP)
  ✗ You need clips in a specific order

================

USE OpenAudio_s.js IF:
  ✓ Tutorials or guided tours (narration chapters)
  ✓ Interactive stories (click to advance)
  ✓ Audiobook or podcast player
  ✓ Narrated presentations (slide audio)
  ✓ Language lessons (sequential sentences)
  ✓ You need clips in a fixed order
  ✓ You want manual or auto-advance control

DO NOT use OpenAudio_s.js IF:
  ✗ You only have one audio file
  ✗ You need randomized playback
  ✗ You need complex inter-clip scheduling

================

USE OpenAudio.js IF:
  ✓ UI sounds (button clicks, hovers)
  ✓ Notifications and alerts
  ✓ Single chimes or bells
  ✓ Victory/failure fanfares
  ✓ Narration or dialogue tracks
  ✓ Sound effects on specific actions
  ✓ Game audio that pauses when tab loses focus
  ✓ One sound at a time

DO NOT use OpenAudio.js IF:
  ✗ You need multiple clips playing in rotation
  ✗ You need inter-clip scheduling
  ✗ You need long ambient soundscapes

================

GRADUATE TO WEB AUDIO API IF:
  • You need crossfading between clips
  • Scheduling must be frame-perfect (hardware clock)
  • You need real-time DSP (reverb, EQ, compression)
  • You need frequency analysis or visualization
  • You're building a full DAW or music player
```

---

## Detailed Comparison By Category

### Playback Control

**OpenAudio_r.js:**
```javascript
engine.start()        // Begin randomized playback
engine.stop()         // Pause mid-cycle
engine.reset()        // Stop & clear played flags
engine.start()        // Resume/restart

// Volume mid-playback
engine.setVolume(0.5)
```

**OpenAudio.js:**
```javascript
player.play()         // Play the clip (or replay if ended)
player.stop()         // Pause & rewind to start
player.play()         // Replay from start (or resume if paused)

// Volume in constructor, not changeable at runtime
const player = new SingleAudio('sound.mp3', { volume: 0.8 });
```

**Verdict:** OpenAudio_r.js offers more runtime control; OpenAudio.js is simpler.

---

### Scheduling & Timing

**OpenAudio_r.js:**
```javascript
const engine = new AudioEngine(clips, {
  lowTime: 3,        // Min 3 seconds
  maxTime: 8         // Max 8 seconds between clips
});

// Random clip every 3–8 seconds, shuffled
// Background tab throttling mitigation included
```

**OpenAudio.js:**
```javascript
const player = new SingleAudio('sound.mp3');

// Play on demand, no inter-clip delays
// Intended for immediate playback
```

**Verdict:** OpenAudio_r.js for ambient; OpenAudio.js for reactive.

---

### Memory & Performance

**Both:**
- Negligible CPU impact
- No external dependencies
- Lightweight

| Scenario | OpenAudio_r.js | OpenAudio.js |
|----------|---|---|
| 1 clip looped | Overkill | Perfect |
| 3 clips ambient | Perfect | Suboptimal |
| 10 UI sounds | Overkill | Perfect |
| 50-clip scheduler | Perfect | Impossible |

---

### Flexibility

**OpenAudio_r.js:**
- ✅ Add clips at runtime: `engine.addClip()`
- ✅ Change volume mid-playback: `engine.setVolume()`
- ✅ Inspect state: `engine.isStarted`, `engine.isPlaying`
- ✅ Get cycle completion notice: `onCycleReset` callback

**OpenAudio.js:**
- ✅ Basic control: play/stop
- ✅ Inspect: `player.isPlaying`
- ✅ Callbacks: `onPlay`, `onEnd`
- ❌ Can't add clips (single file only)
- ❌ Can't change volume at runtime

**Verdict:** OpenAudio_r.js is more flexible; OpenAudio.js is more predictable.

---

## Code Size Comparison

### Simple Example

**OpenAudio_r.js** (with 3 clips):
```javascript
const engine = new AudioEngine([
  { src: 'sound1.mp3', label: 'S1' },
  { src: 'sound2.mp3', label: 'S2' },
  { src: 'sound3.mp3', label: 'S3' }
], {
  lowTime: 3,
  maxTime: 5,
  onPlay: (clip) => console.log(clip.label)
});

document.addEventListener('click', () => engine.start(), { once: true });
// 7 lines of code
// 9 KB library
```

**OpenAudio.js** (single clip):
```javascript
const player = new SingleAudio('sound.mp3', {
  label: 'Click',
  onPlay: () => console.log('Playing')
});

document.addEventListener('click', () => player.play());
// 5 lines of code
// 4 KB library
```

**Total project size:**
- OpenAudio_r.js: ~9 KB
- OpenAudio.js: ~4 KB
- Both: ~13 KB
- Both gzipped: ~4.5 KB

---

## Real-World Scenarios

### Scenario 1: Game with Ambient Audio + UI Sounds

**Problem:** Game needs forest ambience (random bird calls, wind, rustling) AND button click feedback.

**Solution:** Use both libraries.

```javascript
// Ambient
const ambience = new AudioEngine([
  { src: 'birds.mp3' },
  { src: 'wind.mp3' },
  { src: 'rain.mp3' }
], {
  lowTime: 5,
  maxTime: 15,
  volume: 0.6
});

// UI
const clickSound = new SingleAudio('ui/click.mp3', { volume: 0.8 });

// Start ambience, add UI sounds
document.addEventListener('click', () => ambience.start(), { once: true });
document.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => clickSound.play());
});
```

---

### Scenario 2: Music Player App

**Problem:** Need to play background music, handle play/pause, show current track.

**Not ideal for either library.** OpenAudio.js plays single clips but can't swap tracks; OpenAudio_r.js is for ambient/random.

**Better solution:** Use Web Audio API or a music library.

---

### Scenario 3: Notification System

**Problem:** Different sound for each notification type (email, message, alert).

**Solution:** Use OpenAudio.js with multiple instances.

```javascript
const sounds = {
  email: new SingleAudio('notif/email.mp3'),
  message: new SingleAudio('notif/message.mp3'),
  alert: new SingleAudio('notif/alert.mp3')
};

function notify(type, message) {
  sounds[type].play();
  showNotification(message);
}
```

---

### Scenario 4: Meditation App

**Problem:** Ambient binaural beats with occasional bell chimes.

**Solution:** Use both libraries.

```javascript
// Binaural beats (looped ambience)
const beats = new AudioEngine([
  { src: 'binaural/isochronic-40hz.mp3' }
], {
  lowTime: 30,
  maxTime: 60,
  volume: 0.7
});

// Session timer bell (every 5 minutes)
const bell = new SingleAudio('bell.mp3', { volume: 0.9 });

beats.start();

setInterval(() => {
  bell.play(); // Ring bell every 5 min
}, 5 * 60 * 1000);
```

---

### Scenario 5: Narrator-Driven Story Game

**Problem:** Narration tracks play sequentially, each followed by a specific delay.

**OpenAudio.js solution:**
```javascript
const narration = new SingleAudio('story/narration-1.mp3', {
  onEnd: () => {
    console.log('Narration 1 done, waiting...');
    setTimeout(() => {
      narration2.play();
    }, 2000); // 2 sec pause
  }
});

narration.play();
```

This works but is a bit manual. OpenAudio_r.js is not ideal either (it randomizes).

**Better:** Sequential playlist logic, or Web Audio API.

---

## Migration & Mixing

### Can You Use Both?

**Yes!** They don't conflict.

```javascript
const ambience = new AudioEngine([...]);  // Multiple clips
const uiClick = new SingleAudio('click'); // Single clip

// Both can run simultaneously
ambience.start();
document.addEventListener('click', () => {
  uiClick.play();
});
```

---

### Upgrading from OpenAudio.js to OpenAudio_r.js

If you outgrow single-clip playback:

```javascript
// Old (OpenAudio.js)
const sound = new SingleAudio('sound.mp3');
document.addEventListener('click', () => sound.play());

// New (OpenAudio_r.js)
const engine = new AudioEngine([
  { src: 'sound1.mp3', label: 'S1' },
  { src: 'sound2.mp3', label: 'S2' },
  { src: 'sound3.mp3', label: 'S3' }
]);
document.addEventListener('click', () => engine.start(), { once: true });
```

API is intentionally similar (both have `play()`, callbacks, `destroy()`, etc.), so migration is straightforward.

---

## Summary Decision Table

| Your Situation | Recommendation | Why |
|---|---|---|
| Button click sound | OpenAudio.js | Simple, fits perfectly |
| Multiple UI sounds | OpenAudio.js (multiple instances) | Lightweight, reactive |
| Ambient forest sounds | OpenAudio_r.js | Designed for this exact use case |
| Random background music | OpenAudio_r.js | Shuffle bag + scheduling |
| Both ambient + UI | Both | Use each for its purpose |
| Multiple music tracks, playlists | Web Audio API | Neither library designed for this |
| Real-time audio effects | Web Audio API | HTML5 Audio can't do DSP |
| Precise sub-second timing | Web Audio API | Need hardware clock |
| Mobile notification sound | OpenAudio.js | Simple, autoplay-safe |
| Game sound effects loop | OpenAudio_r.js | Perfect for randomization |

---

## When to Graduate to Web Audio API

Use **Web Audio API** (not OpenAudio) when you need:

1. **Crossfading**
   - Fade out one clip, fade in the next
   - OpenAudio can't do this (abrupt transitions only)

2. **Sub-second precision**
   - Timing must be frame-perfect (60 FPS)
   - OpenAudio uses `setTimeout`, which is throttled

3. **Real-time DSP**
   - Reverb, EQ, compression, distortion
   - OpenAudio is audio routing only

4. **Advanced scheduling**
   - Sequenced playback with complex logic
   - Multiple simultaneous playback with timing synchronization

5. **Analysis & visualization**
   - Frequency spectrum, waveform display
   - Loudness detection

**Cost:** Web Audio API requires more setup, especially on mobile (AudioContext unlock boilerplate).

---

## Summary

- **OpenAudio_r.js:** For ambient, randomized, or scheduled audio (games, soundscapes)
- **OpenAudio.js:** For UI sounds and single-clip playback (buttons, notifications)
- **Both:** Can be used together in the same project
- **Web Audio API:** For advanced features (effects, visualization, precise timing)

---

*Last updated: March 2025*
