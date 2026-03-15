# OpenAudio.js API Reference

**Version:** 1.1.0  
**Class:** `OpenAudio`  
**Use Case:** Single-clip, one-shot audio playback with background tab awareness

---

## Quick Start

```javascript
// Create a player
const player = new OpenAudio('audio/chime.mp3', {
  volume: 0.8,
  label: 'Chime',
  pauseOnHidden: true,  // Pause when tab loses focus
  onPlay: () => console.log('Playing'),
  onEnd: () => console.log('Done'),
  onHidden: () => console.log('Tab hidden'),
  onVisible: () => console.log('Tab visible')
});

// Play on user interaction
document.getElementById('btn').addEventListener('click', () => player.play());
```

---

## Constructor

```javascript
new OpenAudio(src, options)
```

### Parameters

#### `src` (string, required)
Path or data URI to your audio file.

```javascript
// File path
new OpenAudio('audio/sound.mp3');

// Absolute URL
new OpenAudio('https://cdn.example.com/audio/sound.mp3');

// Data URI (embedded, no external file)
new OpenAudio('data:audio/mp3;base64,SUQzBA...');
```

#### `options` (object, optional)

```javascript
{
  volume:        0.8,              // Number: 0.0–1.0 (default: 1.0)
  label:         'My Sound',       // String: display name for console messages
  pauseOnHidden: false,            // Boolean: pause when tab hides (default: false)
  onPlay:        () => {},         // Function: called when playback starts
  onEnd:         () => {},         // Function: called when playback ends
  onHidden:      () => {},         // Function: called when tab becomes hidden
  onVisible:     () => {}          // Function: called when tab becomes visible
}
```

**All options are optional.** You can pass an empty object `{}` or omit it entirely.

### Constructor Examples

```javascript
// Minimal
const player = new OpenAudio('audio/click.mp3');

// With volume
const player = new OpenAudio('audio/click.mp3', { volume: 0.5 });

// With callbacks
const player = new OpenAudio('audio/victory.mp3', {
  volume: 0.9,
  label: 'Victory Fanfare',
  onPlay: () => console.log('Victory sound playing'),
  onEnd: () => console.log('Victory sound finished')
});

// With background tab control
const player = new OpenAudio('audio/ambient.mp3', {
  volume: 0.75,
  label: 'Ambient Sound',
  pauseOnHidden: true,  // Pause when tab loses focus
  onPlay: () => updateUI('sound_playing'),
  onHidden: () => updateUI('background'),
  onVisible: () => updateUI('foreground')
});

// Callbacks without pause-on-hide (just notifications)
const player = new OpenAudio('audio/notification.mp3', {
  onHidden: () => console.log('Tab hidden, audio continues'),
  onVisible: () => console.log('Tab visible again')
});
```

### Constructor Errors

```javascript
// Throws TypeError if src is missing or not a string
new OpenAudio();                    // ❌ TypeError
new OpenAudio(123);                 // ❌ TypeError
new OpenAudio('');                  // ❌ TypeError
new OpenAudio(null);                // ❌ TypeError

// Valid
new OpenAudio('audio.mp3');         // ✅
```

---

## Public Methods

### `play()`

Unlock the audio element (if needed) and play the clip.

**Must be called inside a user gesture on first use.**

```javascript
// First call (inside gesture)
document.addEventListener('click', () => {
  player.play();  // ✅ Starts playback
});

// Subsequent calls
player.play();  // Safe to call anytime
```

**Behavior:**
- If already playing: ignored (safe)
- If paused: resumes from current position
- If finished: restarts from beginning

---

### `stop()`

Stop playback and rewind to the start.

```javascript
player.stop();
```

**Behavior:**
- Pauses the audio
- Rewinds to 0:00
- Sets `isPlaying = false`
- Clears any pause-on-hidden state
- Calling `play()` after restarts from beginning

```javascript
player.play();  // Playing at 2:30
player.stop();  // Paused at 0:00
player.play();  // Restart from 0:00
```

---

### `destroy()`

Remove all listeners and clean up the audio element.

**Call this on SPA component unmount.**

```javascript
player.destroy();
```

**Behavior:**
- Removes the `visibilitychange` listener (prevents stale listeners in SPAs)
- Stops playback
- Releases the audio element
- After this, do not call any other methods

**Why this matters:** Without proper cleanup, listeners accumulate in SPAs:

```javascript
// React example
import { useEffect } from 'react';
import OpenAudio from './OpenAudio.js';

function NotificationSound() {
  useEffect(() => {
    const player = new OpenAudio('notification.mp3');
    return () => player.destroy();  // ✅ Clean up on unmount
  }, []);

  return <button onClick={() => player.play()}>Notify</button>;
}
```

---

### `canPlay(type)` — Static Method

Check if the browser supports a specific audio format.

```javascript
OpenAudio.canPlay(type) → boolean
```

**Parameters:**
- **`type`** (string) — MIME type
  - `'audio/mpeg'` or `'audio/mp3'` — MP3
  - `'audio/ogg'` — OGG Vorbis
  - `'audio/wav'` — WAV
  - `'audio/webm'` — WebM
  - `'audio/flac'` — FLAC

**Returns:** `true` if supported, `false` otherwise

```javascript
// Check support before constructing
if (OpenAudio.canPlay('audio/ogg')) {
  const player = new OpenAudio('audio/sound.ogg');
} else {
  const player = new OpenAudio('audio/sound.mp3');  // Fallback
}
```

---

## Public Properties

### `isPlaying`

**Type:** `boolean` (read-only)

`true` if a clip is actively playing, `false` if paused or stopped.

```javascript
const player = new OpenAudio('audio/sound.mp3');

document.addEventListener('click', () => player.play());

setTimeout(() => {
  if (player.isPlaying) {
    console.log('Still playing');
  } else {
    console.log('Finished or paused');
  }
}, 500);
```

---

## Callbacks

### `onPlay()`

Called when playback **starts** (after the unlock MP3 finishes).

```javascript
const player = new OpenAudio('audio/effect.mp3', {
  onPlay: () => {
    console.log('Playback started');
    updateUI('sound_active');
  }
});
```

**Thrown errors are caught:** Errors in callbacks are logged but don't affect playback.

```javascript
const player = new OpenAudio('audio/effect.mp3', {
  onPlay: () => {
    throw new Error('Oops!');
    // Error logged to console, playback NOT affected
  }
});
```

---

### `onEnd()`

Called when playback **finishes naturally** (clip reaches end).

Does **not** fire if you call `stop()` before the clip ends.

```javascript
const player = new OpenAudio('audio/narration.mp3', {
  onEnd: () => {
    console.log('Narration finished');
    playNextScene();
  }
});
```

**Thrown errors are caught:** Same as `onPlay()`.

---

### `onHidden()` ← **NEW in v1.1.0**

Called when the tab/window **becomes hidden** (user switches tabs, minimizes window, etc.).

```javascript
const player = new OpenAudio('audio/background-music.mp3', {
  onHidden: () => {
    console.log('Tab hidden');
    updateUI('background_mode');
  }
});
```

**Behavior:**
- Fires whenever `document.visibilityState` changes to `'hidden'`
- Fires regardless of `pauseOnHidden` setting
- Useful for updating UI to reflect background state

**Thrown errors are caught:** Same error handling as other callbacks.

---

### `onVisible()` ← **NEW in v1.1.0**

Called when the tab/window **becomes visible** (user returns to the tab).

```javascript
const player = new OpenAudio('audio/background-music.mp3', {
  onVisible: () => {
    console.log('Tab visible');
    updateUI('foreground_mode');
  }
});
```

**Behavior:**
- Fires whenever `document.visibilityState` changes to `'visible'`
- Fires regardless of `pauseOnHidden` setting
- If `pauseOnHidden: true` and the clip was paused, it automatically resumes

**Interaction with `pauseOnHidden`:**
- If `pauseOnHidden: false` → `onVisible` fires but audio keeps playing
- If `pauseOnHidden: true` → `onVisible` fires AND audio automatically resumes

**Thrown errors are caught:** Same as other callbacks.

---

## Background Tab Detection ← **NEW in v1.1.0**

OpenAudio now uses the **Page Visibility API** to detect when the tab loses focus.

### `pauseOnHidden: false` (Default)

Audio keeps playing in the background. Only callbacks fire:

```javascript
const player = new OpenAudio('ambient.mp3', {
  pauseOnHidden: false,  // Default
  onHidden: () => console.log('Tab hidden, audio continues'),
  onVisible: () => console.log('Tab visible')
});

// User plays audio → switches tab → audio keeps playing
// User returns to tab → onVisible fires
```

**Use case:** Background music, ambient sounds where uninterrupted playback is desired.

---

### `pauseOnHidden: true`

Audio automatically pauses when tab hides, resumes when tab returns.

```javascript
const player = new OpenAudio('narration.mp3', {
  pauseOnHidden: true,  // Pause on hide, resume on show
  onHidden: () => console.log('Paused'),
  onVisible: () => console.log('Resumed')
});

// User plays → switches tab → audio pauses at 2:30
// User returns to tab → audio resumes at 2:30
```

**Use case:** Game audio, UI sounds, narration where playback should be tied to app focus.

**Note:** After returning to the tab, the `resume()` call may be silently blocked if the user hasn't interacted with the page since the tab was hidden. This is due to stricter autoplay policies on some browsers.

---

## Usage Patterns

### UI Sounds (Buttons)

```javascript
const clickSound = new OpenAudio('ui/click.mp3', { volume: 0.7 });

document.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    clickSound.play();
    // ... handle button press
  });
});
```

---

### Notifications / Alerts

```javascript
const notificationSound = new OpenAudio('notifications/alert.mp3', {
  volume: 0.9,
  label: 'Alert',
  onEnd: () => console.log('Alert sound finished')
});

function showNotification(message) {
  notificationSound.play();
  // ... show notification UI
}
```

---

### Game Audio with Background Tab Control

```javascript
const gameSound = new OpenAudio('game/explosion.mp3', {
  volume: 0.95,
  pauseOnHidden: true,  // Pause when player switches tabs
  onPlay: () => playExplosionAnimation(),
  onHidden: () => updateGameUI('paused'),
  onVisible: () => updateGameUI('resumed')
});

document.getElementById('fire-btn').addEventListener('click', () => {
  gameSound.play();
});
```

---

### Ambient Background Music

```javascript
const bgMusic = new OpenAudio('music/ambient.mp3', {
  volume: 0.5,
  pauseOnHidden: false,  // Keep playing in background
  onHidden: () => hidePlaybackUI(),
  onVisible: () => showPlaybackUI()
});

window.addEventListener('load', () => {
  bgMusic.play();  // Won't work — must be in gesture
});

// Must be in gesture:
document.addEventListener('click', () => {
  bgMusic.play();
});
```

---

### Hover Feedback

```javascript
const hoverSound = new OpenAudio('ui/hover.mp3', { volume: 0.4 });

document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('mouseenter', () => {
    if (!hoverSound.isPlaying) {
      hoverSound.play();
    }
  });
});
```

---

## Troubleshooting

### Audio Won't Play (Silent)

**Problem:** `play()` is called but nothing happens.

**Causes:**
1. Called outside a user gesture on first use
2. CORS or mixed-content issue (HTTP audio on HTTPS page)
3. Browser doesn't support the audio format
4. Audio file doesn't exist (404 error)

**Solutions:**

```javascript
// ✅ Correct: gesture context
document.addEventListener('click', () => player.play());

// ❌ Wrong: no gesture
setTimeout(() => player.play(), 1000);

// ❌ Wrong: HTTPS page, HTTP audio
new OpenAudio('http://example.com/audio.mp3');  // Mixed content warning

// ✅ Check format support
if (!OpenAudio.canPlay('audio/ogg')) {
  // Fall back to another format
}
```

---

### "NotAllowedError" in Console

**Problem:** Console shows: `DOMException: play() failed because NotAllowedError`

**Cause:** Browser autoplay policy blocked the attempt (not in a user gesture).

**Solution:** Call `play()` only inside a user event handler.

```javascript
// ✅ Correct
document.addEventListener('click', () => player.play());

// ❌ Wrong
window.addEventListener('load', () => player.play());
```

---

### Audio Resumes Fail After Tab Return

**Problem:** Set `pauseOnHidden: true`, but audio doesn't resume when tab returns.

**Cause:** Browser autoplay policy requires a gesture after the tab was inactive.

**Solution:** This is browser behavior. The API will try to resume automatically, but stricter policies may block it silently. As a workaround, prompt the user to click a play button:

```javascript
const player = new OpenAudio('audio.mp3', {
  pauseOnHidden: true,
  onVisible: () => {
    // Try to resume (may be blocked by policy)
    // Provide UI button as fallback
    showPlayButton();
  }
});
```

---

### Can't Replay After Clip Ends

**Problem:** You want to play the same clip twice in a row.

**Solution:** Calling `play()` after `onEnd()` fires will automatically rewind and replay.

```javascript
const player = new OpenAudio('audio/chime.mp3', {
  onEnd: () => {
    console.log('Clip finished');
    // Can call play() immediately to loop
    player.play();
  }
});
```

---

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 70+ | ✅ Full | Autoplay policy: gesture required first time; background tab throttling applies to timers, not audio |
| Firefox 65+ | ✅ Full | Same autoplay policy as Chrome; Page Visibility API fully supported |
| Safari 12+ | ✅ Full | iOS Safari: gesture required; Desktop: autoplay allowed |
| Edge 79+ | ✅ Full | Same as Chrome |
| iOS Safari 12+ | ✅ Full | Gesture required; Page Visibility API supported |
| Chrome Android | ✅ Full | Gesture required; touchstart counts as gesture |

---

## Performance

- **File Size:** ~5 KB (minified)
- **Gzipped:** ~2 KB
- **Runtime Memory:** < 150 KB per instance
- **CPU:** Negligible — just HTML5 Audio element + visibility listening

Creating multiple instances is fine:

```javascript
const sounds = {
  click: new OpenAudio('click.mp3'),
  hover: new OpenAudio('hover.mp3'),
  error: new OpenAudio('error.mp3'),
  success: new OpenAudio('success.mp3')
};

// All four instances < 1 MB total memory
```

---

## Changelog

### v1.1.0 (March 2025)
- **NEW:** Background tab detection via Page Visibility API
- **NEW:** `pauseOnHidden` option — pause on tab hide, resume on show
- **NEW:** `onHidden` callback — fire when tab becomes hidden
- **NEW:** `onVisible` callback — fire when tab becomes visible
- **NEW:** `#boundVisibility` — stored bound reference for clean listener removal
- **IMPROVED:** `destroy()` now removes the visibilitychange listener
- **RENAMED:** Class `SingleAudio` → `OpenAudio` (matches filename)
- **IMPROVED:** Better documentation on background tab behavior

### v1.0.0 (January 2025)
- Initial release
- Silent MP3 unlock for autoplay policy
- `onPlay`, `onEnd` callbacks
- `destroy()` for SPA cleanup
- `canPlay()` format checking

---

## License

GNU General Public License v3.0 or later. See [LICENSE](../LICENSE).

---

## See Also

- [OpenAudio_r.js API](./OPENAUDIO_R.md) — Randomized scheduler
- [OpenAudio_s.js API](./OPENAUDIO_S.md) — Sequential playlist
- [Feature Comparison](./COMPARISON.md) — Decide which library fits
- [Main README](../README.md) — OpenAudio suite overview

---

*Last updated: March 2025*
