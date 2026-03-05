# Welcome to your Expo app 👋

# PROJECT ECHO: MASTER CONTEXT & ARCHITECTURE

**Act as a Senior React Native Engineer and System Architect.**
You are going to help me build an app called **"Echo"** from scratch.

## 1. THE CORE CONCEPT
"Echo" is an on-demand visual information marketplace.
- **User A (Requester):** Drops a pin on a map and pays **€0.50** to see a photo of that specific location right now.
- **User B (Echo Agent):** Physically located near that pin, receives a notification, takes the photo, and earns **€0.40**.
- **The Platform (Me):** Keeps **€0.10** per transaction.

## 2. CRITICAL BUSINESS RULES (NON-NEGOTIABLE)
1.  **Proximity Check:** The Agent MUST be within a specific radius (approx. 4-10 meters) of the target location to successfully submit the photo.
2.  **Ephemeral Content:** The Requester has **30 seconds** to view the photo. After that, it is **permanently deleted** from the server and device.
3.  **Privacy & Security:**
    - **NO Screenshots:** The app must block screen capture on the viewing screen.
    - **NO Gallery:** Photos are not saved to the Agent's or Requester's phone gallery.
4.  **Quality/Dispute:**
    - Requesters can "Report" a photo within the 30s window.
    - If reported, the Agent gets paid nothing.
    - No refunds for the Requester (to discourage spam and simplify logic).

## 3. THE TECH STACK
- **Framework:** React Native (Expo Managed Workflow).
- **Language:** JavaScript/TypeScript.
- **Maps:** `react-native-maps` (Provider: Google Maps).
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, Storage).
- **Payments:** Stripe.
- **Key Libraries:**
    - `expo-camera` (for capturing photos).
    - `expo-location` (for GPS validation).
    - `expo-screen-capture` (for privacy).

## 4. UX/UI FLOW (SIMPLIFIED)
We are avoiding complex AR overlays. We want a "Shoot & Verify" approach.
1.  **Map (Home):** User sees requests nearby.
2.  **Capture:** Agent accepts a job -> Camera opens -> Agent clicks shutter.
3.  **Validation (Background):** AT THE MOMENT of capture, the app checks GPS coordinates.
    - If distance > 10m: Error "Too far".
    - If distance < 10m: Success -> Send to Server.

## 5. CURRENT MISSION: PHASE 1 - SETUP & MAPS
We are starting now. Do not implement Backend or Camera yet.
**Goal:** Initialize the project, set up Navigation, and implement the Real Google Maps integration.

**Requirements for Phase 1:**
1.  Initialize a new Expo app.
2.  Setup `react-navigation` with a Bottom Tab Bar:
    - **Tab 1: Radar** (The Map Screen).
    - **Tab 2: Activity** (Messages/Jobs).
    - **Tab 3: Profile**.
3.  Implement `RadarScreen.js` using `react-native-maps` with `provider={PROVIDER_GOOGLE}`.
    - It must ask for location permissions.
    - It must show the User's current location.
    - Display some dummy "Request Pins" on the map to visualize the concept.

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
