# AccountE promo films

There are two cuts, both built from the same frame-pure HTML scene:

- **Long film (2:52, 5,160 frames):** the prompt reveal followed by ten chapters (intro, Chat to Record, Receipt Scan AI, Email to Record, Ask your books, Dashboard, Budgets/Goals/Loans plus Schedules, AI Reports, "Everything AccountE can do", and a finale). It's at `out/accounte-film.mp4`.
- **Prompt reveal (7.5 s, 226 frames):** a prompt is typed, sent, and the box becomes the AccountE landing page. It's at `out/accounte-prompt-reveal.mp4`.

## Files

- `index.html`: the reveal scene. Every style is a pure function of the frame, set by `seekFrame(f)`. Motion comes from `kf()` keyframe tables.
- `chapters.js`: the chapters. They only run with `index.html?long`. The file also exports `window.SFX_CUES`, the sound cues in sync with the picture.
- `render.js`: renders frames with Playwright. Run `node render.js <outDir> [--long] [--jpg] [--workers N] [--range a-b] [frames...]`.
- `audio.py`: builds the soundtrack:
  - It cuts "Voxscape" by Eugenio Mininni (Mixkit Stock Music Free License) so source 38.76 s lands at 1.72 s, and source 47.36 s lands at 4.11 s after the splice at 3.41 s.
  - It applies the low-pass sweeps and synthesises every sound effect, including the chapter cues.
- `build.sh [short|long]`: renders, builds the audio, masters it to −14 LUFS / −1 dBTP, and encodes H.264 at 30 fps.

## Asset sources

- **AccountE Play Store listing:** the phone screenshots in `assets/phones` (cut out along the device bezel) and the app icon.
- **accounte.com:** the feature UI images in `assets/ui`, the hand-held phone, the logo, the currency flags, and the store badges.
- **Rebuilt as HTML from the AccountE web app:** the dashboard, accounts, budgets, goals, loans, schedules, reports, and assistant UI.
