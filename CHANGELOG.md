# Changelog

All notable changes to the OpenAudio suite are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## v2.5.0 – 2026-03-15
### Improvements
- Added consistent **semantic versioning** strategy across releases.
- Added **package-lock.json** to support reproducible installs and GitHub Actions CI.
- No changes to OpenAudio JS files; all improvements are tooling and release management.

---

## OpenAudio.js

### [1.1.0] — 2025-03-15

#### Added
- **Background tab detection** — Listens to Page Visibility API (`document.visibilitychange`)
- **`pauseOnHidden` option** — Pause audio when tab hides, resume when tab returns
- **`onHidden` callback** — Fires when tab becomes hidden
- **`onVisible` callback** — Fires when tab becomes visible
- **`#boundVisibility` bound listener** — Proper cleanup prevents stale listeners in SPAs

#### Fixed
- Stale visibilitychange listeners in SPA environments (React, Vue, Svelte, etc.)
- Listener cleanup in `destroy()` now removes the exact function reference

#### Changed
- Class renamed: `SingleAudio` → `OpenAudio` (matches filename)
- Improved documentation with background tab behavior examples

---

### [1.0.0] — 2025-01-15

#### Added
- Initial release: Single-clip, one-shot player
- Silent MP3 unlock for autoplay policy compliance
- `onPlay` and `onEnd` callbacks
- `destroy()` method for SPA cleanup
- `canPlay()` static format checking
- Complete API documentation

---

## OpenAudio_s.js

### [1.0.0] — 2025-01-15

#### Added
- Initial release: Sequential playlist player
- Click-to-advance playback control
- Jump to clip by index or label
- Pause/resume support
- Progress tracking
- Complete API documentation with usage patterns

---

## OpenAudio_r.js

### [2.4.0] — 2025-03-15

### Added
- **`#isUnlocking` flag** — Prevents duplicate unlock attempts when `start()` is called rapidly (spam-clicks). The unlock play() is async; without this flag, a race condition allowed multiple overlapping unlock sequences.
- **`destroy()` method** — Removes the `visibilitychange` listener. Essential for SPAs (React, Vue, Svelte, etc.) where engine instances are created and destroyed across component lifecycles. Without it, stale listeners accumulate on `document` and defunct engines wake up on every tab-focus event.
- **`AudioEngine.canPlay(type)` static method** — Wraps `HTMLAudioElement.canPlayType()` with a clean boolean return. Use to check browser support for `.ogg`, `.wav`, or `.flac` before constructing an engine, rather than discovering a silent failure at play() time.
- **Callback resilience for `onCycleReset`** — Wrapped in try/catch, matching the existing resilience applied to `onPlay` and `onEnd`. A throwing `onCycleReset` can no longer stall the engine loop.
- **Comprehensive documentation** — Added HTML5 AUDIO vs. WEB AUDIO API comparison, browser autoplay policy deep-dive, background tab throttling mitigation, and callback resilience guarantees.

### Fixed
- Race condition where spam-clicking `start()` could trigger multiple `#scheduleNext()` calls before the first unlock completed.
- Potential memory leak: `visibilitychange` listener now properly removed on `destroy()`.

### Changed
- Better error messages in console (include clip label and context).

### Documentation
- Added CHANGELOG.md (this file)
- Expanded README with better examples and API reference
- Created CONTRIBUTING.md with PR guidelines and testing checklist

---

## [2.3.0] — 2025-02-20

### Added
- **Clip src validation** — Constructor and `addClip()` now verify that every clip has a non-empty string `src`. Previously a clip with missing or non-string `src` would silently map `undefined` into the engine, producing a confusing audio error rather than a clear failure at the point of entry.
- **Next-clip prefetch** — `#scheduleNext()` now sets `#audio.src` to the next selected clip immediately after the current clip ends, before the inter-clip delay fires. The browser begins buffering the file during the gap, eliminating the network fetch delay at `#playNext()` time. The clip is still marked played and selected at schedule time, preserving shuffle-bag correctness.
- **Background tab throttling mitigation** — `#scheduleNext()` records the wall-clock time (`#timerSetAt`) and delay duration (`#timerDelay`). A `visibilitychange` listener fires when the tab returns to foreground. If elapsed time meets or exceeds the intended delay, the pending timer is cancelled and `#playNext()` is called immediately. Otherwise, the remaining time is rescheduled precisely.

### Fixed
- Network latency no longer visible as gaps between clips (prefetch eliminates fetch delay).
- Background tab throttling no longer causes clips to bunch together on tab return (recalculation uses wall-clock time, not timer promises).

### Changed
- Improved console logging for debugging background tab behavior.

---

## [2.2.0] — 2025-01-10

### Added
- **`reset()` method** — Stops playback, clears all `played` flags, and optionally resets the current clip. Next `start()` begins a completely fresh random cycle.
- **`setVolume()` method** — Updates volume immediately on live playback and all future clips. Clamps to [0, 1].

### Fixed
- Volume no longer resets to default on clip transition.

---

## [2.1.0] — 2024-12-05

### Added
- **`addClip(clip)` method** — Add new clips to the engine at runtime without reconstructing.
- **Cycle-boundary repeat prevention** — When the unplayed pool is empty (cycle reset), the next clip is selected from all clips *except* the current clip, preventing the same clip from playing twice in a row across a cycle boundary.

### Fixed
- Shuffle bag now correctly prevents the same clip from playing at the start and end of successive cycles.

---

## [2.0.0] — 2024-10-01

### Added
- **Public API methods** — `start()`, `stop()`, `start()` for public control.
- **Lifecycle callbacks** — `onPlay(clip)`, `onEnd(clip)`, `onCycleReset()` for integration with game/app logic.
- **Options object** — `lowTime`, `maxTime`, `volume`, and callback configuration.
- **Shuffle bag algorithm** — Guarantees each clip plays exactly once per cycle before repeats.
- **Browser autoplay policy handling** — Silent base64 MP3 unlock on first `start()` call, subsequent clips scheduled via `setTimeout`.
- **Background tab throttling mitigation** — Page Visibility API monitoring and wall-clock delay recalculation.

### Documentation
- Comprehensive JSDoc comments throughout
- Browser compatibility notes
- Web Audio API vs. HTML5 Audio comparison
- Usage examples in code comments

---

## [1.0.0] — 2024-09-01

### Initial Release
- Self-contained randomized audio scheduling engine
- No dependencies, no external libraries
- HTML5 `<audio>` element-based scheduling
- Basic shuffle bag implementation
- Mobile-compatible (respects autoplay policies)

---

## Upgrade Guide

### 2.3 → 2.4
- **No breaking changes.** New features are additive.
- **Recommended:** Call `engine.destroy()` when tearing down in SPAs to prevent listener accumulation.
- **New:** Use `AudioEngine.canPlay('audio/ogg')` to check format support before constructing.

### 2.2 → 2.3
- **No breaking changes.** Prefetch is transparent.
- **Benefit:** Faster clip transitions due to network prefetch during inter-clip gap.

### 2.0 → 2.1
- **No breaking changes.** New methods are additive.
- **New:** Cycle-boundary repeat prevention automatically enabled.

### 1.0 → 2.0
- **Breaking:** Old version had no public API. Complete rewrite with methods and callbacks.
- **Migration:** Wrap old code in a new `AudioEngine` constructor.

---

## Future Considerations

These features are **out of scope** for OpenAudio_r.js (it would violate the "self-contained, no dependencies" principle):

- Crossfading between clips
- Sub-second precision scheduling
- Real-time DSP effects (reverb, EQ, compression)
- Frequency analysis or visualization

For these, consider graduating to the **Web Audio API**. See README.md for comparison.

---

## Contributing

Have a feature request or bug to report? See [CONTRIBUTING.md](./CONTRIBUTING.md).

All contributions will be credited in the changelog.

---

## License

OpenAudio_r.js is licensed under the GNU General Public License v3.0 or later. See [LICENSE](./LICENSE) for details.

---

*Last updated: March 15, 2025*
