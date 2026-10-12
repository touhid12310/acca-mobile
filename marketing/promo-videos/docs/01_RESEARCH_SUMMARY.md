# AccountE — Research Summary (Phase 0)

Researched 12 Oct 2026. Every claim used in the videos traces to one of the sources below. Anything that could not be verified, or that conflicts between sources, is listed under **Flags** and kept off screen.

## Sources read

| # | Source | What was used |
|---|---|---|
| S1 | https://accounte.com/ (home: hero, AI features, "Power up", How it works, Capabilities, Live demo, Who is it for, Compare, Pricing, 160+ currencies, App, Blog, FAQ, footer) | Positioning, taglines, features, audiences, 3-step flow, FAQ (security, free plan, trial) |
| S2 | https://accounte.com/ai-bookkeeping-vs-traditional-bookkeeping/ (1 Aug 2026) | Capture methods, feature list, "web and Android, iOS coming soon", tagline |
| S3 | https://accounte.com/how-ai-bookkeeping-works/ (24 Jul 2026) | Capture → extract → suggest → review → reports workflow; "CSV import on the web", "Bank reconciliation on the web" |
| S4 | https://accounte.com/what-is-ai-bookkeeping/ (20 Jul 2026) | Same feature list; "Built by an Accountant. Powered by AI." |
| S5 | https://play.google.com/store/apps/details?id=com.accounte.finance | Listing title, full description, 7 screenshots, What's new, Data safety |
| S6 | https://app.accounte.com/register | Sign-up flow (Google or email) |
| S7 | https://accounte.com/privacy-policy/ · /refund-cancellation-policy/ · /terms-and-conditions/ | Security wording (HTTPS/TLS, 2FA, no selling of data), trial/refund terms |
| S8 | Web-app screenshots supplied by the client (Dashboard, Transactions, Pending review, Accounts, Schedules, Loans, Budgets, Goals, Chart of accounts, Reports, Settings, Add Transaction, Assistant) | Layouts for faithful UI recreations (all personal data replaced) |
| S9 | `acca-mobile` repo (this repo): `src/constants/theme.ts`, `app.json`, `assets/` | App colour tokens, gradients, icons, logo files |

There are exactly three posts on /blog/, so the "3 latest" are S2–S4.

## Positioning

**AccountE is an AI money tracker and personal bookkeeping platform** for individuals, freelancers, self-employed professionals, e-commerce sellers and small-business owners. You *talk* to it: type, speak, snap or forward a transaction, and the AI does the bookkeeping. It also answers plain-English questions about your money from your real records.
Core promise: *bookkeeping without learning accounting*. It's AI-first, built by an accountant, and has a genuine free-forever plan.

- Play Store title: **"AccountE: AI Expense Tracker"**. Subtitle: "Scan receipts, track expenses & budgets. Just type or ask AI to do it."
- Site meta: "The AI-powered personal finance & accounting platform freelancers, SMBs & households trust."
- Footer line: **"Smart money management, powered by AI. One app. Every account. Every currency."**

## Taglines (verified)

| Line | Source |
|---|---|
| **Talk to your money. Let AI do the books.** | S1 hero H1, S5 first line |
| **Built by an Accountant. Powered by AI.** | S1 hero eyebrow, S4 closing line |
| **Your AI Bookkeeper in your pocket** | S1 app banner ("AccountE App — Your AI Bookkeeper in your pocket") |
| Your AI Bookkeeper. Working in Real Time. | S1 AI-features H2 |
| From messy receipts to clean books in 3 steps. | S1 How-it-works H2 |
| Many finance apps help you track money. AccountE helps you talk to your money. | S5 |
| Start free. Add AI when you're ready. | S1 pricing |
| Live Updates · AI-Powered · Audit-Ready | S1 |
| No accounting degree required. No spreadsheets. No setup fees. | S1 |
| Start in 60 seconds · No credit card · Free forever plan available | S1 |

## Tone

Confident, plain-spoken, a little playful ("AI does the boring part", "end-of-month dread"). It's warm about control ("you always review and confirm"), not hype. It talks to non-accountants: short sentences and concrete examples ("Coffee 5.40", "How much did I spend on groceries this month?").

## Verified facts (the client's checklist)

| Fact | Status | Evidence |
|---|---|---|
| Taglines "Talk to your money. Let AI do the books." / "Built by an accountant. Powered by AI." | ✅ | S1, S4, S5 |
| Capture: receipt photo, chat ("Coffee 5.40"), voice, email forwarding | ✅ | S1 "Snap a receipt. Speak a transaction. Forward an email. Type a quick note."; S5 "Coffee 5.40" example |
| CSV / Excel import | ✅ | S1 "Import many transactions at once from CSV, Excel, or copied rows." (S3: CSV import on the web) |
| AI chat answers spending questions | ✅ | S5 "How much did I spend on groceries this month?", "Was I over budget last month?", "Show me my biggest expenses this week.", "What is my current balance?" |
| Receipt scanner extracts merchant, date, total, line items, category; user confirms | ✅ | S5: merchant name, date, total amount, line items, suggested category, payment account; "You review and confirm before saving" |
| Auto-categorization learns from corrections | ✅ | S1 "Learns from your corrections", "AI auto-categorization that learns" |
| Flags anomalies & duplicates | ✅ | S1 How it works step 02: "Flags anomalies and duplicates" |
| Reports: income/expense, cash flow, category, net worth, balances, P&L, Balance Sheet | ✅ | S5 report list (+ monthly summary, "Profit and loss style statements"); S1 FAQ "Profit & Loss, Balance Sheet, and Cash Flow" |
| Budgets, goals, loan payoff, borrowed/lent, recurring | ✅ | S5 list; S1 "Loan tracker with payoff projections" |
| Bank reconciliation | ✅ (web) | S1 "AI Bank Reconciliation"; S3 "Bank reconciliation on the web" |
| 160+ currencies, one dashboard | ✅ | S1 "Track Money in 160+ Currencies … USD, BDT, GBP, EUR, AED and more in one clean dashboard"; S5 |
| Audiences: freelancers, small business, e-commerce, households | ✅ | S1 "Who is it for?": Freelancers & Self-Employed, Small Business Owners, E-commerce Sellers, Personal Finance; meta "households" |
| Android + Web live, iOS not live | ✅ | S2/S4 "available on the web and Android. The iOS app is coming soon." (see flag F2) |
| 2FA | ✅ | S1 FAQ (TOTP apps), S5 "two-factor authentication (2FA) support" |
| Private workspace | ✅ | S5 "records, receipts, and account data stay in your private workspace"; S1 FAQ |
| Encrypted in transit | ✅ | S5 Data safety "Data is encrypted in transit"; S7 "HTTPS/TLS encryption" |
| No third-party sharing | ✅ (wording) | S5 "Your data is never shared with third parties." + Data safety "No data shared with third parties" (see flag F4) |
| Free-forever plan, no card | ✅ | S1 FAQ "free-forever plan - no credit card required, no time limit"; S5 "Start free with no credit card required" |
| Paid trial + money-back | ⚠️ trial ✅ / money-back conflicting | S1 "30-day free trial", FAQ "one-month free trial plus a 30-day money-back guarantee"; S7 refund policy says direct refunds are "case-by-case and not guaranteed" (flag F1) |
| 3 steps: Capture → AI does the boring part → Clarity | ✅ | S1 01 "Capture, however you like." 02 "AI does the boring part." 03 "See clarity, ask anything." |

Also verified and used: Hide-Balance Privacy Mode and voice-to-transaction on mobile (S1). Secure sign-in and session management (S5). Custom rules (S1). Smart insights covering trends, recurring payments and unusual transactions (S1). Budget alerts at 75% and 100% and payment reminders "1 day before due" (S8 Settings). Default currency setting (S8).

## Flags (kept off screen)

- **F1 Money-back:** the homepage and FAQ promise a 30-day money-back guarantee, but the refund policy says direct refunds are "reviewed case-by-case and not guaranteed". **Not claimed in any video.** Recommend aligning the copy.
- **F2 iOS:** the pricing table and FAQ say "iOS, Android, and Web", and the site shows an App Store badge. The blog says iOS is "coming soon". Per the brief, videos say **Android + Web** only, with no App Store badge.
- **F3 Stats:** the register page shows "10K+ active users · $2M+ tracked daily · 99.9% uptime". The homepage shows "12,847 transactions processed today". Play shows "100+ downloads". These are unverified or conflicting, so **none are used.**
- **F4 Third parties:** the privacy policy lists trusted service providers, while Play's Data safety (which excludes service providers by definition) says "No data shared with third parties". Videos use the Play wording only.
- **F5 Testimonials:** the homepage testimonials use template names ("Ralph Edwards" appears three times) and stock author photos. **Not used.**
- **F6 Brand names in product imagery:** site images and the supplied screenshots show real merchants and banks. All UI recreations use neutral sample merchants and accounts instead (Green Leaf Market, Corner Café, Main Checking…).
- **F7 Compare table:** names competitors and prices. **Not used.**

## Features (for reference)

- **Capture:** Chat to Record · Voice to Record · Receipt Scan to Record (stores the receipt with the record) · Email to Record (forward to your @accounte.app address) · bulk CSV/Excel/copied rows · manual entry · bank feed record (web) · SMS import on Android (repo only; not used).
- **AI:** auto-categorization that learns · custom rules · flags anomalies and duplicates · AI chat with your books (plain English, backed by your data) · AI report generation · smart insights (trends, recurring, unusual transactions) · AI bank reconciliation.
- **Money tools:** multi-account (cash, bank, card, e-wallet, savings, investments) · budgets with overspending alerts · savings goals · loan tracker (borrowed and lent, payoff projections) · recurring schedules · transfers · categories and subcategories (chart of accounts) · tax tagging · net-worth tracker · 160+ currencies.
- **Reports:** income and expenses · cash flow · spending by category · net worth over time · account balances · monthly summary · P&L · Balance Sheet.
- **Security:** 2FA (TOTP) · private workspace · encrypted in transit · never shared with third parties · session management · hide-balance privacy mode.
- **Pricing (not shown on screen):** a free-forever plan, plus paid plans with a free trial.

## Audiences

1. **Freelancers & self-employed:** track invoices, separate business and personal, snap receipts on the go, tag tax-deductibles year-round.
2. **Small business owners:** real P&L, Balance Sheet and Cash Flow without hiring an accountant; reconcile bank statements with AI.
3. **E-commerce sellers:** multi-currency revenue, fees and refunds; auto-categorize large CSV exports.
4. **Personal finance / households:** wallets, cards, savings and investments in one place; alerts before overspending; goals; net worth.

## Brand system (extracted)

| Token | Hex | Source |
|---|---|---|
| Logo gradient start | `#0181FA` (≈ #017AF7–#0181FA) | sampled from logo PNG/vector |
| Logo gradient end | `#0204F5` | sampled from logo |
| Logo ink | `#000000` (light) / `#FFFFFF` (dark) | logo-light / logo-dark |
| App indigo (primary UI, AI Chat) | `#6366F1` → `#8B5CF6` | theme.ts `gradients.primary` |
| App blue | `#3B82F6` | app.json notification colour, theme |
| Income / Expense / Assets / Liabilities | `#10B981` / `#EF4444` / `#3B82F6` / `#F59E0B` | web-app charts (S8), theme |
| Dark hero navy | `#0F213D` → `#0B1830` | theme.ts `gradients.hero`, splash dark bg |
| Slate ink / muted / line / bg | `#0F172A` / `#64748B` / `#E2E8F0` / `#F8FAFC` | app usage counts |

**Fonts.** The site uses **Urbanist** (`--sr-font-1`, primary) and **Bricolage Grotesque** (`--sr-font-3`). The Android app renders in **Roboto** (system). The videos use Urbanist everywhere, plus at most one partner font per video: Bricolage Grotesque, Roboto for app UI, or JetBrains Mono for the glitch piece.

## Asset list (with sources)

See `03_ASSETS.md` for the full table, including how each asset was rebuilt.
