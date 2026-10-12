# AccountE promo videos: QA report

Every file was checked by `tools/qa.py` (ffprobe, EBU R128 loudness, ffmpeg freezedetect) and reviewed frame by frame on contact sheets in both aspect ratios.

## 1. Technical checks

| File | Resolution | fps | Duration | Loudness | True peak | Freeze > 1.2 s | Size | Result |
|---|---|---|---|---|---|---|---|---|
| `AccountE_01_KineticType_16x9.mp4` | 1920×1080 | 30 | 56.0 s | -16.0 LUFS | -1.4 dBTP | none | 13.0 MB | PASS |
| `AccountE_01_KineticType_9x16.mp4` | 1080×1920 | 30 | 56.0 s | -16.0 LUFS | -1.4 dBTP | none | 11.9 MB | PASS |
| `AccountE_02_Flat2D_16x9.mp4` | 1920×1080 | 30 | 56.0 s | -16.0 LUFS | -1.5 dBTP | none | 11.3 MB | PASS |
| `AccountE_02_Flat2D_9x16.mp4` | 1080×1920 | 30 | 56.0 s | -16.0 LUFS | -1.5 dBTP | none | 11.3 MB | PASS |
| `AccountE_03_3D_16x9.mp4` | pending | | | | | | | |
| `AccountE_03_3D_9x16.mp4` | pending | | | | | | | |
| `AccountE_04_Isometric_16x9.mp4` | 1920×1080 | 30 | 56.0 s | -16.1 LUFS | -1.4 dBTP | none | 19.6 MB | PASS |
| `AccountE_04_Isometric_9x16.mp4` | 1080×1920 | 30 | 56.0 s | -16.1 LUFS | -1.4 dBTP | none | 17.7 MB | PASS |
| `AccountE_05_UIDeviceMockup_16x9.mp4` | 1920×1080 | 30 | 56.0 s | -16.0 LUFS | -1.3 dBTP | none | 16.5 MB | PASS |
| `AccountE_05_UIDeviceMockup_9x16.mp4` | 1080×1920 | 30 | 56.0 s | -16.0 LUFS | -1.3 dBTP | none | 14.2 MB | PASS |
| `AccountE_06_DataViz_16x9.mp4` | pending | | | | | | | |
| `AccountE_06_DataViz_9x16.mp4` | pending | | | | | | | |
| `AccountE_07_GlitchFuturistic_16x9.mp4` | pending | | | | | | | |
| `AccountE_07_GlitchFuturistic_9x16.mp4` | pending | | | | | | | |
| `AccountE_08_Cinematic_16x9.mp4` | pending | | | | | | | |
| `AccountE_08_Cinematic_9x16.mp4` | pending | | | | | | | |
| `AccountE_09_PaperCutCollage_16x9.mp4` | pending | | | | | | | |
| `AccountE_09_PaperCutCollage_9x16.mp4` | pending | | | | | | | |
| `AccountE_10_MinimalPremium_16x9.mp4` | pending | | | | | | | |
| `AccountE_10_MinimalPremium_9x16.mp4` | pending | | | | | | | |

Targets: ≥ 1080p, 30 fps, 50–60 s, −16 LUFS ±1 integrated, true peak ≤ −1 dBTP, no frozen stretch over 1.2 s.

## 2. Pacing and hook

- **Hook within 3 s:** each spot opens on its hook line (VO starts by 0.3 s) and a full-frame visual event inside the first 1.5 s.
- **Scene change every 2–4 s:** every timeline is built on a 2.8 s beat; each beat brings a new scene, layout or reveal (see the storyboards in `02_VIDEO_BRIEFS.md`). Every scene also carries a slow camera drift, so no frame is static.
- **Note on the automatic cut counter:** ffmpeg scene-cut detection only registers hard cuts. The spots use mostly in-scene transitions on light backgrounds, so the counter undercounts. The 2.8 s cadence was verified on per-second contact sheets instead.

## 3. Claims rules

| Rule | Result | How it was checked |
|---|---|---|
| Only claims verifiable on the sources | ✓ | Every claim maps to a source row in `01_RESEARCH_SUMMARY.md` |
| No invented stats, users, ratings or awards | ✓ | Text scan of all scripts and scene code; register-page stats and the Play download count are not used |
| No prices, testimonials, “12,847 transactions” counter or download numbers | ✓ | Text scan; “free forever plan” and “free trial on paid plans” only |
| No competitor names on screen; no App Store badge | ✓ | Text scan; only the official Google Play badge appears |
| Platform claims | ✓ | Android + Web only (iOS is listed as coming soon) |
| Money-back guarantee | not used | Conflicting between pages (flag F1) |
| Demo figures are realistic sample data; no real PII or brand names | ✓ | Persona “Alex”, neutral merchants (Green Leaf Market, Corner Café…); names, emails, phone numbers and bank brands from the reference screenshots are never shown |

## 4. Typography (max 2 font families per spot)

| Video | Families |
|---|---|
| 01 Kinetic type | Bricolage Grotesque + Urbanist |
| 02 2D flat | Urbanist + Roboto |
| 03 3D | Urbanist + Roboto |
| 04 Isometric | Urbanist + Roboto |
| 05 UI / device mockup | Urbanist + Roboto |
| 06 Data viz | Urbanist + Roboto |
| 07 Glitch / futuristic | JetBrains Mono + Urbanist |
| 08 Cinematic | Urbanist + Roboto |
| 09 Paper-cut / collage | Bricolage Grotesque + Urbanist |
| 10 Minimal premium | Urbanist + Roboto |

The logo is vector artwork, not a font. The Google Play badge is the official image.

## 5. Contrast (WCAG 2.1 AA)

Normal text needs 4.5:1. Large text (≥ 24 px, or ≥ 18.7 px bold) needs 3:1. Captions are measured against the brightest possible frame behind the 82 % box.

| Video | Pair | Colours | Size | Ratio | Result |
|---|---|---|---|---|---|
| All | Burned-in caption | `#ffffff` on `#373d48` | normal | 10.92:1 | PASS |
| All | End card tagline | `#0b1220` on `#f7f9ff` | large | 17.79:1 | PASS |
| All | End card pill | `#102a83` on `#e3eaff` | normal | 10.4:1 | PASS |
| All | End card URL | `#0204f5` on `#f7f9ff` | normal | 8.53:1 | PASS |
| 01 | White type on brand blue | `#ffffff` on `#0204F5` | large | 8.98:1 | PASS |
| 01 | Ink type on white | `#0B1220` on `#ffffff` | large | 18.72:1 | PASS |
| 01 | Brand-blue type on white | `#0204F5` on `#ffffff` | large | 8.98:1 | PASS |
| 01 | "$38" emerald on white (fixed) | `#047857` on `#ffffff` | large | 5.48:1 | PASS |
| 04 | Emerald merchant tag, bold 28px | `#059669` on `#ffffff` | large | 3.77:1 | PASS |
| 05 | "Saved." emerald callout (fixed) | `#047857` on `#F3F6FB` | large | 5.06:1 | PASS |
| 05 | White on emerald toast (fixed) | `#ffffff` on `#047857` | large | 5.48:1 | PASS |
| 05 | White on indigo scan toast | `#ffffff` on `#6366F1` | large | 4.47:1 | PASS |
| 06 | "+$1,284" emerald (fixed) | `#047857` on `#ffffff` | large | 5.48:1 | PASS |
| 06 | Calendar day numbers (fixed) | `#64748B` on `#ffffff` | normal | 4.76:1 | PASS |
| 06 | Indigo eyebrow, bold 26px | `#6366F1` on `#ffffff` | large | 4.47:1 | PASS |
| 08 | Mint accent on dark | `#6EE7B7` on `#0B1220` | normal | 12.28:1 | PASS |
| 08 | Blue-grey support on dark | `#AFC4E8` on `#0B1220` | normal | 10.6:1 | PASS |
| 02 | Ink on pale blue background | `#0B1220` on `#EAF1FF` | large | 16.52:1 | PASS |
| 02 | Brand blue on pale blue | `#0204F5` on `#EAF1FF` | large | 7.92:1 | PASS |
| 03 | White on navy | `#ffffff` on `#0B1830` | large | 17.68:1 | PASS |
| 04 | Ink on iso floor | `#0B1220` on `#EEF2FF` | large | 16.74:1 | PASS |
| 05 | App UI text on white | `#0F172A` on `#ffffff` | normal | 17.85:1 | PASS |
| 05 | App UI secondary text | `#64748B` on `#ffffff` | normal | 4.76:1 | PASS |
| 06 | Chart labels (muted) | `#64748B` on `#ffffff` | normal | 4.76:1 | PASS |
| 06 | Headline ink | `#0F172A` on `#ffffff` | large | 17.85:1 | PASS |
| 07 | Body text on near-black | `#E2E8F0` on `#050816` | normal | 16.18:1 | PASS |
| 07 | Dim mono labels | `#7C8DB5` on `#050816` | normal | 6.02:1 | PASS |
| 07 | Neon accent | `#2F7BFF` on `#050816` | large | 5.13:1 | PASS |
| 07 | Cyan accent | `#22D3EE` on `#050816` | normal | 11.04:1 | PASS |
| 08 | White on dark glass scrim | `#ffffff` on `#1F2937` | normal | 14.68:1 | PASS |
| 09 | Ink on cream | `#1B1B1F` on `#F6EFE3` | large | 15.02:1 | PASS |
| 09 | Ink on mint paper | `#1B1B1F` on `#7FD1AE` | large | 9.51:1 | PASS |
| 09 | Ink on coral paper | `#1B1B1F` on `#F28B82` | large | 7.19:1 | PASS |
| 09 | Ink on sky paper | `#1B1B1F` on `#8FB8FF` | large | 8.56:1 | PASS |
| 09 | Ink on mustard paper | `#1B1B1F` on `#F2C14E` | large | 10.23:1 | PASS |
| 09 | Ink on kraft envelope | `#1B1B1F` on `#D9B98C` | normal | 9.21:1 | PASS |
| 09 | Amber label on sticky note (fixed) | `#92400E` on `#FFF3A8` | normal | 6.29:1 | PASS |
| 09 | Blue "AccountE" on white paper | `#2F5BEA` on `#FFFFFF` | large | 5.52:1 | PASS |
| 10 | Ink on ivory | `#0B0B0F` on `#FAFAF7` | large | 18.79:1 | PASS |
| 10 | Grey support text on ivory | `#5F6672` on `#FAFAF7` | normal | 5.53:1 | PASS |
| 10 | Brand blue on ivory | `#0204F5` on `#FAFAF7` | normal | 8.59:1 | PASS |

Four pairs failed the first pass and were fixed before the final render: “$38” (01), “Saved.” and the success toast (05), “+$1,284” and the calendar day numbers (06), and the sticky-note label (09).
Recreated in-app UI keeps the real app’s colours; the message of every such shot is also carried by a headline and caption that pass.

## 6. Captions, safe zones and audio

- **Burned-in captions** for every VO line (white on an 82 % ink box). The end-card VO repeats the on-screen end-card text, so it is not captioned again.
- **9:16 safe zones:** compositions are rebuilt for portrait, not cropped. Captions sit above the bottom 470 px (platform UI), and key content stays between about 150 px and 1,300 px from the top.
- **16:9:** captions sit 58 px from the bottom; content stays clear of the caption band.
- **Voice-over:** Kokoro-82M (Apache-2.0), one voice per spot. Every line was checked for fit inside its beat and for intelligibility with a speech-recognition pass.
- **Music and SFX:** original, synthesized for this project (royalty-free by construction). The VO is ducked over the music, and the final mix is loudness-normalized (two-pass loudnorm) to −16 LUFS / −1.5 dBTP.
