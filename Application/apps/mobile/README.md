# Mobile (`@ticketing/mobile`)

React Native (Expo) app for Members, Customers and Project Heads.

> **Status: not started.** Mobile is post-v1 (Phase 6 in the [plan](../../../Architecture/Plan/revised_plan.md#11-mobile-application-react-native)). This folder is only a placeholder: Expo is **not installed yet**, so `pnpm start` will not work.

---

## What is planned

| Screen | Purpose |
|---|---|
| Login | Sign in; tokens stored in `expo-secure-store` |
| My Projects | List with insight summary |
| Project Detail | Insights + tickets |
| Assigned to Me | Work queue, quick status update |
| Create Ticket | New Task / Bug / Request |
| Ticket Detail | View, assign (Project Head), status (Member) |

Project creation and user management stay web-only. It will use the same API and the shared `@ticketing/shared` and `@ticketing/api-client` packages.

---

## Running it (once Phase 6 starts)

These steps apply after Expo has been added in Phase 6.

1. Install the **Expo Go** app on your phone (iOS App Store / Google Play), or set up a simulator:
   - iOS: Xcode (macOS only)
   - Android: Android Studio with an emulator
2. Start the API (see the [API guide](../api/README.md)).
3. Start the app from `Application/`:

   ```sh
   pnpm --filter @ticketing/mobile start
   ```

4. Scan the QR code with Expo Go, or press `i` (iOS simulator) or `a` (Android emulator).

A phone can't reach `localhost` on your computer. Point the app at your computer's LAN IP instead (e.g. `http://192.168.1.20:4000/api/v1`). Mobile requests send no browser `Origin` header, so they are not blocked by CORS.
