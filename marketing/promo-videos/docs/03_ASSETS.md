# Asset list (sourced)

Collected 12 Oct 2026. "Rebuilt" means the asset was re-created as vector or HTML at render resolution rather than enlarged.

## Logo & icon

| Asset | Source URL | Native size | Treatment in videos |
|---|---|---|---|
| Header wordmark | https://accounte.com/wp-content/uploads/2025/10/Accounte-logo-5-21-2026.png (also `.png.webp`) | 500×110 | Too small for video → **rebuilt as vector** |
| Wordmark, light / dark | repo `assets/logo-light.png`, `assets/logo-dark.png` (client-supplied, identical art) | 2435×365 | **Traced to SVG** with potrace: 14 parts (icon ×3, A, C, C, O ×2, U, N, T, E ×2, corner bracket). Each blue part has its own fitted gradient (#0181FA → #0204F5) → `assets/brand/wordmark_parts.svg`. Letters use `currentColor` (black/white variants). |
| App icon / mark | client-supplied icon (923×1054); https://accounte.com/wp-content/uploads/2026/05/faveIcon.png (1024×1024); Play icon https://play-lh.googleusercontent.com/ufuQuD8f8emsSHLB74_oNfQel65M-5zsCvUWy9mNRZjb5TyBAmQByj5wLDkFOTUSd3lhRel08jypDlltGtGJYw=s0 (512×512) | — | **Traced to SVG** `assets/brand/icon_parts.svg` (chevron hex ×2 + sparkle, each with its own gradient) |
| Favicons | https://accounte.com/wp-content/uploads/2026/05/cropped-faveIcon-{32x32,180x180,192x192,270x270}.png | ≤270 | Reference only |

## Store & badges

| Asset | Source URL | Treatment |
|---|---|---|
| Google Play badge ("GET IT ON Google Play", official) | https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png | Trimmed to 564×168 and always shown at ≤ native size. (The site's own `playstore.webp` is 185×55, too small to use.) |
| App Store badge | https://accounte.com/wp-content/uploads/2026/04/appstore.webp | **Not used** (iOS not live) |

## Play Store screenshots (7)

| # | Headline on screenshot | Source URL (full res, 941×1672) |
|---|---|---|
| 1 | See Your Money Clearly | https://play-lh.googleusercontent.com/Zh0kEoEpuLQj4VzAMOOKV_ztK61UdZvGnH3HRmti0bbn6s_5ASBHbIqDQA1dP4GltGdRapz7KMmE09wfTaLOs4A=s0 |
| 2 | Talk to Your Money with AI | https://play-lh.googleusercontent.com/nzcmJp2a_ksphHg7NQYG_w1qxjaVCo7-hWfZmen3lAQ3tRt9yAO6ytCP9VrQCOf6itqJBMertE4DbeikEo7Dgg=s0 |
| 3 | Reports That Make Sense | https://play-lh.googleusercontent.com/gHI7Wou94HPItl0XIVHXjhwKAd2pTHQDu3owW4YrRUhCG9LksitxJ_D_AKgvunvAwUqRbPGsRwptMv3OtC4x_A=s0 |
| 4 | Ask AI About Your Spending | https://play-lh.googleusercontent.com/20jCuff86QSc3hEi9l2lD58U42Yr4TtYYsQEe2_H5Gvl02jukgLBpeJ5L0b7FZClitHLY01f0Q0keU6jXTdD=s0 |
| 5 | Save Expenses with AI Chat | https://play-lh.googleusercontent.com/ZxPv2U384AcOHi3Tn5lTP77AzF4CHQSa7RnBdSoKL2tsL0n1Wqc6lDGc2QPbGS7gUIP_yWj1Kenzlf93xo2eEA=s0 |
| 6 | Track Every Transaction Clearly | https://play-lh.googleusercontent.com/ebgaKT1r0aoUcjATs0-NkQwlGZB-7dGwk_jOSHvTYvSyt7Wl0qCEObTWWRwlbTRoPB6o_-xNDYHd1ayGENSmeg=s0 |
| 7 | Record Expenses by Chat | https://play-lh.googleusercontent.com/wchrD_wKNvYYTy0qZ85ibAkNsglDE18KzraSfIy0iI38C0VcEmPO2BORfIToZrzOs03DlyNkg3XCTc0uq2ms=s0 |

The phone screen inside each screenshot is only about 430 px wide, so blowing it up full-frame would mean upscaling. The screenshots are therefore used as **layout references**. The Home, AI Chat, Reports, Activity and receipt-scan screens are **rebuilt in HTML/CSS at native video resolution**: Roboto, Lucide icons (the app's icon set), colours from `theme.ts`, and sample data. They also show a real person's photo and first name, which are replaced.

## Website imagery

| Asset | Source URL | Size | Use |
|---|---|---|---|
| OG image (multi-device) | https://accounte.com/wp-content/uploads/2026/05/accounte-ai-bookkeeping-multi-device-sync.webp | 1200×628 | Reference only (too small for full frame) |
| Hero dashboard | https://accounte.com/wp-content/uploads/2026/05/edited_dashboard_rounded_bottom_blur.png | 1076×545 | Reference → dashboard **rebuilt in HTML** |
| Mobile mockup (hand + phone) | https://accounte.com/wp-content/uploads/2026/05/accounte-ai-bookkeeping-mobile-app.png | 600×586 | Reference only |
| Feature images: AI Financial Reports, AI Bank Feed, Bank Reconciliation, Budgets, Bulk/CSV import, Chat to Record, Email to Record, Repeating, Receipt Scan | https://accounte.com/wp-content/uploads/2026/05/{AI-Financial-Reports.jpg, AI-bank-feed.jpg, Bank-reco-2.jpg, Budgets-2.jpg, Bulk-transaction.jpg, Chat-to-Record.jpeg, Email-to-Record.jpg, Reapting-2.jpg, Receipt-Scan-AI.jpg}.webp | 1774×887 | Layout references; they contain real merchant and bank names, so the screens are **recreated** with sample data |
| Capture icons (chat, voice, photo, email) | https://accounte.com/wp-content/uploads/2026/05/0{1_chat,2_voice,3_photo,4_email}_to_record.png.webp | 600×600 | Style reference; icons drawn as vectors (Lucide) |
| Currency coins with flags (19) | https://accounte.com/wp-content/uploads/2026/05/{usd_flag_currency_only_no_bg_large_flag.png, eur_flag_currency_no_bg.png, united_kingdom_gbp_no_bg.png, bangladesh_bdt_no_bg.png, uae_aed_no_bg.png, japan_jpy_no_bg.png, india_inr_no_bg.png, china_cny_no_bg.png, singapore_sgd_no_bg.png, philippines_php_no_bg.png, nigeria_ngn_no_bg.png, krw_flag_currency_no_bg_updated.png, sar_…, cad_…, brl_…, sek_…, mxn_…, chf_…, aud_…}(.webp) | 512×512 | Style reference for the coin look; the coins in video 03 are rebuilt in 3D with vector flags from the `flag-icons` npm package (MIT), so they stay sharp at any size |

## Client-supplied web-app screenshots (S8)

Dashboard, Transactions (Ledger / Pending review), Manage Accounts, Schedules, Loans, Budgets, Goals, Chart of Accounts, Reports, Settings, Add Transaction, AccountE Assistant. These are used **only as layout references**. Names, emails, phone numbers, avatar photos, bank brands and merchant brands are never reproduced.

## Third-party resources (licences)

| Resource | Licence | Use |
|---|---|---|
| Urbanist, Bricolage Grotesque, Roboto, JetBrains Mono (via @fontsource) | SIL OFL 1.1 / Apache 2.0 | Typography |
| Lucide icons (`lucide-static`) | ISC | UI icons (the AccountE app itself uses Lucide) |
| flag-icons | MIT | Vector flags |
| GSAP 3 | GSAP standard "no charge" licence (free for commercial use) | Animation timeline |
| three.js | MIT | 3D video |
| Kokoro-82M TTS (kokoro-onnx) | Apache 2.0 | Voice-over |
| Music & SFX | Original, synthesized for this project (no samples) | Royalty-free by construction |
