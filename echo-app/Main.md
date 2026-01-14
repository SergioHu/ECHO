# PROJECT ECHO: MASTER CONTEXT & ARCHITECTURE

**Act as a Senior React Native Engineer and System Architect.**
You are going to help me build an app called **"Echo"** from scratch.

## 1. THE CORE CONCEPT
"Echo" is an on-demand visual information marketplace.
- **User A (Requester):** Drops a pin on a map and pays **€0.50** to see a photo of that specific location right now.
- **User B (Echo Agent):** Physically located near that pin, receives a notification, takes the photo, and earns **€0.40**.
- **The Platform (Me):** Keeps **€0.10** per transaction.

## 2. CRITICAL BUSINESS RULES (NON-NEGOTIABLE)
1.  **Proximity Check:** The Agent MUST be within a specific radius (approx. 10 meters) of the target location to successfully submit the photo.
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
    - `react-native-svg` (for custom radar UI).

### 3.1 CRITICAL: React Native Bridge Type Safety
**Problem:** React Native Bridge (JavaScript ↔ Native Code) requires strict type safety for numeric values.
**Solution:** ALL numeric values passed to React Native components MUST use `parseFloat()` instead of `Number()`.

**Why this matters:**
- Android Java code expects `Double` type for numeric props
- If you pass a string (even "123"), it will crash: `java.lang.String cannot be cast to java.lang.Double`
- This affects: coordinates, dimensions, prices, animated values, SVG properties

**Rule of thumb:**
```javascript
// ❌ BAD - Can cause crashes
const lat = Number(job.lat);
const size = job.size;
<View width={size} />

// ✅ GOOD - Always safe
const lat = parseFloat(job.lat) || 0;
const size = parseFloat(job.size) || 100;
<View width={size} />
```

## 4. UX/UI FLOW (SIMPLIFIED)
We are avoiding complex AR overlays. We want a "Shoot & Verify" approach with unified radar UI.
1.  **Map (Home):** User sees requests nearby.
2.  **Capture:** Agent accepts a job -> Camera opens with PremiumRadar showing:
    - User position (blue dot)
    - Job location (gold dot)
    - Camera vision cone (rotates with device heading)
    - Real-time distance tracking
    - Status indicator ("Move Xm closer" → "In range - Ready!")
3.  **Validation (Real-Time):** The app continuously checks GPS coordinates:
    - If distance > 10m: Shutter button disabled (gray).
    - If distance <= 10m: Shutter button enabled (cyan glow) -> Agent can take photo.
    - After photo: Navigate to preview screen for submission.

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
