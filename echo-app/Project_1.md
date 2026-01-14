# ECHO - COMPREHENSIVE PROJECT CONTEXT FOR CLAUDE & AGENTS

**Last Updated:** December 22, 2025
**Project Status:** Phase 9 Complete - Photo Viewing & Profile Payout UI

---

## TABLE OF CONTENTS
1. [Project Overview](#1-project-overview)
2. [Core Concept & Business Rules](#2-core-concept--business-rules)
3. [Technical Architecture](#3-technical-architecture)
4. [Frontend Implementation](#4-frontend-implementation)
5. [Backend Architecture](#5-backend-architecture)
6. [Project Structure](#6-project-structure)
7. [Development Roadmap](#7-development-roadmap)
8. [Getting Started](#8-getting-started)
9. [Critical Guidelines](#9-critical-guidelines)

---

## 1. PROJECT OVERVIEW

**Echo** is an on-demand visual information marketplace built with React Native (Expo). The app enables real-time photo requests at specific geographic locations, connecting requesters with nearby agents who can capture and deliver photos within seconds.

### The Value Proposition
- **For Requesters:** Get instant visual information about any location for €0.50
- **For Agents:** Earn €0.40 per photo by being in the right place at the right time
- **For Platform:** 20% commission (€0.10 per transaction)

### Key Differentiators
- **Ephemeral Content:** Photos self-destruct after 30 seconds
- **Location Verified:** GPS-enforced proximity requirements (10-meter radius)
- **Privacy First:** Screenshot blocking and no gallery saves
- **Minimal UI:** Dark mode, high-contrast, urgency-driven design

---

## 2. CORE CONCEPT & BUSINESS RULES

### User Flow
1. **Requester** drops a pin on a map and pays €0.50
2. **Nearby Agent** receives notification and accepts the job
3. **Agent** navigates to location (within 10 meters)
4. **Agent** captures and submits photo
5. **Requester** views photo for exactly 30 seconds
6. **Photo** is permanently deleted from all systems

### NON-NEGOTIABLE BUSINESS RULES

#### Rule 1: The 10-Meter Proximity Check
- Agents MUST be within 10 meters of target coordinates to submit photos
- Validated client-side in real-time (shutter button disabled/enabled)
- Re-validated server-side via PostGIS
- Uses Haversine formula for distance calculation

#### Rule 2: The 3-Minute Ephemeral Window
- Photos are viewable for EXACTLY 3 minutes (180 seconds)
- After expiration, photos are PERMANENTLY deleted from:
  - Supabase Storage
  - Database records
  - Local device cache
- Timer starts on first view
- Warning at 30 seconds remaining
- Critical state at 10 seconds remaining

#### Rule 3: Privacy & Security
- **NO Screenshots:** `expo-screen-capture` blocks screen recording
- **NO Gallery Saves:** Photos never touch device gallery
- **NO Downloads:** No export or save functionality

#### Rule 4: Quality Control & Disputes
- Requesters can report photos within the 30-second window
- Reported photos: Agent receives €0.00
- NO REFUNDS for requesters (discourages spam/abuse)

#### Rule 5: Payment Split
- Total Transaction: €0.50
- Agent Earnings: €0.40 (80%)
- Platform Revenue: €0.10 (20%)

---

## 3. TECHNICAL ARCHITECTURE

### Technology Stack

#### Frontend (React Native - Expo)
- **Framework:** Expo ~54.0 (Managed Workflow)
- **Language:** JavaScript (TypeScript configured)
- **Navigation:** React Navigation 7.x (Stack + Bottom Tabs)
- **Maps:** `react-native-maps` (Google Maps Provider)
- **Camera:** `expo-camera` v17
- **Location:** `expo-location` v19
- **Security:** `expo-screen-capture` v8

#### Backend (Supabase)
- **Database:** PostgreSQL with PostGIS extension
- **Auth:** Supabase Auth (Email/Password)
- **Storage:** Supabase Storage (temporary photo bucket)
- **Functions:** Supabase Edge Functions (Deno/TypeScript)
- **Payments:** Stripe PaymentIntents API

#### Key Dependencies
```json
{
  "expo": "~54.0.25",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "react-native-maps": "1.20.1",
  "react-native-svg": "^15.15.0",
  "@react-navigation/native": "^7.1.20",
  "@react-navigation/bottom-tabs": "^7.8.5",
  "@react-navigation/stack": "^7.6.4"
}
```

### Critical: React Native Bridge Type Safety

**PROBLEM:** JavaScript ↔ Native Bridge requires strict numeric typing.

**SYMPTOMS:**
```
java.lang.String cannot be cast to java.lang.Double
```

**SOLUTION:** ALWAYS use `parseFloat()` instead of `Number()` or string values.

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

**Apply to:**
- All coordinates (latitude, longitude)
- All SVG dimensions and positions
- All animated values
- All prices and numeric props
- All distance calculations

---

## 4. FRONTEND IMPLEMENTATION

### Current Implementation Status

#### ✅ COMPLETED (Phases 1-8)

**Phase 1: Project Scaffolding & Navigation**
- Bottom Tab Navigator (Radar, Activity, Profile)
- Dark mode theme system
- Basic screen placeholders

**Phase 2: Radar Screen (Home)**
- Google Maps integration with dark theme
- Custom marker rendering (price bubbles)
- Mock data for testing
- Floating "Ask Echo" button

**Phase 3: Camera & GPS System**
- Full-screen camera with unified radar UI
- Real-time GPS tracking and heading detection
- Distance calculation (Haversine formula)
- `PremiumRadar` component showing:
  - User position (blue dot)
  - Job position (gold dot)
  - Camera vision cone (heading-based rotation)
  - Distance indicator with color coding
  - Price tag display

**Phase 4: Photo Viewer Security**
- 3-minute countdown timer (180 seconds)
- Screenshot prevention (`expo-screen-capture`)
- Auto-close and file deletion on expiration
- Report functionality with reason modal

**Phase 5: Profile & Earnings**
- Balance display with cash-out button
- Stats grid (jobs, rating, missed)
- Settings menu

**Phase 6: Activity Screen**
- Segmented control (Requested/Completed)
- Activity feed with mock data

**Phase 7: UI Refinements**
- Agent preview screen (separate from requester flow)
- Keyboard handling improvements
- Developer test tools

**Phase 8: Camera UI Redesign & Type Safety**
- Fixed all React Native Bridge type casting errors
- Unified radar component (`PremiumRadar`)
- Removed redundant UI components
- Clean, minimal camera interface

**Phase 9: Photo Viewing & Profile Payout UI**
- Unified `ViewTimer` component (display-only, keyed by jobId)
- `PhotoTimerContext` for centralized timer state management
- Timer warning thresholds: ≤30s (yellow), ≤10s (critical red)
- `InfoModal` component with `MODAL_TOKENS` and `dismissBehavior`
- Profile screen: payout-first menu, verification badge, Cash Out CTA
- Admin dashboard gating (isAdmin flag)
- Screenshot blocking with Security Alert overlay

### Architecture Patterns

#### Component Structure
```
src/
├── components/          # Reusable UI components
│   ├── PremiumRadar.js           # Unified radar with job tracking
│   ├── CreateRequestSheet.js     # Bottom sheet for new requests
│   ├── JobOfferSheet.js          # Agent job acceptance UI
│   ├── EchoButton.js             # Styled button component
│   ├── EchoModal.js              # Legacy modal (Camera flows)
│   ├── InfoModal.js              # NEW: Modal with MODAL_TOKENS & dismissBehavior
│   ├── ViewTimer.js              # Unified timer display (display-only)
│   ├── EchoToast.js              # Toast notification system
│   └── onboarding/               # Onboarding components folder
├── screens/             # Main app screens
│   ├── RadarScreen.js            # Map view (home)
│   ├── CameraJobScreen.js        # Agent capture flow
│   ├── PhotoViewerScreen.js      # Requester 3-min viewer
│   ├── AgentPreviewScreen.js     # Agent submission preview
│   ├── ActivityScreen.js         # Job history with timer display
│   └── ProfileScreen.js          # Payout-first profile
├── navigation/
│   └── AppNavigator.js           # Main navigation config
├── constants/
│   ├── theme.js                  # Colors, fonts, spacing
│   ├── mockData.js               # Test data
│   └── mapStyle.js               # Dark map theme
├── context/
│   ├── ToastContext.js           # Global toast provider
│   └── PhotoTimerContext.js      # Timer state management (keyed by jobId)
├── hooks/
│   └── useKeyboardFooterOffset.js # Keyboard spacing utility
└── utils/
    └── navigationRef.js          # Navigation helpers
```

#### Design System (Dark Mode)
```javascript
// From theme.js
export const COLORS = {
  background: '#121212',
  surface: '#1E1E1E',
  accent: '#00E5FF',      // Neon Cyan
  danger: '#FF3B30',      // Red
  success: '#34C759',     // Green
  gold: '#FFD700',        // Gold (for job markers)
  text: '#FFFFFF',
  textSecondary: '#A0A0A0'
};
```

### Navigation Flow

```
RootNavigator (Stack)
├── MainTabs (Bottom Tabs)
│   ├── Radar (RadarScreen)
│   ├── Activity (ActivityScreen)
│   └── Profile (ProfileScreen)
├── CameraJobScreen (Modal)
├── PhotoViewerScreen (Modal)
└── AgentPreviewScreen (Modal)
```

### State Management
- **Local State:** React useState/useReducer
- **Context:** Toast notifications, Photo timer
- **Navigation:** React Navigation native state
- **Future:** Consider Zustand or Redux for complex backend integration

---

## 5. BACKEND ARCHITECTURE

### Database Schema (PostgreSQL + PostGIS)

#### Table: `profiles`
Extends Supabase `auth.users` with app-specific data.
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  balance DECIMAL(10,2) DEFAULT 0,
  reputation INTEGER DEFAULT 0,
  is_agent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `requests`
Job postings from requesters.
```sql
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES profiles(id),
  location GEOGRAPHY(Point) NOT NULL,  -- PostGIS type
  title TEXT,
  price DECIMAL(5,2) DEFAULT 0.50,
  status VARCHAR(20) DEFAULT 'open',   -- 'open', 'locked', 'fulfilled', 'expired'
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `photos`
Ephemeral photo records.
```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id),
  agent_id UUID REFERENCES profiles(id),
  storage_path TEXT NOT NULL,
  expires_at TIMESTAMP,                -- Set to NOW() + 30s on first view
  is_reported BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Row Level Security (RLS)

**Profiles:**
- Read: Public
- Update: Own profile only

**Requests:**
- Read: All authenticated users
- Insert: Authenticated users only
- Update: Owner only

**Photos:**
- Insert: Only if within 10m (validated by DB function)
- Select: Only requester AND not expired
- Delete: Automatic via `pg_cron` cleanup job

### Supabase Edge Functions

#### 1. `create-order`
**Trigger:** Requester creates new photo request
**Flow:**
1. Create Stripe PaymentIntent (€0.50)
2. Insert row into `requests` table
3. Return `client_secret` for frontend payment

#### 2. `submit-photo`
**Trigger:** Agent uploads captured photo
**Flow:**
1. Verify GPS distance (server-side double-check)
2. Upload to Supabase Storage
3. Insert record into `photos` table
4. Update `requests.status` to 'fulfilled'
5. Credit agent: `UPDATE profiles SET balance = balance + 0.40`

#### 3. `cleanup-cron`
**Trigger:** Scheduled every 60 seconds via `pg_cron`
**Flow:**
1. Query `photos` where `expires_at < NOW()`
2. Delete files from Storage bucket
3. Delete rows from `photos` table
4. Log cleanup count for monitoring

### PostGIS Functions

#### `is_within_range(lat, lng, request_id)`
```sql
CREATE FUNCTION is_within_range(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  req_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  target_location GEOGRAPHY;
  distance_meters DOUBLE PRECISION;
BEGIN
  SELECT location INTO target_location
  FROM requests WHERE id = req_id;

  distance_meters := ST_Distance(
    ST_MakePoint(user_lng, user_lat)::geography,
    target_location
  );

  RETURN distance_meters <= 10;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. PROJECT STRUCTURE

### Directory Tree
```
ECHO/
├── echo-app/                    # Main React Native app
│   ├── src/
│   │   ├── components/          # 14 reusable components
│   │   ├── screens/             # 7 main screens
│   │   ├── navigation/          # Navigation setup
│   │   ├── constants/           # Theme, mock data, map styles
│   │   ├── context/             # React Context providers
│   │   ├── hooks/               # Custom React hooks
│   │   └── utils/               # Helper functions
│   ├── assets/                  # Images, fonts, icons
│   ├── App.js                   # Entry point
│   ├── package.json
│   ├── app.json                 # Expo configuration
│   ├── Main.md                  # Architecture overview
│   ├── Front-end.md             # Frontend roadmap
│   ├── Backend.md               # Backend specs
│   ├── README.md                # Quick start
│   └── Claude.md                # This file
├── src/                         # Backend code (future)
│   └── components/
└── .claude/                     # Claude Code config
```

### Key Files

**Entry Point:**
- `App.js` - Initializes navigation and providers

**Navigation:**
- `src/navigation/AppNavigator.js` - Main navigator setup

**Core Screens:**
- `RadarScreen.js` - Map interface (23.9 KB)
- `CameraJobScreen.js` - Agent capture flow (15.8 KB)
- `PhotoViewerScreen.js` - 30s viewer (15.2 KB)

**Core Components:**
- `PremiumRadar.js` - Unified radar UI (9.8 KB)
- `CreateRequestSheet.js` - Request creation (16.6 KB)
- `JobOfferSheet.js` - Job acceptance UI (6.5 KB)

**Configuration:**
- `constants/theme.js` - Design tokens
- `constants/mockData.js` - Test data
- `constants/mapStyle.js` - Dark map theme

---

## 7. DEVELOPMENT ROADMAP

### ✅ COMPLETED

**Phase 1:** Project Scaffolding & Navigation
**Phase 2:** Radar Screen (Google Maps)
**Phase 3:** Camera & GPS System
**Phase 4:** Photo Viewer Security
**Phase 5:** Profile & Earnings
**Phase 6:** Activity Screen
**Phase 7:** UI Refinements & Dev Tools
**Phase 8:** Camera UI Redesign & Type Safety
**Phase 9:** Photo Viewing & Profile Payout UI

### 🚧 IN PROGRESS

**Phase 10:** Backend Integration (Supabase)
- Database schema setup
- PostGIS configuration
- Auth implementation
- Storage bucket creation

### 📋 TODO

**Phase 11:** Stripe Integration
- PaymentIntent flow
- Card input UI
- Payment confirmation
- Balance management

**Phase 12:** Real-time Features
- Push notifications (agent job alerts)
- Live job status updates
- Real-time distance tracking

**Phase 13:** Production Prep
- Error tracking (Sentry)
- Analytics (Mixpanel/Amplitude)
- Performance optimization
- App Store/Play Store deployment

**Phase 14:** Advanced Features
- Agent reputation system
- Requester history & favorites
- Photo quality ratings
- Multi-photo requests

---

## 8. GETTING STARTED

### Prerequisites
- Node.js 18+ (currently using v24.11.1)
- Expo CLI
- Android Studio (for Android) or Xcode (for iOS)
- Expo Go app on mobile device (for testing)

### Installation
```bash
cd /mnt/c/Users/ferre/Desktop/ECHO/echo-app
npm install
```

### Development
```bash
# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```

### Testing Key Features

**Test Photo Viewer (3-minute Timer):**
1. Open app
2. Navigate to Activity tab
3. Tap on a delivered photo card
4. Observe 3-minute countdown, warning at 30s, auto-close on expiry

**Test Camera Flow:**
1. Open Radar screen
2. Tap any job marker
3. Accept job in JobOfferSheet
4. Navigate with PremiumRadar to get within range
5. Capture photo when enabled
6. Preview and submit

### Environment Setup

**Required API Keys:**
```bash
# Google Maps
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here

# Supabase (when implemented)
EXPO_PUBLIC_SUPABASE_URL=your_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key_here

# Stripe (when implemented)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_key_here
```

---

## 9. CRITICAL GUIDELINES

### For Claude & All Agents

#### Type Safety Rules
1. **ALWAYS** use `parseFloat()` for numeric values passed to React Native components
2. **NEVER** pass string interpolations to native components
3. **ALWAYS** provide fallback values: `parseFloat(value) || 0`
4. Test on Android to catch type casting errors early

#### Code Quality Standards
1. Follow existing patterns in the codebase
2. Maintain dark mode theme consistency
3. Use theme.js constants for colors/spacing
4. Add comments for complex logic (GPS, distance calculations)
5. Keep components under 300 lines (refactor if larger)

#### Security Considerations
1. Never log sensitive data (coordinates, user IDs)
2. Always validate GPS coordinates server-side
3. Implement proper error boundaries
4. Handle camera/location permission denials gracefully

#### Performance Best Practices
1. Memoize expensive calculations (distance, bearing)
2. Throttle GPS updates (1-second intervals)
3. Optimize map re-renders
4. Lazy load screens and components
5. Use React.memo for pure components

#### Testing Strategy
1. Test on both iOS and Android
2. Test with mock data before backend integration
3. Test edge cases (permissions denied, GPS unavailable)
4. Test timer accuracy (3-minute countdown with 30s/10s warnings)
5. Test proximity validation (10m threshold)

### Current Known Issues
- None (all resolved)

### Admin Dashboard Access
- `MOCK_USER.isAdmin = true` for dev/testing
- Admin Dashboard is CRITICAL for reviewing reported photos
- In production: Replace with backend role check (`user.role === 'reviewer' || 'admin'`)

### Future Considerations
1. **Offline Mode:** Handle network disconnections gracefully
2. **Battery Optimization:** Reduce GPS polling when not in active job
3. **Accessibility:** Add screen reader support
4. **Internationalization:** Support multiple languages
5. **Rate Limiting:** Prevent spam requests

---

## APPENDIX: USEFUL CONTEXT

### Mock Data Structure
```javascript
// From constants/mockData.js
export const MOCK_REQUESTS = [
  {
    id: '1',
    lat: parseFloat('38.7169'),
    lng: parseFloat('-9.1399'),
    price: parseFloat('0.50'),
    title: 'Belém Tower View',
    urgent: true,
    requester: '@tourist123',
    distance: 1200, // meters
    createdAt: '2h ago'
  }
  // ... more requests
];
```

### Distance Calculation (Haversine)
```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat(R * c); // Returns distance in meters
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

**End of Document**

For questions or clarifications, refer to individual documentation files:
- `Main.md` - Architecture overview
- `Front-end.md` - Detailed frontend roadmap with prompts
- `Backend.md` - Backend implementation guide
- `README.md` - Quick start guide

**Version:** 1.1
**Generated:** December 22, 2025
**Project:** ECHO - On-Demand Photo Marketplace
