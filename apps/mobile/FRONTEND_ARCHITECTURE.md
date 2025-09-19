# Frontend Architecture

This document explains how the Echo client (mobile + web) is organized inside `apps/mobile`. It highlights navigation, state management, camera flows, API integration points, styling, and the major gaps that block the camera-to-backend handshake.

## Technology Stack
- **Framework:** Expo (SDK 51) with React Native and Expo Router for navigation.
- **Platforms:** iOS, Android, and responsive web (same bundle with platform-specific components where required).
- **Language:** TypeScript/JavaScript (TS gradually introduced in camera modules).
- **UI toolkit:** Custom components in `src/components/ui/**` with Tailwind-inspired styling helpers; icons via `lucide-react-native`.
- **State:** Local React state + hooks; room to introduce zustand/redux once real data arrives.

## Application Shell
- **Entry points:**
  - `App.tsx` and `index.tsx/index.web.tsx` bootstrap the Expo Router stack.
  - `src/app/_layout.jsx` defines the root stack navigator and global providers.
- **Tab navigation:** `src/app/(tabs)/_layout.jsx` registers the four primary tabs (`discover`, `ask`, `conversations`, `profile`). Each tab screen lives in the same folder.
- **Stack routes:** `src/app/respond/[id].jsx` handles the Echo response workflow, launched from the Discover list.

## Feature Modules
### Discover (Echo intake)
- File: `src/app/(tabs)/discover.jsx`
- Displays filterable list of open questions (currently mock data) and routes to `respond/[id]`.
- Pull-to-refresh + search scaffolding ready for real API wiring.

### Ask (Seeker flow)
- File: `src/app/(tabs)/ask.jsx`
- Provides map-driven location picker, bounty slider, and publish CTA (stubbed submit).
- Uses Google Maps Web JS on web (via Expo) and native map view on mobile (placeholder pending).

### Respond (Echo flow)
- File: `src/app/respond/[id].jsx`
- Coordinates location verification, capture session, and submission payload for each opportunity.
- Integrates the camera via `EchoCameraUnified`, manages capture state, description input, and mock payout confirmation.

## Camera Subsystem
The client camera abstraction lives in `src/components/**` and mirrors the architecture captured in `CAMERA_ARCHITECTURE.md`.

- `EchoCameraUnified.tsx` chooses between the native VisionCamera pipeline and the expo-camera fallback based on platform/Expo Go detection.
- `EchoCameraPro.tsx` (native) implements frame processors, SharedValue burst union, and upload handoff.
- `EchoCameraWebFixed.jsx` handles web preview + polling; it currently expects server-side processing results from `/api/process-image` and `/api/process-status/:jobId`.
- `EchoCameraCapture.jsx` & `EchoCameraCaptureFallback.jsx` deliver the best-available experience when VisionCamera cannot load.
- Utility hooks:
  - `src/utils/cameraChallenge.js` fetches `GET /api/camera/challenge` to display verification codes in the UI.
  - `src/utils/useUpload.js` handles uploads across native/web, calling the backend stubs described in `BACKEND_ARCHITECTURE.md:29`.

## Networking & Data
- **REST adapters:** The app currently calls backend endpoints directly via `fetch`. `/api/process-image` and `/api/process-status/:jobId` are invoked inside camera modules.
- **Environment config:** Expo exposes URLs through `app.config.js` and `.env` values (`EXPO_PUBLIC_BASE_URL`, `EXPO_PUBLIC_PROXY_BASE_URL`, `EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY`). These map to the backend host and Uploadcare integration.
- **Mock data:** `respond/[id].jsx` and `discover.jsx` still ship with hard-coded questions/rewards until API contracts are finalized.

## Styling & Theming
- `global.css` + `global.d.ts` configure fonts and CSS for the web build.
- `src/components/ui/` contains reusable primitives (`Button`, `Card`, `LoadingSpinner`, etc.).
- Camera overlays use `responsiveCameraStyles.js` to normalize dimensions between web and native, matching the mask expansion rules defined in `CAMERA_ARCHITECTURE.md:41`.

## Build & Tooling
- Expo CLI scripts defined in `package.json` (`expo start`, `expo run:ios`, `expo run:android`).
- Metro bundler configured via `metro.config.js` to support VisionCamera worklets and Skia.
- Babel config (`babel.config.js`) enables Reanimated + VisionCamera plugins required for frame processors.

## Current Limitations
- **Camera/Web backend handshake:** The web capture flow calls `/api/process-image`, but the backend returns stubbed responses when `ECHO_DEV_STUBS=true`. Without the real queue + Supabase wiring, the UI never receives a `completed` status with a valid `imageUrl`, leaving `EchoCameraWebFixed.jsx` stuck in a spinner state. Tracked in `BUGS_AND_ISSUES.md`.
- **Auth:** All API interactions use placeholder tokens; add Supabase auth or session handling once backend endpoints enforce real checks.
- **Data fetching:** Discover/Ask screens still show static data; swap to real API when endpoints are ready.
- **Form validation:** Minimal validation for bounty amounts, descriptions, and map selection.
- **Accessibility:** Need pass through for VoiceOver/TalkBack and descriptive text for icons.

## Next Steps
1. Wire Redux/zustand store to cache active questions and user wallet state.
2. Replace mock data with Supabase queries through a thin API client layer.
3. Integrate MediaPipe live detection overlay for web once the backend pipeline is stable.
4. Add automated tests (Jest + React Native Testing Library) for tab screens and camera state reducers.
5. Harden error surfaces so users see actionable messages when processing jobs fail.
