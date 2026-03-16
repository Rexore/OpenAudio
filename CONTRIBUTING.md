# Contributing to OpenAudio Suite

Thank you for considering a contribution! The OpenAudio Suite is a collection of lightweight, dependency-free audio utilities designed for modern web environments.

The suite currently includes:
- **OpenAudio_r.js (v2.4.1)** — Randomized audio engine with background tab mitigation.
- **OpenAudio_s.js (v1.1.0)** — Sequential playlist and skip-logic player.
- **OpenAudio.js (v1.2.0)** — Single-clip player with autoplay policy handling.

## 🤝 Code of Conduct

This project adheres to the [Contributor Covenant](https://www.contributor-covenant.org/). By participating, you are expected to uphold this code of conduct.

---

## 🐛 Reporting Bugs

Before submitting a bug report, please:
1. **Check existing issues** to see if the bug has already been reported.
2. **Check the DevTools console** and copy any relevant error messages.
3. **Isolate the environment**: Does it happen in all browsers or just one?

### Bug Report Template
When opening an issue, please use the following format:

> **Describe the bug**
> A clear and concise description of what the bug is.
>
> **Steps to Reproduce**
> 1. Initialize engine with `new AudioEngine(...)`
> 2. Call `engine.start()`
> 3. Observe [Error/Behavior]
>
> **Environment**
> - Browser: [e.g., Chrome 122, iOS Safari 17.4]
> - OS: [e.g., macOS Sonoma, Android 14]
>
> **Minimal Code Example**
> ```javascript
> // Paste minimal reproduction code here
> ```

---

## ✨ Suggesting Features

We welcome feature requests! Please keep in mind that the "OpenAudio" philosophy is to remain **lightweight and standard-compliant**. 

Features like **Crossfading**, **Real-time DSP (Reverb/EQ)**, or **Visualizers** are generally considered out of scope, as they are better handled by the Web Audio API.

To suggest a feature, please include:
1. **Motivation**: Why is this needed?
2. **Proposed API**: How should the method or option look?
3. **Use Case**: Give a real-world example of how it would be used.

---

## 🛠️ Development Workflow

### Setup
1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone [https://github.com/YOUR-USERNAME/OpenAudio.git](https://github.com/YOUR-USERNAME/OpenAudio.git)
