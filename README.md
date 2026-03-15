# OpenAudio
OpenAudio is a hobbyist project tool, for playing audio with HTML5. There are two versions, OpenAudio for playing one track and OpenAudio_r for playing random playing of 3 input tracks after event , repeating and randomised intervals until closed.

FAQ
Q: Can I use this commercially?
A: Yes, GPL-3.0 allows commercial use. You must provide source code and include the license.
Q: Do I have to open-source my app?
A: Only if you distribute it. If it's internal, no.
Q: Can I use this in a game?
A: Absolutely! It was designed for ambient audio in games.
Q: What if I need crossfading?
A: Use the Web Audio API instead. This library uses <audio> elements for simplicity.
Q: Can I control playback speed?
A: Not per-clip. The inter-clip delay is what varies. If you need speed control, use Web Audio API.
Q: Does it work offline?
A: Yes, if your audio files are local or embedded as base64.
