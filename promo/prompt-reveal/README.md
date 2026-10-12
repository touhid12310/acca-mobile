# AccountE prompt-to-website reveal

A 7.5 s, 1920x1080, 30 fps film (226 frames). A prompt is typed, the send button is pressed, and the prompt box becomes the AccountE landing page.

- `index.html`: the whole scene. Every style is a pure function of the frame number, set by `seekFrame(f)` or `seek(seconds)`. Motion comes from `kf()` keyframe tables.
- `render.js`: renders frames with Playwright. Run `node render.js <outDir> [frames...]`, and leave out the frame list to render all 226.
- `assets/`: the hero phone comes from the AccountE Play Store listing and the hand-held phone from accounte.com. Also included are the AccountE logo and the Inter fonts.
