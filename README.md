# 3elagi Mobile

Standalone Expo (React Native) app — patient-facing mobile client for the 3elagi clinic platform.

## Requirements

- Node.js 20+
- npm, pnpm or yarn
- Expo Go app on your phone (for the easiest preview)

## Install & run

```bash
npm install            # or: pnpm install / yarn
npm run start          # opens Expo dev server, prints a QR code
```

Then:
- **Android:** open Expo Go and scan the QR
- **iOS:** open the Camera app and scan the QR
- **Web:** press `w` in the terminal, or run `npm run web`

## Demo account

The app ships with a built-in demo profile:

- email: `demo@3elagi.com`
- password: `demo1234`

## Native app (WebView shell)

On iOS and Android, the app is a **native shell** with splash screen + WebView loading a **bundled static web app** (offline-capable).

### Build & run with local web bundle

```bash
npm run build:web-local   # exports web app → assets/web/ (+ copies into android/)
npm run android           # installs APK with bundled web assets
```

Or in one step:

```bash
npm run android:local
```

### Dev without rebuilding the bundle

If `assets/web/` already exists, `npm run android` copies it into the APK automatically.

To use the live dev server instead, set `EXPO_PUBLIC_USE_LOCAL_WEB=0` and run `npm run web` in another terminal.

To load a remote URL (e.g. Vercel), set `EXPO_PUBLIC_WEB_APP_URL=https://3elagi-mobile.vercel.app/`.

## Build

- Web bundle: `npm run build:web`  →  `dist/`
- Native (Android APK / iOS): use [EAS Build](https://docs.expo.dev/build/introduction/) — `npx eas build -p android --profile preview`. Update `eas.json` and add an `extra.eas.projectId` in `app.json` first.

## Project layout

```
app/             expo-router routes (tabs, chat, medical, auth, etc.)
components/     shared UI (AppHeader, Avatar, Logo3elagi, LanguageSwitch, …)
domains/        zustand stores (auth, medical, chat, i18n)
hooks/          useColors, useI18n
constants/      colors, theme tokens
assets/         images & fonts
```

## Analytics (Microsoft Clarity)

- **Web** uses project `yak30uwjsp` (Website) via the script in `public/index.html`.
- **Native APK** uses mobile project `yao5h49onm` (Mobile app type). Rebuild the APK after changing this id in `constants/clarity.ts`.

## Notes

This is a self-contained copy — no monorepo, no Replit env vars, no proxy.
The `dev` server binds to localhost on the default Expo port (8081).
