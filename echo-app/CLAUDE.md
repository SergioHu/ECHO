# ECHO Frontend - Claude Context

**Last Updated:** January 2025
**Framework:** React Native (Expo ~54.0.25)
**Language:** JavaScript/TypeScript

---

## QUICK REFERENCE

| Aspect | Details |
|--------|---------|
| **Framework** | React Native with Expo Managed Workflow |
| **Navigation** | React Navigation 7.x (Stack + Bottom Tabs) |
| **State** | React Context + Custom Hooks |
| **Maps** | react-native-maps (Google Maps Provider) |
| **Styling** | StyleSheet + Theme Constants |

---

## 1. PROJECT STRUCTURE

```
echo-app/
├── App.js                       # Entry point with providers
├── src/
│   ├── screens/                 # Main app screens
│   │   ├── RadarScreen.js       # Map view (home) - 23.9 KB
│   │   ├── ActivityScreen.js    # Job history with tabs
│   │   ├── ProfileScreen.js     # User profile + settings
│   │   ├── CameraJobScreen.js   # Agent capture flow - 15.8 KB
│   │   ├── PhotoViewerScreen.js # Requester 3-min viewer - 15.2 KB
│   │   ├── AgentPreviewScreen.js# Agent submission preview
│   │   ├── PreviewScreen.js     # Photo preview before submit
│   │   ├── AuthScreen.js        # Login/Signup
│   │   ├── SplashScreen.js      # Loading screen
│   │   ├── OnboardingScreen.js  # First-time tutorial
│   │   └── admin/               # Admin dashboard screens
│   │       ├── AdminDashboard.js
│   │       ├── PhotoReviewer.js
│   │       ├── DisputesList.js
│   │       ├── DisputeReview.js
│   │       ├── ManageUsers.js
│   │       ├── Analytics.js
│   │       └── CreateTestJob.js
│   │
│   ├── components/              # Reusable UI components
│   │   ├── PremiumRadar.js      # Unified radar with job tracking - 9.8 KB
│   │   ├── CreateRequestSheet.js# Bottom sheet for new requests - 16.6 KB
│   │   ├── JobOfferSheet.js     # Agent job acceptance UI - 6.5 KB
│   │   ├── ViewTimer.js         # Timer display component
│   │   ├── EchoButton.js        # Styled button
│   │   ├── EchoModal.js         # Modal component
│   │   ├── EchoToast.js         # Toast notifications
│   │   ├── InfoModal.js         # Info modal with tokens
│   │   ├── MiniMap.js           # Small map visualization
│   │   ├── MapCrosshair.js      # Center alignment indicator
│   │   ├── ExpandedMapModal.js  # Full-screen map picker
│   │   └── admin/               # Admin-specific components
│   │       ├── StatCard.js
│   │       └── PhotoCard.js
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── index.js             # Exports all hooks
│   │   ├── useNearbyRequests.js # Fetch nearby jobs
│   │   ├── useCreateRequest.js  # Create photo requests
│   │   ├── useLockRequest.js    # Accept jobs
│   │   ├── useSubmitPhoto.js    # Upload photos
│   │   ├── useViewSession.js    # 3-min viewing timer
│   │   ├── useMyActivity.js     # User activity feed
│   │   ├── useProfile.js        # Profile data
│   │   ├── useReportPhoto.js    # Report photos
│   │   ├── useAdminStats.js     # Admin dashboard
│   │   ├── useAdminDisputes.js  # Dispute management
│   │   ├── useAdminUsers.js     # User management
│   │   ├── useAdminPhotos.js    # Photo moderation
│   │   ├── useAdminAnalytics.js # Analytics data
│   │   └── useKeyboardFooterOffset.js
│   │
│   ├── context/                 # React Context providers
│   │   ├── AuthContext.js       # Authentication state
│   │   ├── PhotoTimerContext.js # Timer state management
│   │   └── ToastContext.js      # Toast notifications
│   │
│   ├── lib/
│   │   └── supabase.js          # Supabase client config
│   │
│   ├── store/
│   │   └── jobStore.js          # Local job state (pub/sub)
│   │
│   ├── constants/
│   │   ├── theme.js             # Colors, fonts, spacing
│   │   ├── mockData.js          # Test data
│   │   └── mapStyle.js          # Dark map theme JSON
│   │
│   ├── navigation/
│   │   └── AppNavigator.js      # Navigation configuration
│   │
│   └── utils/
│       ├── navigationRef.js     # Navigation helpers
│       ├── mapUtils.js          # Map helper functions
│       └── adminHelpers.js      # Admin mock data
│
├── assets/                      # Images, fonts, icons
├── supabase/                    # Backend migrations
├── app.json                     # Expo configuration
├── package.json                 # Dependencies
└── .env                         # Environment variables
```

---

## 2. NAVIGATION STRUCTURE

```
RootNavigator (Stack)
│
├── SplashScreen (initial)
│
├── OnboardingScreen (first launch only)
│
├── AuthScreen (if not authenticated)
│
├── MainTabs (Bottom Tab Navigator)
│   ├── Radar (RadarScreen)          # Tab 1: Map view
│   ├── Activity (ActivityScreen)    # Tab 2: Job history
│   └── Profile (ProfileScreen)      # Tab 3: User profile
│
├── CameraJobScreen (modal)          # Agent capture flow
├── PhotoViewerScreen (modal)        # Requester viewer
├── AgentPreviewScreen (modal)       # Agent preview
├── PreviewScreen (modal)            # Photo preview
│
└── Admin Screens (from Profile)
    ├── AdminDashboard
    ├── PhotoReviewer
    ├── DisputesList
    ├── DisputeReview
    ├── ManageUsers
    ├── Analytics
    └── CreateTestJob
```

---

## 3. DESIGN SYSTEM

### Color Palette (Dark Mode)
```javascript
// From constants/theme.js
export const COLORS = {
  // Base
  background: '#121212',      // Main background
  surface: '#1E1E1E',         // Cards, sheets
  surfaceLight: '#2A2A2A',    // Elevated surfaces

  // Accent
  accent: '#00E5FF',          // Primary cyan
  accentDark: '#00B8D4',      // Darker cyan

  // Status
  success: '#34C759',         // Green
  warning: '#FFD60A',         // Yellow
  danger: '#FF3B30',          // Red

  // Special
  gold: '#FFD700',            // Job markers
  stripe: '#635BFF',          // Payment purple

  // Text
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',
};
```

### Typography
```javascript
export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
  title: 32,
};
```

### Spacing
```javascript
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
```

---

## 4. KEY COMPONENTS

### PremiumRadar
Unified radar component showing job tracking during camera flow.

```javascript
<PremiumRadar
  userLat={currentPosition.latitude}
  userLng={currentPosition.longitude}
  jobLat={job.lat}
  jobLng={job.lng}
  heading={deviceHeading}
  distance={distanceToJob}
  price={job.price}
  size={130}
/>
```

**Features:**
- User position (blue dot at center)
- Job position (gold dot, moves with bearing/distance)
- Camera vision cone (rotates with device heading)
- Distance pill (color changes when aligned)
- Price tag display

### ViewTimer
Display-only timer component for photo viewing.

```javascript
<ViewTimer
  jobId={photoId}
  onExpire={() => handleExpiration()}
/>
```

**States:**
- Normal: White text
- Warning (≤30s): Yellow pulsing
- Critical (≤10s): Red pulsing

### JobOfferSheet
Bottom sheet for accepting jobs.

```javascript
<JobOfferSheet
  visible={showSheet}
  job={selectedJob}
  onAccept={() => handleAccept()}
  onClose={() => setShowSheet(false)}
/>
```

### CreateRequestSheet
Bottom sheet for creating new photo requests.

```javascript
<CreateRequestSheet
  visible={showCreate}
  location={selectedLocation}
  onSubmit={(data) => handleCreate(data)}
  onClose={() => setShowCreate(false)}
/>
```

---

## 5. HOOKS REFERENCE

### Authentication
```javascript
import { useAuth } from '../context/AuthContext';

const { user, profile, signIn, signUp, signOut, loading } = useAuth();
```

### Nearby Requests
```javascript
import { useNearbyRequests } from '../hooks';

const { requests, loading, error, refetch } = useNearbyRequests(
  userLat,
  userLng,
  radiusMeters  // default: 5000
);
```

### Create Request
```javascript
import { useCreateRequest } from '../hooks';

const { createRequest, loading, error } = useCreateRequest();

await createRequest({
  latitude: 40.7128,
  longitude: -74.0060,
  description: 'Photo of building entrance',
  priceCents: 50,
  category: 'general',
});
```

### Lock Request (Accept Job)
```javascript
import { useLockRequest } from '../hooks';

const { lockRequest, loading, error } = useLockRequest();

const result = await lockRequest(requestId);
// result.success or result.error
```

### Submit Photo
```javascript
import { useSubmitPhoto } from '../hooks';

const { submitPhoto, uploading, error } = useSubmitPhoto();

await submitPhoto({
  requestId,
  photoUri: 'file://...',
  latitude: agentLat,
  longitude: agentLng,
});
```

### View Session
```javascript
import { useViewSession } from '../hooks';

const {
  startSession,
  photoUrl,
  timeRemaining,
  isExpired,
  loading
} = useViewSession(photoId);

await startSession();
// timeRemaining counts down from 180000ms (3 min)
```

### My Activity
```javascript
import { useMyActivity } from '../hooks';

const { myRequests, myJobs, loading, refetch } = useMyActivity();
```

---

## 6. CONTEXT PROVIDERS

### App.js Provider Structure
```javascript
// App.js
export default function App() {
  return (
    <AuthProvider>
      <PhotoTimerProvider>
        <ToastProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </ToastProvider>
      </PhotoTimerProvider>
    </AuthProvider>
  );
}
```

### PhotoTimerContext
Manages timer state across screens (keyed by jobId).

```javascript
import { usePhotoTimer } from '../context/PhotoTimerContext';

const {
  getTimeRemaining,   // (jobId) => milliseconds
  startTimer,         // (jobId, seconds, forceReset?)
  isJobExpired,       // (jobId) => boolean
  clearTimer,         // (jobId)
} = usePhotoTimer();
```

### ToastContext
Global toast notification system.

```javascript
import { useToast } from '../context/ToastContext';

const { showToast } = useToast();

showToast('Photo submitted successfully!', 'success');
showToast('You are too far from the target', 'error');
showToast('Processing...', 'info');
```

---

## 7. CRITICAL TYPE SAFETY RULES

### The Problem
React Native Bridge (JavaScript ↔ Native) requires strict numeric typing.
Android Java expects `Double` type, not strings.

### The Error
```
java.lang.String cannot be cast to java.lang.Double
```

### The Solution
**ALWAYS use `parseFloat()` with fallbacks:**

```javascript
// ❌ WRONG - Will crash on Android
const lat = Number(job.lat);
const size = job.size;
<MapView latitude={lat} />

// ✅ CORRECT - Always safe
const lat = parseFloat(job.lat) || 0;
const size = parseFloat(job.size) || 100;
<MapView latitude={lat} />
```

### Apply To:
- All coordinates (latitude, longitude)
- All SVG dimensions and positions
- All animated values
- All prices and numeric props
- Distance calculations
- Timer values

### Locations That Need parseFloat():
```javascript
// Job data
parseFloat(job.lat) || 0
parseFloat(job.lng) || 0
parseFloat(job.price) || 0.5

// Location updates
parseFloat(location.coords.latitude)
parseFloat(location.coords.longitude)

// SVG components
parseFloat(size) || 100
parseFloat(center) || 50

// Distance calculations
return parseFloat(distanceInMeters);
```

---

## 8. SCREEN IMPLEMENTATIONS

### RadarScreen (Map Home)
**Purpose:** Display map with nearby job markers

**Key Features:**
- Google Maps with dark theme
- Custom markers (price bubbles)
- User location tracking
- "Ask Echo" FAB button
- Job selection → JobOfferSheet

**State:**
- `userLocation` - Current GPS position
- `selectedJob` - Job for sheet display
- `showCreateSheet` - Create request modal

### CameraJobScreen (Agent Capture)
**Purpose:** Agent takes photo for accepted job

**Key Features:**
- Full-screen camera
- PremiumRadar overlay (top-left)
- Real-time distance tracking
- Shutter enabled only within 10m
- Heading-based camera cone

**Flow:**
1. Load job details
2. Start GPS tracking
3. Display PremiumRadar
4. Enable shutter when distance ≤ 10m
5. Capture → Navigate to preview

### PhotoViewerScreen (Requester View)
**Purpose:** Requester views delivered photo

**Key Features:**
- 3-minute countdown timer
- Screenshot blocking (expo-screen-capture)
- Report functionality
- Auto-close on expiry
- Gradient overlays for UI

**Security:**
```javascript
useEffect(() => {
  ScreenCapture.preventScreenCaptureAsync();
  return () => {
    ScreenCapture.allowScreenCaptureAsync();
  };
}, []);
```

### ActivityScreen
**Purpose:** Show user's job history

**Tabs:**
- **Requested:** Photos user paid for
- **Completed:** Jobs user completed as agent

**Features:**
- Pull-to-refresh
- Timer display for active photos
- VIEW PHOTO button for delivered photos
- Status badges

---

## 9. DISTANCE CALCULATIONS

### Haversine Formula
```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat(R * c); // Distance in meters
}
```

### Bearing Calculation
```javascript
function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  return parseFloat(((θ * 180) / Math.PI + 360) % 360);
}
```

---

## 10. TESTING

### Start Development Server
```bash
cd echo-app
npm start
```

### Test on Devices
```bash
npm run android    # Android emulator
npm run ios        # iOS simulator
npm run web        # Web browser
```

### Test Photo Viewer Flow
1. Navigate to Activity tab
2. Tap on a delivered photo card
3. Observe 3-minute countdown
4. Check warning states (30s, 10s)
5. Verify auto-close on expiry

### Test Camera Flow
1. Open Radar screen
2. Tap any job marker
3. Accept job in JobOfferSheet
4. Navigate with PremiumRadar
5. Get within 10m
6. Capture and submit photo

### Test Admin Dashboard
1. Ensure user has admin role
2. Navigate to Profile
3. Tap Admin Dashboard
4. Test dispute resolution
5. Test user management

---

## 11. COMMON ISSUES & SOLUTIONS

### Issue: Map Not Loading
**Solution:** Check Google Maps API key in app.json

### Issue: Location Permission Denied
**Solution:** Handle gracefully with fallback UI

### Issue: Camera Permission Denied
**Solution:** Show permission request modal

### Issue: Type Casting Crash (Android)
**Solution:** Use `parseFloat()` for all numeric props

### Issue: Timer Not Syncing
**Solution:** Use PhotoTimerContext with jobId keys

### Issue: Photos Not Loading
**Solution:** Check Supabase Storage signed URL expiry

---

## 12. ENVIRONMENT SETUP

### Required Environment Variables
```env
# .env file
EXPO_PUBLIC_SUPABASE_URL=https://dyywmbrxvypnpvuygqub.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### app.json Configuration
```json
{
  "expo": {
    "name": "Echo",
    "slug": "echo-app",
    "plugins": [
      ["expo-camera", { "cameraPermission": "..." }],
      ["expo-location", { "locationWhenInUsePermission": "..." }]
    ],
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
        }
      }
    },
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY"
      }
    }
  }
}
```

---

**For backend documentation, see:** `/echo-app/supabase/CLAUDE.md`
**For main project context, see:** `/CLAUDE.md`
