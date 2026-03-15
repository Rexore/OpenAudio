# Contributing to OpenAudio Suite

Thank you for considering a contribution to the OpenAudio Suite! Contributions—whether bug reports, feature suggestions, or code—are how these projects improve.

The OpenAudio Suite consists of three libraries:
- **OpenAudio_r.js** (v2.4.0) — Randomized audio scheduler
- **OpenAudio_s.js** (v1.0.0) — Sequential playlist player
- **OpenAudio.js** (v1.1.0) — Single-clip player with background tab detection

## Code of Conduct

This project adheres to the [Contributor Covenant](https://www.contributor-covenant.org/). By participating, you are expected to uphold this code of conduct.

---

## Reporting Bugs

Before submitting a bug report, please:

1. **Check existing issues** — Your bug may already be reported.
2. **Check the browser console** — Paste any errors.
3. **Test in a different browser** — Narrow down the scope.
4. **Read the troubleshooting section** of README.md.

### Bug Report Template

When opening an issue, include:

```markdown
**Describe the bug:**
A clear description of what is broken.

**Steps to reproduce:**
1. I created an engine with clips: [paste code]
2. I clicked the play button...
3. Expected: audio plays
4. Actual: [what actually happens]

**Browser & OS:**
- Browser: Chrome 120 / Firefox 121 / Safari 17
- OS: Windows 11 / macOS 14 / iOS 17

**Console errors:**
(paste any errors from DevTools Console)

**Minimal code example:**
(paste the smallest code snippet that reproduces the bug)
```

---

## Suggesting Features

Have an idea? Open an issue with:

1. **Clear title** — What is the feature?
2. **Motivation** — Why would this be useful?
3. **Proposed API** — How would a user call it?
4. **Alternatives** — Other approaches considered?

Example:

```markdown
**Feature Request: Crossfade between clips**

Currently, clips change abruptly. It would sound more polished if clips 
faded out/in over 500ms.

Proposed API:
engine = new AudioEngine(clips, {
  fadeInDuration: 500,   // ms
  fadeOutDuration: 500   // ms
});

This is a common pattern in game audio engines.
```

**Note:** Feature requests for crossfading, real-time DSP, or sub-second precision 
are better suited to the Web Audio API. OpenAudio_r.js is intentionally simple.

---

## Submitting Code Changes

### Setup

1. Fork the repository
2. Clone your fork
   ```bash
   git clone https://github.com/YOUR-USERNAME/openaudio-r.git
   cd openaudio-r
   ```
3. Create a branch
   ```bash
   git checkout -b fix/autoplay-ios
   ```

### Make Changes

- **Edit only `OpenAudio_r.js`** (unless updating docs).
- **Test thoroughly** in multiple browsers and on mobile.
- **Update JSDoc comments** if you change signatures.
- **Add/update examples** if adding features.
- **Update CHANGELOG.md** with your change.

### Code Style

- **Naming:** Use camelCase for variables/methods, PascalCase for classes.
- **Comments:** Comment *why*, not *what*. The code shows what; comments explain why.
- **JSDoc:** Document all public methods with parameter types and return values.
- **Error messages:** Be specific (include clip label, current time, etc.).
- **Callbacks:** Wrap in try/catch (see existing `onPlay`, `onEnd`, `onCycleReset` patterns).

### Testing Checklist

Before opening a PR, test:

- [ ] **Desktop browsers:** Chrome, Firefox, Safari (all latest versions)
- [ ] **Mobile:** iOS Safari, Chrome Android
- [ ] **First play on page load:** Must be inside a user gesture
- [ ] **Background tab test:** Switch to another tab, wait 10 seconds, switch back—next clip should fire correctly
- [ ] **Multiple clips:** Add 5+ clips and verify shuffle bag (no repeats in a cycle)
- [ ] **volume control:** Verify `setVolume()` updates live playback
- [ ] **destroy():** Ensure listeners are removed (no memory leaks)
- [ ] **Example code:** Test minimal and advanced examples from README

### Commit Messages

Write clear, atomic commits:

```bash
git commit -m "Fix: prevent double unlock on rapid start() calls

- Added #isUnlocking flag to track unlock phase
- Rapid clicks to start() are now ignored until unlock completes
- Solves race condition where multiple #scheduleNext() calls overlap"
```

**Guidelines:**
- Start with a type: `fix:`, `feat:`, `docs:`, `refactor:`, `test:`
- Reference any related issue: `Fixes #42`
- Explain *why*, not just *what*

### Opening a Pull Request

1. **Push to your fork**
   ```bash
   git push origin fix/autoplay-ios
   ```

2. **Open PR on GitHub**
   - Title: `fix: prevent audio unlock race condition`
   - Description: Explain the problem, your solution, and testing steps
   - Link any related issues: `Fixes #42`
   - Check the "allow edits from maintainers" box

3. **PR Template**

   ```markdown
   ## Description
   Briefly explain the change.

   ## Type
   - [ ] Bug fix (non-breaking change fixing an issue)
   - [ ] New feature (non-breaking change adding functionality)
   - [ ] Breaking change (fix or feature that changes existing API)
   - [ ] Documentation update

   ## Related Issue
   Fixes #42

   ## Testing
   How did you verify this change?
   - [ ] Tested in Chrome 120
   - [ ] Tested in Firefox 121
   - [ ] Tested in Safari 17
   - [ ] Tested on iOS
   - [ ] Tested on Android

   ## Checklist
   - [ ] Code follows project style (camelCase, JSDoc)
   - [ ] Comments added for new logic
   - [ ] CHANGELOG.md updated
   - [ ] README.md updated (if API change)
   - [ ] No breaking changes introduced
   - [ ] Tests pass in all listed browsers
   ```

---

## Documentation Changes

### Updating README.md

- Use clear, concise language
- Include code examples
- Test all code snippets (they should work as-is)
- Update table of contents if adding new sections

### Adding Examples

1. Create `/examples/your-example.html`
2. Include a comment block explaining what it demonstrates
3. Make it self-contained (no external dependencies)
4. Link it from README.md

Example structure:

```html
<!DOCTYPE html>
<html>
<head>
  <title>OpenAudio_r.js — [Feature] Example</title>
</head>
<body>
  <h1>[Feature] Example</h1>
  <p>This example demonstrates [feature].</p>
  
  <button id="play">Play</button>
  <button id="stop">Stop</button>
  <div id="status"></div>

  <script src="../OpenAudio_r.js"></script>
  <script>
    // Your example code here
  </script>
</body>
</html>
```

---

## Review Process

After you submit a PR:

1. **Automated checks** run (linting, tests if any)
2. **Code review** — I'll review the code and suggest changes if needed
3. **Discussion** — We'll discuss any questions or concerns
4. **Approval & merge** — Once approved, your code is merged

Expect 2–7 days for a response (I review contributions in batches).

---

## Project Structure

```
openaudio-r/
├── OpenAudio_r.js          # Main source file
├── README.md               # Project documentation
├── CONTRIBUTING.md         # This file
├── CHANGELOG.md            # Version history
├── LICENSE                 # GPL-3.0-or-later
├── .gitignore              # Git ignore rules
├── package.json            # npm metadata (if publishing)
├── /examples               # HTML demo files
├── /docs                   # Extra documentation
└── /test                   # Test files (if added)
```

---

## Development Tips

### Testing Autoplay Policy

Browsers block autoplay unless inside a user gesture. Test this:

```javascript
// ✅ This will work
document.addEventListener('click', () => engine.start());

// ❌ This will fail
setTimeout(() => engine.start(), 1000);
```

### Debugging Background Tab Throttling

1. Open DevTools
2. Go to Console
3. Type: `engine.#timerSetAt` (to check timer state)
4. Switch tabs and wait
5. Return to tab and check if next clip fires on schedule

### Memory Leaks

Always call `destroy()` when tearing down:

```javascript
// React
useEffect(() => {
  const engine = new AudioEngine(clips);
  return () => engine.destroy();
}, []);
```

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/):

- **MAJOR** (2.0.0) — Breaking API changes
- **MINOR** (2.4.0) — New features, backward-compatible
- **PATCH** (2.4.1) — Bug fixes

Version numbers appear in:
- `OpenAudio_r.js` header (line 4)
- `CHANGELOG.md`
- `package.json` (if published to npm)

---

## Deployment & Publishing

### Releases

1. Update version in `OpenAudio_r.js` header
2. Update `CHANGELOG.md`
3. Create a GitHub Release with tag `v2.4.0`
4. Add release notes summarizing changes

### npm Publishing (if applicable)

```bash
npm login
npm publish
```

This will publish the package to https://www.npmjs.com/package/openaudio-r.

---

## Questions?

- 💬 Open a GitHub Discussion
- 📧 Mention me in an issue
- 🐛 Check existing issues first

---

## Recognition

Contributors will be listed in CHANGELOG.md and credited in commit messages. Thank you for helping make OpenAudio_r.js better!

---

**Happy coding! 🎵**
