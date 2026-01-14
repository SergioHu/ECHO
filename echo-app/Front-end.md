# ECHO APP - FRONT-END DEVELOPMENT ROADMAP

**CONTEXT FOR AI:**
We are building "Echo", an on-demand photo marketplace app using React Native (Expo).
- **Core Loop:** User requests photo -> Agent nearby takes photo -> User views for 30s.
- **Tech:** Expo, React Native Maps (Google), Expo Camera, React Navigation.
- **Design:** Minimalist, Urgent, High-Contrast (Dark Mode default).

---

## PHASE 1: PROJECT SCAFFOLDING & NAVIGATION
**Goal:** Set up the folder structure, install dependencies, and build the main Tab Navigation.

**PROMPT:**
```text
Act as a Senior React Native Engineer.
Initialize the project structure and navigation for the "Echo" app.

**1. Directory Structure:**
Set up the following folders inside `/src`:
- `/components` (Reusable UI like Buttons, Cards)
- `/screens` (Page views)
- `/navigation` (Navigators)
- `/constants` (Colors, Layout, Mock Data)
- `/hooks` (Custom logic)

**2. Dependencies:**
Assume I have installed: `react-navigation`, `safe-area-context`, `expo-vector-icons`.

**3. The Navigation Stack:**
Create a `RootNavigator` in `/src/navigation/AppNavigator.js`.
- It should use a `BottomTabNavigator` as the main entry.
- **Tabs:**
  1. **Radar** (Label: "Explore", Icon: Map) -> Maps to `RadarScreen.js` (Create placeholder).
  2. **Activity** (Label: "Activity", Icon: List) -> Maps to `ActivityScreen.js` (Create placeholder).
  3. **Profile** (Label: "Profile", Icon: User) -> Maps to `ProfileScreen.js` (Create placeholder).
- **Theme:** Dark Mode. Background color #121212. Tab Bar color #1E1E1E. Active Tint Color #00E5FF (Neon Blue).

**Output:**
Provide the code for `AppNavigator.js` and the 3 basic placeholder screens so the app runs without errors.
```

---

## PHASE 2: THE RADAR (HOME SCREEN)
**Goal:** Implement the Google Map with custom markers and the "Ask" button.

**PROMPT:**
```text
Now let's build the core screen: `RadarScreen.js`.

**Context:**
This screen shows the user's location and available "Photo Requests" (Pins) nearby.

**Requirements:**
1. **Map Component:**
   - Use `MapView` from `react-native-maps`.
   - Enable `provider={PROVIDER_GOOGLE}`.
   - Set `customMapStyle` to a dark theme JSON (generate a simple dark style).
   - Show User Location button and compass.

2. **Data (Mock):**
   - Create a file `/src/constants/mockData.js`.
   - Export an array `REQUESTS` with 5 objects: `{ id, lat, long, price: 0.50, title, urgent: boolean }`.

3. **Markers:**
   - Map through `REQUESTS` and render a `Marker` for each.
   - **Custom Marker UI:** Do not use the default pin. Create a custom view: A small circle container.
     - If `urgent` is true: Background Red.
     - If normal: Background Neon Blue.
     - Inside the circle: Display the price (e.g., "€0.50").

4. **"Ask Echo" Button:**
   - Create a Floating Action Button (FAB) at the bottom center (above the tab bar).
   - Style: Large circle, White background, Black "+" icon. Shadow elevation 5.

**Output:**
Provide the code for `RadarScreen.js` and `mockData.js`.
```

---

## PHASE 3: THE "POINT & SHOOT" CAMERA (UPDATED)
**Goal:** The streamlined camera flow with unified radar UI. Clean, minimal design.

**PROMPT:**
```text
We need to implement the job execution flow. Create a new screen: `CameraJobScreen.js`.
*Note: Add this screen to the Root Stack Navigator (not the Tab bar).*

**Features:**
1. **Camera View:**
   - Use `expo-camera`.
   - Fullscreen mode.
   - **Top-Left:** Close button with glass-morphism styling.
   - **Top-Left (below close button):** Single unified `PremiumRadar` component (130px) showing:
     - User position (blue dot)
     - Job location (gold dot)
     - Camera vision cone (rotates with device heading)
     - Distance indicator
     - Price tag
   - **Bottom:** Control panel with:
     - Status text (changes color when in range)
     - Job info pill (Job ID + Price)
     - Large shutter button (glows cyan when enabled)

2. **The Logic (Shoot & Verify):**
   - Use `expo-location` to get the current position continuously.
   - Watch device heading for camera cone rotation.
   - **Distance Function:** Implement the Haversine formula to calculate meters between User and Target.
   - **10-Meter Rule:** User MUST be within 10m to take photo.
   - **Flow:**
     - User approaches target location.
     - Status updates from "Move Xm closer" → "In range - Ready!"
     - Shutter button becomes enabled (cyan glow).
     - User taps Shutter -> Photo taken.
     - **IF Distance > 10m:** Show Toast "You are too far" (cannot take photo).
     - **IF Distance <= 10m:** Navigate to `AgentPreviewScreen` passing photo URI.

3. **React Native Bridge Type Safety:**
   - ALL numeric values passed to React Native components MUST use `parseFloat()`.
   - This prevents `java.lang.String cannot be cast to java.lang.Double` errors.
   - Critical locations:
     - Job coordinates (lat, lng, price)
     - Location updates
     - SVG dimensions and coordinates
     - Animated values

**Output:**
Provide the code for `CameraJobScreen.js` and `PremiumRadar.js` handling permissions, GPS tracking, and the unified radar UI.
```

---

## PHASE 4: THE 30-SECOND VIEWER (SECURITY)
**Goal:** The screen where the requester sees the photo. It must handle the timer and security.

**PROMPT:**
```text
Create the `PhotoViewerScreen.js`.
This is where the "Requester" views the photo they paid for.

**Critical Requirements:**
1. **Security (Anti-Screenshot):**
   - Use `expo-screen-capture`.
   - On `useEffect` mount: Call `preventScreenCaptureAsync()`.
   - On unmount: Call `allowScreenCaptureAsync()`.
   - Note: On iOS this might just blur the screen in multitasking, on Android it blocks capture.

2. **The Timer:**
   - Display a countdown timer at the top right: "30s".
   - It counts down automatically.
   - **At 0s:** The screen MUST close automatically (go back to navigation root) and trigger a function `deleteLocalFile()`.

3. **Report Button:**
   - Place a "Report / Flag" button at the bottom right.
   - On press: Show an Alert "Report this photo? Agent will not be paid."
   - If confirmed: Close screen immediately.

4. **Visuals:**
   - Image takes up full height.
   - Overlay a gradient at the top and bottom so text is readable.

**Output:**
Provide the code for `PhotoViewerScreen.js`.
```

---

## PHASE 5: PROFILE & EARNINGS
**Goal:** Simple gamification to keep the Agent engaged.

**PROMPT:**
```text
Implement the `ProfileScreen.js`.

**Layout:**
1. **Header:** Circular Avatar (placeholder) and Username "@EchoAgent".
2. **The "Money" Card:**
   - A large, distinct card at the top.
   - Display "Balance Available": **€12.40** (Green, Bold, Large Font).
   - Button: "Cash Out" (Stripe Purple color).

3. **Stats Grid:**
   - Row with 3 items: "Jobs Done (24)", "Rating (4.9)", "Missed (2)".

4. **Menu List:**
   - Simple `TouchableOpacity` rows for:
     - "Payment Settings"
     - "Notifications"
     - "Help & Support"
     - "Legal / Terms"

**Output:**
Provide the clean, styled code for `ProfileScreen.js`.
```

---

## PHASE 6: ACTIVITY SCREEN (NEW)
**Goal:** Implement the Activity List (Requests & Jobs).

**PROMPT:**
```text
Implement the `ActivityScreen.js`.

**Features:**
1. **Segmented Control:** "Requested" vs "Completed".
2. **List:** Mock activity feed.
3. **Design:** Consistent cards with icons and status colors.
```

---

## PHASE 7: UI REFINEMENTS & DEV TOOLS (COMPLETED)
**Goal:** Polish the UI, fix UX issues, and add developer tools.

**Implemented Features:**
1. **Agent Preview Screen:**
   - Separate flow for Agents (no timer).
   - "Retake" vs "Send Now" options.
   - Optional comment input.
   - Success message indicating pending approval.

2. **Report Reason Modal:**
   - Replaced simple alert with a Modal in `PhotoViewerScreen`.
   - Requires user to input a reason before reporting.

3. **Keyboard Handling:**
   - Fixed keyboard overlap in `CreateRequestSheet` (ScrollView + Padding).
   - Fixed keyboard overlap in `AgentPreviewScreen` (KeyboardAvoidingView).

4. **Developer Tools:**
   - Added "DEV: TEST VIEWER" button in `ProfileScreen` to quickly test the 30s timer flow.

---

## PHASE 8: CAMERA UI REDESIGN & TYPE SAFETY (COMPLETED)
**Goal:** Unify radar components and fix React Native Bridge type casting errors.

**Problems Solved:**
1. **Type Casting Crash:**
   - Fixed `java.lang.String cannot be cast to java.lang.Double` error.
   - Replaced all `Number()` calls with `parseFloat()` across the app.
   - Added input sanitization to all components receiving numeric props.
   - Fixed SVG `rotation` property (removed string interpolation).

2. **UI Simplification:**
   - Removed redundant components: `DirectionIndicator`, `DistanceProgressBar`, `AlignmentMiniMap`.
   - Created unified `PremiumRadar` component combining all functionality.
   - Redesigned `CameraJobScreen` with clean, minimal UI.

**Current Component Structure:**
```
CameraJobScreen.js
├── Top-Left: Close button
├── Top-Left (below): PremiumRadar (130px)
│   ├── User position (blue dot, center)
│   ├── Job position (gold dot, moves based on bearing/distance)
│   ├── Camera cone (rotates with device heading)
│   ├── Distance pill (shows meters, changes color when aligned)
│   └── Price tag
└── Bottom: Control panel
    ├── Status text ("Move Xm closer" / "In range - Ready!")
    ├── Job info pill (ID + Price)
    └── Shutter button (disabled/enabled based on distance)
```

**Type Safety Rules Applied:**
- All job coordinates: `parseFloat(job.lat)`, `parseFloat(job.lng)`, `parseFloat(job.price)`
- All location updates: `parseFloat(loc.coords.latitude)`
- All SVG dimensions: `parseFloat(size)`, `parseFloat(center)`
- All animated values: Passed directly (no string interpolation)
- All distance calculations: Return values wrapped in `parseFloat()`

**Files Modified:**
- `CameraJobScreen.js` - Redesigned with single radar
- `PremiumRadar.js` - New unified component (positioned top-left, 120px from top)
- `RadarScreen.js` - Type-safe job handling
- `AlignmentMiniMap.js` - Fixed SVG rotation (removed interpolate)
- `DistanceProgressBar.js` - Input sanitization
- `DirectionIndicator.js` - Price formatting
- `useKeyboardFooterOffset.js` - Keyboard height sanitization
