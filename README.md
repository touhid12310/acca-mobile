# AccountE Mobile (acca-expo)

The iOS / Android app for **AccountE**, a personal-finance app. App id `com.accounte.finance`, deep-link scheme `accounte://`. It talks to the Laravel API in `../Backend-Laravel-API` (`https://api.accounte.com/api`); the web app lives in `../acca-tanstack`.

## Stack

- **Expo SDK 57**, **React Native 0.86**, **expo-router** (file-based), **react-native-paper**, **TanStack Query**, `lucide-react-native`
- Auth token in `expo-secure-store` (`accounte_auth_token`); push via `expo-notifications`; in-app purchases via `expo-iap` (Google Play Billing / App Store; `useGooglePlayBilling` buys the Play offer of the base plan the backend names per cycle and finishes paid-but-unverified purchases when the billing screen connects)
- Face ID / fingerprint app lock via `expo-local-authentication`; voice input via `expo-speech-recognition`
- A local native module, `modules/accounte-sms` (Android only), reads the SMS inbox for bank / wallet alerts

## Getting started

```bash
npm install
npm start          # Metro for the development build (expo start --dev-client --lan)
```

Because of the native modules (SMS reader, IAP, local authentication), the app runs in a **development build**, not Expo Go. Build one with `npm run build:android:dev` / `npm run build:ios:dev` (EAS), install it, then `npm start`. `npm run start:go` opens Expo Go for quick UI work — the SMS reader and store billing are unavailable there. `npm run start:tunnel` helps when the phone isn't on the same network.

| Script | What it does |
|---|---|
| `npm start` / `start:go` / `start:tunnel` | Metro (dev client / Expo Go / tunnel) |
| `npm run android` / `ios` / `web` | open on a platform |
| `npm run type-check` | `tsc --noEmit` |
| `npm run format` | Prettier |
| `npm run lint` | ESLint 8 + `eslint-config-expo` (`.eslintrc.js`); React Compiler rules are warnings (the app doesn't use the compiler) |
| `npm run build:android:apk` / `build:android:aab` | EAS preview APK / production AAB (`:local` variants build on this machine) |
| `npm run build:ios` / `build:ios:preview` | EAS iOS builds |
| `npm run submit:ios` | EAS submit to App Store Connect |

EAS profiles are in `eas.json` (`development`, `preview`, `production` with remote version auto-increment). Android submissions go to the Play **internal** track as a draft, using `google-play-service-account.json`.

### API URL

`EXPO_PUBLIC_API_URL` overrides the API base; the default is production (`https://api.accounte.com/api`). Don't create test data against production — point a dev build at a local or staging API instead.

## Project structure

```
app/                          expo-router screens
├── (auth)/                   login, register, forgot-password
├── (tabs)/                   Home (index), Activity (transactions), AI Chat, Reports, More
├── auth/callback.tsx         OAuth return (accounte://auth/callback)
├── transaction-modal.tsx     add / edit / transfer (TransactionFormContent)
├── accounts, account-detail, budgets, goals, loans, schedules, categories
├── rules.tsx                 auto-categorization rules
├── sms-import.tsx            SMS import (Android inbox sync + paste)
├── export-data.tsx           data export (emailed link, 24 h)
├── app-lock.tsx              Face ID / fingerprint lock settings
└── profile, notification-settings, notifications, sessions, billing, support, onboarding, verify-email
src/
├── services/                 one file per API resource (authService, transactionService, ruleService, smsService, …)
├── contexts/                 Auth, AppLock, Currency, Notification, Theme
├── hooks/                    useSmsAutoSync, useGooglePlayBilling
├── components/               shared UI, AppLockOverlay, transactions/TransactionFormContent
└── utils/                    dates, currency, categorizationRules (client rule matcher), …
modules/accounte-sms/         Android Expo module (Kotlin) + JS wrapper
```

## Platform notes

- **SMS import (Android):** needs `android.permission.READ_SMS` (declared in `app.json`). Google Play requires a sensitive-permission declaration for it. `useSmsAutoSync` (mounted in `app/_layout.tsx`) picks up new bank / wallet alerts when the app returns to the foreground and SMS import is on; messages are filtered to transaction alerts on the device before upload and become drafts under Activity → Pending review. Turning import on starts from "now"; older messages are pulled only when the user picks a range in **Import past messages** (Today / 7 / 14 / 30 days). iOS (and anyone) can paste messages instead.
- **App lock:** device-only setting in SecureStore `accounte_app_lock_v1`; `AppLockOverlay` covers the app until biometrics (or the phone PIN) succeed. Face ID copy is set in the `expo-local-authentication` plugin config.
- **Android keyboard:** `softwareKeyboardLayoutMode: "pan"` — use `KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}` except inside an RN/Paper `Modal`.
- **Sign-in:** password, 6-digit email code, Sign in with Apple, and Google through the browser (`src/services/googleBrowserAuth.ts`): the web client flow lands on the web app's `/auth/callback`, which returns the one-time code via `accounte://auth/callback` (Google rejects custom-scheme redirects on Android OAuth clients). `/auth/social/exchange-id-token` only remains for older builds.

Feature details and invariants for each screen are in `../.claude/skills/accounte-*` (start with `accounte-overview` and `accounte-pages-quickref`).
