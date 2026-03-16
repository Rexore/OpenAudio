# Changelog

All notable changes to the OpenAudio suite are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

---

## OpenAudio.js

### [1.3.0] — 2026-03-16

#### Fixed
- **`#isUnlocked` flag** — The silent-MP3 unlock is now performed only once per instance. Previously, every `play()` call (including replays) re-ran the full unlock dance: discarding all buffered/preloaded audio, reassigning `src` to the silent MP3, awaiting the Promise, then restoring the real `src`. This meant the constructor's `preload = 'auto'` was silently wasted on every play. From 1.3.0, subsequent `play()` calls skip directly to `#playClip()` — preloaded data is preserved and replay latency is eliminated.
- **`#playCancelled` flag** — `stop()` now plants a cancellation token that the in-flight unlock `.then()` checks before calling `#playClip()`. Previously, calling `stop()` during an async unlock was a race: the `.then()` would resolve ~50–200 ms later and start the clip anyway, overriding the explicit stop.
- **`isPlaying` encapsulation** — `isPlaying` is now a private field (`#isPlaying`) exposed via a read-only getter. Previously a plain public property, it could be written by callers to silently corrupt the state machine.
- **`#isPlaying` race in `#playClip()`** — `#isPlaying` is now set `true` synchronously before `#audio.play()`, closing the double-play race window where a rapid second `play()` call between the `.play()` call and its `.then()` resolution could bypass the guard and attempt concurrent playback. `#isPlaying` is reverted in `.catch()` on failure.
- **`resume()` race in `#onVisibilityChange()`** — The visibility-restore `.play()` path now uses the same pre-set/revert pattern. Previously, a concurrent `stop()` in the `.then()` window could leave `isPlaying = true` after `stop()` had set it to `false`.
- **`destroy()` resource release** — Uses `removeAttribute('src')` + `load()` per the WHATWG HTMLMediaElement resource-release spec, replacing `src = ''` which can fire spurious `error` events on some browsers.
- **`#pausedByVisibility` in `destroy()`** — Now reset to `false` during teardown for consistent state.
- **Removed unreachable optional chain** — `this.#audio?.pause()` in `#playClip()` `.then()` was unreachable since `#isDestroyed` implies `destroy()` already paused; removed to avoid misleading readers.

---

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
- Stale `visibilitychange` listeners in SPA environments
- Listener cleanup in `destroy()` now removes the exact function reference

#### Changed
- Class renamed: `SingleAudio` → `OpenAudio` (matches filename)

---

### [1.0.0] — 2026-03-16

#### Added
- Initial release: single-clip, one-shot player
- Silent MP3 unlock for autoplay policy compliance
- `onPlay` and `onEnd` callbacks
- `destroy()` method for SPA cleanup
- `canPlay()` static format checking

---

## OpenAudio_s.js

### [1.3.0] — 2026-03-16

#### Fixed
- **`#playCancelled` flag** — `stop()` and `reset()` now plant a cancellation token that the in-flight silent-MP3 unlock `.then()` checks before calling `#playClip()`. Previously, calling `reset()` or `stop()` during the ~50–200 ms unlock window was silently ignored: the unlock `.then()` would fire unconditionally and start the first clip regardless. The fix mirrors the pattern introduced in `OpenAudio.js` 1.3.0.

#### Changed
- **Usage example** — `goto(getCurrentIndex() - 1)` in the guided-tour example now uses `Math.max(0, …)`, preventing a spurious out-of-range `console.warn` when the user is already on clip 0.

#### Documentation
- `stop()` method note updated to describe both the auto-advance timer cancellation (v1.2.0) and the new unlock cancellation (v1.3.0).
- `play()` JSDoc updated with a design note explaining that `#isStarted` becomes `true` after the unlock resolves (inside `#playClip()`), and why this intentionally differs from `OpenAudio_r.js`.

---

### [1.2.0] — 2026-03-16

#### Fixed
- **`isPlaying` + `isStarted` encapsulation** — Both are now private fields (`#isPlaying`, `#isStarted`) exposed via read-only getters. Previously plain public properties, they could be written by callers to silently corrupt the state machine and all navigation guards.
- **`#isPlaying` / `#isStarted` race in `#playClip()`** — Both flags are now set `true` synchronously before `#audio.play()`, closing the double-play race window where a rapid `next()` or `goto()` between the `.play()` call and its `.then()` resolution could bypass guards and abort a starting clip. `#isPlaying` is reverted in `.catch()` on failure.
- **`#advanceTimer`** — The auto-advance `setTimeout` handle is now stored and cleared by `stop()`, `reset()`, and `destroy()`. Previously, calling `stop()` or `reset()` during the advance delay window could not cancel the pending `next()`, causing the next clip to start after an explicit stop.
- **`resume()` race** — `#isPlaying` is now set `true` synchronously before `#audio.play()` in `resume()`, then reverted in `.catch()`. Previously the `.then()` could set `isPlaying = true` after a concurrent `stop()` had already set it to `false`.
- **`destroy()` resource release** — Uses `removeAttribute('src')` + `load()` per the WHATWG HTMLMediaElement resource-release spec, replacing `src = ''`.
- **`getCurrentClip()` live reference** — Now returns a shallow copy `({ ...clip })` instead of a direct reference to the internal clip object. Callers can no longer mutate the internal playlist via the returned object.
- **`getClips()` live references** — Now deep-copies inner objects via `map(c => ({ ...c }))`. Previously the shallow spread copied the array but left inner object references live.
- **Removed unreachable optional chain** — `this.#audio?.pause()` in `#playClip()` `.then()` removed.

---

### [1.1.0] — 2026-03-16

#### Fixed
- **Unlock now plays on the shared `#audio` element** — Same root cause as `OpenAudio.js` 1.2.0.
- **`play()` guard extended** — Now checks `isStarted` in addition to `isPlaying` and `#isUnlocking`.
- **`next()` / `goto()` / `gotoLabel()` guard** — All return immediately if `!isStarted`.
- **`pause()` / `resume()` guard** — Both check `isStarted` before touching the Audio element.
- **`destroy()` teardown** — `ended` listener removed via stored `#endedHandler` reference before `#audio` is nulled.
- **`#isDestroyed` flag** — All public methods are safe no-ops after `destroy()`.

#### Added
- `advanceDelay` option (default `0.5s`) — replaces the hardcoded 500ms gap between auto-advance clips.

---

### [1.0.0] — 2026-03-16

#### Added
- Initial release: sequential playlist player
- Click-to-advance playback control
- Jump to clip by index (`goto()`) or label (`gotoLabel()`)
- Pause/resume support
- Progress tracking (`getCurrentClip()`, `getCurrentIndex()`, `getClipCount()`)

---

## OpenAudio_r.js

### [2.6.0] — 2026-03-16

#### Fixed
- **`TypeError` for invalid arguments** — All constructor and `addClip()` validation throws changed from `Error` to `TypeError`. This matches the ECMAScript convention that type-mismatch errors should be `TypeError`, and aligns with `OpenAudio.js` and `OpenAudio_s.js`. Callers catching errors via `instanceof TypeError` now correctly catch `AudioEngine` validation failures.

#### Changed
- **`#isStarted` timing** — `#isStarted` is now set `true` inside the unlock `.then()` (after the Audio element is confirmed usable), not at the top of `start()` before the unlock. The duplicate-start guard during the unlock window continues to be handled by `#isUnlocking`. This aligns the state machine semantics with `OpenAudio_s.js`.
- **`try/catch` formatting** — Three compact single-line `try/catch` blocks (in the `onended` handler, `#resetCycle()`, and `#playNext()` `.then()`) expanded to multi-line style, matching the formatting convention used throughout the suite.

---

### [2.5.0] — 2026-03-16

#### Fixed
- **`isStarted` + `isPlaying` encapsulation** — Both are now private fields (`#isStarted`, `#isPlaying`) exposed via read-only getters. Previously plain public properties, they could be written by callers to silently corrupt the scheduling state machine and all internal guards.
- **`#isDestroyed` flag** — All public methods (`start`, `stop`, `reset`, `setVolume`, `addClip`, `destroy`) now return immediately after `destroy()` has been called, making post-destroy calls safe no-ops. Previously `destroy()` documented post-destroy behaviour as "undefined"; in practice, calling `start()` after `destroy()` would silently re-run the engine without a `visibilitychange` listener, leaving it in a partially torn-down state.
- **`destroy()` resource release** — Now releases the Audio element via `removeAttribute('src')` + `load()` per the WHATWG HTMLMediaElement resource-release spec, then nulls `#audio`. Previously the element was kept live with its src intact after `destroy()`.
- **`#isPlaying` race in `#playNext()`** — `#isPlaying` is now set `true` synchronously before `#audio.play()`, closing the narrow race window where `isPlaying` reported `false` while audio was starting. Reverted in `.catch()` on failure.

---

### [2.4.1] — 2026-03-16

#### Changed
- Licence changed from GPL-3.0-or-later to Apache-2.0 across the entire suite.

---

### [2.4.0] — 2026-03-16

#### Added
- `#isUnlocking` flag — prevents duplicate unlock attempts on rapid `start()` calls.
- `destroy()` method — removes the `visibilitychange` listener.
- `AudioEngine.canPlay(type)` static method.
- `onCycleReset` callback wrapped in try/catch.

#### Fixed
- Race condition on `start()` spam.
- Potential memory leak: `visibilitychange` listener now properly removed.

---

### [2.3.0] — 2026-03-16

#### Added
- Clip `src` validation in constructor and `addClip()`.
- Next-clip prefetch to eliminate network fetch delay.
- Background tab throttling mitigation via wall-clock correction.

---

### [2.2.0] — 2026-03-16

#### Added
- `reset()` method.
- `setVolume()` method with clamping.
- True private fields (`#`).
- NotAllowedError handling — engine halts rather than silent-loops.
- Silent base64 unlock in `start()`.

---

### [2.1.1] — 2026-03-16

#### Fixed
- Constructor validates `lowTime` and `maxTime`.
- `#scheduleNext()` clears existing timer before setting a new one.
- Cycle-boundary repeat fix.
- `stop()` no longer resets `currentTime`.

---

### [2.1.0] — 2026-03-16

#### Added
- `addClip()` method for runtime updates.
- Cycle-boundary repeat prevention.
- Single reusable Audio element created once in constructor.

---

### [2.0.0] — 2026-03-16

#### Added
- Initial public release. Shuffle bag algorithm. `onPlay` / `onEnd` / `onCycleReset` callbacks. `addClip()` runtime insertion.

---

## Upgrade Guide

### OpenAudio_s.js 1.2 → 1.3
No breaking changes. `stop()` and `reset()` now cancel in-flight unlocks via `#playCancelled`; callers that relied on the previous (unintended) behaviour of the clip starting despite a `stop()` during the unlock window should review their flow, but this was never a documented or safe pattern.

### OpenAudio_r.js 2.5 → 2.6
No breaking changes. `TypeError` is now thrown instead of `Error` for constructor and `addClip()` validation failures. If you catch these via `catch (e)` and check `e.message`, nothing changes. If you check `e instanceof Error` it still holds. Only `instanceof TypeError` (which previously returned `false`) now returns `true`.

### OpenAudio.js 1.2 → 1.3
No breaking changes. `player.isPlaying` is now read-only (getter); existing read access is unaffected. Write access (`player.isPlaying = ...`) was never a supported pattern.

### OpenAudio_s.js 1.1 → 1.2
No breaking changes. `player.isPlaying` and `player.isStarted` are now read-only getters; existing read access is unaffected.

### OpenAudio_r.js 2.4 → 2.5
No breaking changes. `engine.isStarted` and `engine.isPlaying` are now read-only getters; existing read access is unaffected.

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
