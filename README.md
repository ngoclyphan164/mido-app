# mido

React Native app built with [Expo](https://expo.dev) SDK 57 (React Native 0.86, React 19.2).

## Stack

|               |                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| Routing       | [Expo Router](https://docs.expo.dev/router/introduction/) — file-based, screens live in `src/app`      |
| Language      | TypeScript (strict), path alias `@/*` → `src/*`                                                        |
| Styling       | [NativeWind v5](https://www.nativewind.dev/v5) + Tailwind CSS 4 (CSS-first config in `src/global.css`) |
| Server state  | [TanStack Query](https://tanstack.com/query) — client in `src/lib/query-client.ts`                     |
| Client state  | [Zustand](https://zustand.docs.pmnd.rs) — stores in `src/store`                                        |
| Lint / format | `eslint-config-expo` (flat config) + Prettier                                                          |

## Requirements

- **Node 24** (see `.nvmrc`) — RN 0.86 needs `>=20.19.4`, `>=22.13`, or `>=24.3`.
  There is an x86_64 Node at `/usr/local/bin/node` on this machine. If it wins the
  `PATH`, Metro fails with `Cannot find module '../lightningcss.darwin-x64.node'`
  because the installed native binary is arm64. Run `nvm use` first, or remove that
  stray install.
- **Xcode 26.4+** for local iOS builds. Expo SDK 56 bumped the minimum, and 26.3
  fails while compiling the `ExpoModulesJSI` xcframework
  (`SWIFT_RETURNS_RETAINED … is not returning a SWIFT_SHARED_REFERENCE type`).
  Until Xcode is updated, build iOS on EAS instead of locally.
- **JDK 17** for local Android builds. This machine has JDK 18, which Gradle/AGP
  reject. `brew install --cask zulu@17`, then point `JAVA_HOME` at it.

Expo Go on the app stores tracks SDK 54, so **this project needs a development build**, not Expo Go. `npm run ios` / `npm run android` handle that.

## Commands

```bash
nvm use              # Node 24
npm run start        # dev server
npm run ios          # build + run a dev build on the iOS simulator
npm run android      # build + run a dev build on an Android emulator
npm run web
npm run lint
npm run format
npm run typecheck
npx expo-doctor      # verify dependency versions match the SDK
```

## Layout

```
src/
├── app/            # Expo Router routes — only screens and layouts here
├── lib/            # shared clients and helpers
└── store/          # Zustand stores
```

`android/` and `ios/` are gitignored: this project uses [Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/). Configure native settings in `app.json` and run `npx expo prebuild --clean` rather than editing native files by hand.

## Styling notes

NativeWind v5 has no `tailwind.config.js`. Design tokens go in `src/global.css` inside an `@theme { … }` block. That file is imported once, at the top of `src/app/_layout.tsx`.

`lightningcss` is pinned to `1.30.1` via `overrides` in `package.json` — newer versions hit a deserialization error during Metro builds. NativeWind v5 is still a preview release; if it blocks you, the fallback is NativeWind 4 with Tailwind 3.
