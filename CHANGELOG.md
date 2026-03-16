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

### [1.1.0] — 2025-03-15

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

### [1.0.0] — 2025-01-15

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

### [1.0.0] — 2025-01-15

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

### [2.4.0] — 2025-03-15

#### Added
- `#isUnlocking` flag — prevents duplicate unlock attempts when `start()` is called rapidly. The unlock `play()` is async; without this flag a race condition allowed multiple overlapping unlock sequences.
- `destroy()` method — removes the `visibilitychange` listener. Essential for SPAs where engine instances are created and destroyed across component lifecycles.
- `AudioEngine.canPlay(type)` static method — wraps `HTMLAudioElement.canPlayType()` with a clean boolean return. Use to check browser support for `.ogg`, `.wav`, or `.flac` before constructing an engine.
- Callback resilience for `onCycleReset` — wrapped in try/catch, matching the existing resilience applied to `onPlay` and `onEnd`.
- Comprehensive documentation — added HTML5 Audio vs. Web Audio API comparison, autoplay policy deep-dive, background tab throttling mitigation, and callback resilience guarantees.

#### Fixed
- Race condition where spam-clicking `start()` could trigger multiple `#scheduleNext()` calls before the first unlock completed.
- Potential memory leak: `visibilitychange` listener now properly removed on `destroy()`.

#### Changed
- Better error messages in console (include clip label and context).

---

### [2.3.0] — 2025-02-20

#### Added
- Clip `src` validation — constructor and `addClip()` now verify every clip has a non-empty string `src`.
- Next-clip prefetch — `#scheduleNext()` sets `#audio.src` to the next selected clip immediately after the current clip ends, eliminating network fetch delay at `#playNext()` time.
- Background tab throttling mitigation — `#scheduleNext()` records wall-clock time (`#timerSetAt`) and delay duration (`#timerDelay`). A `visibilitychange` listener recalculates and corrects timing on tab return.

#### Fixed
- Network latency no longer visible as gaps between clips.
- Background tab throttling no longer causes clips to bunch on tab return.

#### Changed
- Improved console logging for debugging background tab behaviour.

---

### [2.2.0] — 2025-01-10

#### Added
- `reset()` method — stops playback, clears all played flags. Next `start()` begins a fresh random cycle.
- `setVolume()` method — updates volume immediately on live playback and all future clips. Clamps to [0, 1].

#### Fixed
- Volume no longer resets to default on clip transition.

---

### [2.1.0] — 2024-12-05

#### Added
- `addClip(clip)` method — add new clips at runtime without reconstructing the engine.
- Cycle-boundary repeat prevention — the clip that ended a cycle cannot immediately start the next one.

#### Fixed
- Shuffle bag now correctly prevents the same clip playing at the end and start of successive cycles.

---

### [2.0.0] — 2024-10-01

#### Added
- Public API — `start()`, `stop()`, lifecycle callbacks `onPlay`, `onEnd`, `onCycleReset`.
- Options object — `lowTime`, `maxTime`, `volume`, and callback configuration.
- Shuffle bag algorithm — guarantees each clip plays exactly once per cycle before repeats.
- Browser autoplay policy handling — silent base64 MP3 unlock on first `start()` call.
- Background tab throttling mitigation — Page Visibility API monitoring and wall-clock delay recalculation.
- Comprehensive JSDoc, browser compatibility notes, Web Audio API comparison, and usage examples.

---

### [1.0.0] — 2024-09-01

#### Added
- Initial release: self-contained randomised audio scheduling engine
- No dependencies, HTML5 `<audio>`-based scheduling
- Basic shuffle bag implementation
- Mobile-compatible autoplay policy handling

---

## Upgrade Guide

### OpenAudio.js 1.1 → 1.2
No breaking changes. Fixes are internal.
- If you were working around the iOS unlock bug manually, remove the workaround — it is now handled correctly.
- Ensure `destroy()` is called on component unmount in SPAs.

### OpenAudio_s.js 1.0 → 1.1
No breaking changes. Fixes are internal.
- `advanceDelay` is now configurable (default `0.5s`). Set explicitly if you relied on the hardcoded value.
- Ensure `destroy()` is called on component unmount in SPAs.

### OpenAudio_r.js 2.4 → 2.4.1
No breaking changes. Licence header update only.

### OpenAudio_r.js 2.3 → 2.4
No breaking changes. New features are additive.
- Recommended: call `engine.destroy()` when tearing down in SPAs.
- New: use `AudioEngine.canPlay('audio/ogg')` to check format support before constructing.

### OpenAudio_r.js 2.2 → 2.3
No breaking changes. Prefetch is transparent.

### OpenAudio_r.js 2.0 → 2.1
No breaking changes. New methods are additive.

### OpenAudio_r.js 1.0 → 2.0
**Breaking:** old version had no public API. Complete rewrite with methods and callbacks.

---

## Future Considerations

These features are intentionally out of scope for the OpenAudio suite (they would require external dependencies or the Web Audio API):

- Crossfading between clips
- Sub-second precision scheduling
- Real-time DSP effects (reverb, EQ, compression)
- Frequency analysis or visualisation

For these, consider graduating to the Web Audio API. See README.md for a comparison.

---

## Contributing

Have a feature request or bug to report? See [CONTRIBUTING.md](https://github.com/Rexore/OpenAudio/blob/main/CONTRIBUTING.md).

All contributions will be credited in the changelog.

---

## License

All OpenAudio libraries are licensed under the **Apache License 2.0**. See [LICENSE](https://github.com/Rexore/OpenAudio/blob/main/LICENSE) for details.

---

*Last updated: March 2026*
