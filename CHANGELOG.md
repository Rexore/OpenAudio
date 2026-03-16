# Changelog

All notable changes to the OpenAudio suite are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

---

## OpenAudio.js

### [1.2.0] — 2026-03-16

#### Fixed
- **Unlock now plays on the shared `#audio` element** — Previously the silent MP3 was played on a throwaway `new Audio()`, blessing the wrong element. On iOS Safari this caused `NotAllowedError` for every clip after the first. The shared element is now unlocked directly.
- **`#isDestroyed` flag** — All public methods (`play`, `stop`, `destroy`) are safe no-ops after `destroy()` has been called, preventing throws on the nulled `#audio` element.
- **Double-`destroy()` safe** — Calling `destroy()` more than once no longer throws.
- **`ended` listener stored and removed** — `#endedHandler` is now stored as a named reference and removed in `destroy()`, preventing a callback-into-null race on teardown.
- **`canPlay()` input guard** — Returns `false` for non-string or empty input rather than passing `undefined` to `canPlayType()`.

---

### [1.1.0] — 2026-03-16
#### Added
- Background tab detection via Page Visibility API (`document.visibilitychange`)
- `pauseOnHidden` option — pause audio when tab hides, resume when tab returns
- `onHidden` callback — fires when tab becomes hidden
- `onVisible` callback — fires when tab becomes visible
- `#boundVisibility` bound listener — proper cleanup prevents stale listeners in SPAs

#### Fixed
- Stale `visibilitychange` listeners in SPA environments (React, Vue, Svelte, etc.)
- Listener cleanup in `destroy()` now removes the exact function reference

#### Changed
- Class renamed: `SingleAudio` → `OpenAudio` (matches filename)
- Improved documentation with background tab behaviour examples

---

### [1.0.0] — 2026-03-16

#### Added
- Initial release: single-clip, one-shot player
- Silent MP3 unlock for autoplay policy compliance
- `onPlay` and `onEnd` callbacks
- `destroy()` method for SPA cleanup
- `canPlay()` static format checking
- Complete API documentation

---

## OpenAudio_s.js

### [1.1.0] — 2026-03-16

#### Fixed
- **Unlock now plays on the shared `#audio` element** — Same root cause as `OpenAudio.js` 1.2.0. A throwaway `new Audio()` was used for the unlock, leaving `#audio` unblessed and causing `NotAllowedError` on iOS Safari for every clip after the first.
- **`play()` guard extended** — Now checks `isStarted` in addition to `isPlaying` and `#isUnlocking`. Calling `play()` after a clip ended (when `isPlaying` is `false`) no longer triggered a redundant second unlock mid-sequence.
- **`next()` / `goto()` / `gotoLabel()` guard** — All three now return immediately if `!isStarted`. Calling them before `play()` previously bypassed the unlock entirely and threw `NotAllowedError`.
- **`pause()` / `resume()` guard** — Both now check `isStarted` before touching the Audio element, preventing silent state corruption before the sequence begins.
- **`destroy()` teardown** — The `ended` listener is now removed via a stored `#endedHandler` reference before `#audio` is nulled, preventing a callback-into-null race on teardown.
- **`#isDestroyed` flag** — All public methods are safe no-ops after `destroy()`.

#### Added
- `advanceDelay` option (default `0.5s`) — replaces the hardcoded 500ms gap between auto-advance clips. Configurable at construction time.

---

### [1.0.0] — 2026-03-16

#### Added
- Initial release: sequential playlist player
- Click-to-advance playback control
- Jump to clip by index (`goto()`) or label (`gotoLabel()`)
- Pause/resume support
- Progress tracking (`getCurrentClip()`, `getCurrentIndex()`, `getClipCount()`)
- Complete API documentation with usage patterns

---

## OpenAudio_r.js

### [2.4.1] — 2026-03-16

#### Changed
- Licence changed from GPL-3.0-or-later to Apache-2.0 across the entire suite.

---

### [2.4.0] — 2026-03-16

#### Added
- `#isUnlocking` flag — prevents duplicate unlock attempts when `start()` is called rapidly.
- `destroy()` method — removes the `visibilitychange` listener.
- `AudioEngine.canPlay(type)` static method — wraps `HTMLAudioElement.canPlayType()`.
- Callback resilience for `onCycleReset` — wrapped in try/catch.
- Comprehensive documentation added.

#### Fixed
- Race condition on `start()` spam.
- Potential memory leak: `visibilitychange` listener now properly removed.

#### Changed
- Better error messages in console.

---

### [2.3.0] — 2026-03-16

#### Added
- Clip `src` validation.
- Next-clip prefetch to eliminate network fetch delay.
- Background tab throttling mitigation via wall-clock correction.

#### Fixed
- Network latency gaps and background tab clip "bunching."

#### Changed
- Improved console logging for debugging.

---

### [2.2.0] — 2026-03-16

#### Added
- `reset()` method to clear flags and start a fresh cycle.
- `setVolume()` method with clamping.

#### Fixed
- Volume resetting on clip transition.

---

### [2.1.0] — 2026-03-16

#### Added
- `addClip(clip)` method for runtime updates.
- Cycle-boundary repeat prevention.

#### Fixed
- Shuffle bag logic for successive cycles.

---

### [2.0.0] — 2026-03-16

#### Added
- Public API and Options object.
- Shuffle bag algorithm.
- Autoplay policy handling (silent MP3 unlock).
- Background tab throttling mitigation.
- Comprehensive JSDoc.

---

### [1.0.0] — 2026-03-16

#### Added
- Initial release: self-contained randomised audio scheduling engine.

---

## Upgrade Guide

### OpenAudio.js 1.1 → 1.2
No breaking changes. Fixes are internal.

### OpenAudio_s.js 1.0 → 1.1
No breaking changes. `advanceDelay` is now configurable.

### OpenAudio_r.js 2.4 → 2.4.1
Licence header update only.

### OpenAudio_r.js 2.3 → 2.4
Additive features only.

### OpenAudio_r.js 1.0 → 2.0
**Breaking:** Complete rewrite with methods and callbacks.

---

## Contributing

See [CONTRIBUTING.md](https://github.com/Rexore/OpenAudio/blob/main/CONTRIBUTING.md).

---

## License

Licensed under the **Apache License 2.0**.

---

*Last updated: March 16, 2026*
