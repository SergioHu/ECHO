# ECHO — Master Project Context for Claude

**Last Updated:** March 12, 2026
**Project Status:** Phase 6 Complete + Full QA Audit + Photo Review Flow Fixes + Job Reopen Bug Fix + Satellite Toggle + Job Disappear Fix
**Version:** 3.8

---

## QUICK REFERENCE

| Aspect | Details |
|--------|---------|
| **Project** | ECHO - On-Demand Photo Marketplace |
| **Frontend** | React Native (Expo ~54), React Navigation 7.x |
| **Backend** | Supabase (PostgreSQL + PostGIS) |
| **Payments** | Stripe (PaymentIntents) — in progress |
| **Communication** | MCP Protocol (Supabase, Expo, GitHub MCPs) |
| **Project Ref** | `dyywmbrxvypnpvuygqub` |
| **Repo** | `SergioHu/ECHO` |

---

## 1. PROJECT OVERVIEW

**ECHO** is an on-demand visual information marketplace that connects:
- **Requesters** who need photos of specific locations
- **Agents** who are nearby and can capture those photos
- **Platform** that facilitates and secures transactions

### The Value Proposition
```
Requester pays €0.50 → Agent earns €0.40 → Platform keeps €0.10
```

### Key Differentiators
- **Ephemeral Content:** Photos auto-delete after 3 minutes
- **Location Verified:** GPS-enforced 10-meter proximity
- **Privacy First:** Screenshot blocking, no gallery saves
- **Real-Time:** Live job notifications and tracking

---

## 2. NON-NEGOTIABLE BUSINESS RULES

### Rule 1: The 10-Meter Proximity Check
```
Agent MUST be within 10 meters of target coordinates to submit photos.
├── Client-side: Real-time GPS validation (shutter disabled if > 10m)
└── Server-side: PostGIS ST_Distance() verification
```

### Rule 2: The 3-Minute Ephemeral Window
```
Photos are viewable for EXACTLY 3 minutes (180 seconds).
├── Timer starts on FIRST VIEW
├── Warning at 30 seconds remaining (yellow)
├── Critical at 10 seconds remaining (red)
└── Auto-delete from Storage + Database on expiry
```

### Rule 3: Privacy & Security
```
├── NO Screenshots: expo-screen-capture blocks recording
├── NO Gallery Saves: Photos never touch device gallery
├── NO Downloads: No export functionality
└── Audit Logging: All admin actions are logged
```

### Rule 4: Payment Split
```
Total: €0.50
├── Agent: €0.40 (80%)
└── Platform: €0.10 (20%)
```

### Rule 5: Dispute Handling
```
├── Requester can report within viewing window
├── Reported photos: Agent forfeits €0.40
├── NO REFUNDS for requesters
└── Admin reviews via dashboard
```

---

## 3. DIRECTORY STRUCTURE

```
ECHO/
├── CLAUDE.md                        # THIS FILE — single source of truth
├── docs/
│   └── BACKEND_SECURITY.md          # Security requirements
├── .mcp.json                        # MCP server configuration
└── echo-app/                        # React Native app
    ├── App.js                       # Entry point with providers
    ├── app.json                     # Expo configuration
    ├── package.json
    ├── .env                         # Environment variables
    ├── assets/                      # Images, fonts, icons
    ├── src/
    │   ├── screens/
    │   │   ├── RadarScreen.js       # Map view (home)
    │   │   ├── ActivityScreen.js    # Job history with tabs
    │   │   ├── ProfileScreen.js     # User profile + settings
    │   │   ├── CameraJobScreen.js   # Agent capture flow
    │   │   ├── PhotoViewerScreen.js # Requester 3-min viewer
    │   │   ├── AgentPreviewScreen.js
    │   │   ├── PreviewScreen.js
    │   │   ├── AuthScreen.js
    │   │   ├── SplashScreen.js
    │   │   ├── OnboardingScreen.js
    │   │   └── admin/
    │   │       ├── AdminDashboard.js
    │   │       ├── PhotoReviewer.js
    │   │       ├── DisputesList.js
    │   │       ├── DisputeReview.js
    │   │       ├── ManageUsers.js
    │   │       ├── Analytics.js
    │   │       └── CreateTestJob.js
    │   ├── components/
    │   │   ├── PremiumRadar.js      # Radar with job tracking
    │   │   ├── CreateRequestSheet.js# Bottom sheet for new requests
    │   │   ├── JobOfferSheet.js     # Agent job acceptance UI
    │   │   ├── ViewTimer.js         # Countdown timer display
    │   │   ├── EchoButton.js
    │   │   ├── EchoModal.js
    │   │   ├── EchoToast.js
    │   │   ├── InfoModal.js
    │   │   ├── MiniMap.js
    │   │   ├── MapCrosshair.js
    │   │   ├── ExpandedMapModal.js  # Full-screen map picker
    │   │   └── admin/
    │   │       ├── StatCard.js
    │   │       └── PhotoCard.js
    │   ├── hooks/
    │   │   ├── index.js             # Exports all hooks
    │   │   ├── useNearbyRequests.js
    │   │   ├── useCreateRequest.js
    │   │   ├── useLockRequest.js
    │   │   ├── useSubmitPhoto.js
    │   │   ├── useViewSession.js
    │   │   ├── useMyActivity.js
    │   │   ├── useProfile.js
    │   │   ├── useReportPhoto.js
    │   │   ├── useAdminStats.js
    │   │   ├── useAdminDisputes.js
    │   │   ├── useAdminUsers.js
    │   │   ├── useAdminPhotos.js
    │   │   ├── useAdminAnalytics.js
    │   │   └── useKeyboardFooterOffset.js
    │   ├── context/
    │   │   ├── AuthContext.js
    │   │   ├── PhotoTimerContext.js
    │   │   └── ToastContext.js
    │   ├── lib/
    │   │   └── supabase.js          # Supabase client config
    │   ├── store/
    │   │   └── jobStore.js          # Local job state (pub/sub)
    │   ├── constants/
    │   │   ├── theme.js             # Colors, fonts, spacing
    │   │   ├── mockData.js
    │   │   └── mapStyle.js          # Dark map theme JSON
    │   ├── navigation/
    │   │   └── AppNavigator.js
    │   └── utils/
    │       ├── navigationRef.js
    │       ├── mapUtils.js
    │       └── adminHelpers.js
    └── supabase/
        ├── migrations/              # 27 SQL migrations
        ├── config.toml
        └── seed.sql
```

---

## 4. TECHNOLOGY STACK

| Layer | Technology |
|-------|------------|
| **Mobile App** | React Native (Expo ~54.0.25) |
| **Navigation** | React Navigation 7.x |
| **Maps** | react-native-maps (Google Maps) |
| **Camera** | expo-camera v17 |
| **Location** | expo-location v19 |
| **Security** | expo-screen-capture v8 |
| **Database** | Supabase PostgreSQL + PostGIS |
| **Auth** | Supabase Auth |
| **Storage** | Supabase Storage |
| **Functions** | Supabase Edge Functions (Deno) |
| **Payments** | Stripe PaymentIntents |
| **Communication** | MCP Protocol |

---

## 5. MCP CONFIGURATION

All backend communication goes through MCP. Configuration lives in `.mcp.json` at the repo root.

### Supabase MCP ❌ DISCONNECTED — DO NOT USE
Removed from `.mcp.json`. All Supabase operations must use the CLI or direct SQL files.

### Expo MCP ✅ CONNECTED
**Use for:** Expo/React Native docs, adding SDK libraries (`expo install`), EAS builds and workflows, generating CLAUDE.md, validating EAS YAML.

### GitHub MCP ✅ CONNECTED
**Repository:** `SergioHu/ECHO`
**Use for:** Issues, pull requests, commit history, branch management, code search.

### Supabase CLI ✅ INSTALLED

**Use for:** Edge Functions (deploy Stripe webhooks, push notification handlers), local development, CI/CD pipelines, `supabase db pull` to sync remote schema, `supabase db push` for migrations, `supabase functions deploy` for Edge Functions.

**When to use CLI vs MCP:**
- **MCP** → day-to-day: queries, quick migrations, RLS checks, data inspection, AI-assisted debugging
- **CLI** → deployment: Edge Functions, CI/CD, local dev stack, schema sync, type generation

**Key commands:**
```bash
supabase db pull                        # pull remote schema changes
supabase db push                        # push local migrations to remote
supabase functions new <name>           # create Edge Function
supabase functions deploy <name>        # deploy Edge Function
supabase gen types typescript           # generate TypeScript types from schema
supabase migration new <name>           # create new migration file locally
```

**Project ref:** `dyywmbrxvypnpvuygqub`
**Linked:** Yes — run all CLI commands from `echo-app/` directory (where `supabase/config.toml` lives)
**CLI version:** 2.75.0

---

### Stripe MCP (Not Yet Configured)
**Use for:** PaymentIntent creation, customer management, webhook handling, payouts.

### CLI Quick Examples
```bash
cd echo-app
supabase migration new add_stripe_customers
supabase db push
supabase functions new stripe-webhook
supabase functions deploy stripe-webhook
supabase gen types typescript --project-id dyywmbrxvypnpvuygqub > src/types/supabase.ts
```

---

## 6. NAVIGATION STRUCTURE

```
RootNavigator (Stack)
│
├── SplashScreen (initial)
├── OnboardingScreen (first launch only)
├── AuthScreen (if not authenticated)
│
├── MainTabs (Bottom Tab Navigator)
│   ├── Radar (RadarScreen)          # Tab 1: Map view
│   ├── Activity (ActivityScreen)    # Tab 2: Job history
│   └── Profile (ProfileScreen)      # Tab 3: User profile
│
├── CameraJobScreen (modal)          # Agent capture flow
├── PhotoViewerScreen (modal)        # Requester viewer
├── AgentPreviewScreen (modal)
├── PreviewScreen (modal)
│
└── Admin Screens (from Profile)
    ├── AdminDashboard
    ├── PhotoReviewer
    ├── DisputesList / DisputeReview
    ├── ManageUsers
    ├── Analytics
    └── CreateTestJob
```

### App.js Provider Structure
```javascript
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

---

## 7. DESIGN SYSTEM

### Color Palette (Dark Mode) — `constants/theme.js`
```javascript
export const COLORS = {
  background: '#121212',      // Main background
  surface: '#1E1E1E',         // Cards, sheets
  surfaceLight: '#2A2A2A',    // Elevated surfaces
  accent: '#00E5FF',          // Primary cyan
  accentDark: '#00B8D4',
  success: '#34C759',
  warning: '#FFD60A',
  danger: '#FF3B30',
  gold: '#FFD700',            // Job markers
  stripe: '#635BFF',          // Payment purple
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',
};

export const SIZES = { xs: 10, sm: 12, md: 14, lg: 16, xl: 18, xxl: 24, title: 32 };
export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
```

---

## 8. KEY COMPONENTS

### PremiumRadar — `components/PremiumRadar.js`
Radar overlay for agent navigation during camera flow.
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
Features: user dot (blue), job dot (gold), camera vision cone, distance pill, price tag.

### ViewTimer — `components/ViewTimer.js`
```javascript
<ViewTimer jobId={photoId} onExpire={() => handleExpiration()} />
```
States: normal (white) → warning ≤30s (yellow pulse) → critical ≤10s (red pulse).

### JobOfferSheet — `components/JobOfferSheet.js`
```javascript
<JobOfferSheet visible={showSheet} job={selectedJob} onAccept={handleAccept} onClose={() => setShowSheet(false)} />
```

### CreateRequestSheet — `components/CreateRequestSheet.js`
```javascript
<CreateRequestSheet visible={showCreate} location={selectedLocation} onSubmit={handleCreate} onClose={() => setShowCreate(false)} />
```

---

## 9. HOOKS REFERENCE

### `useAuth` — `context/AuthContext.js`
```javascript
const { user, profile, signIn, signUp, signOut, loading } = useAuth();
```

### `useNearbyRequests` — `hooks/useNearbyRequests.js`
```javascript
const { requests, loading, error, refetch } = useNearbyRequests(userLat, userLng, radiusMeters);
```
> **CRITICAL:** Pass coordinates directly from `location?.coords?.latitude` — do NOT buffer through an intermediate state like `stableCoords`. Buffering causes `null` on the first render, the hook's null-guard fires, and no markers appear. The hook handles GPS jitter internally via a `prevCoordsRef` threshold (~1 meter).
>
> **Correct:** `useNearbyRequests(location?.coords?.latitude, location?.coords?.longitude, 50000)`
> **Wrong:** `useNearbyRequests(stableCoords?.latitude, stableCoords?.longitude, 50000)`

### `useCreateRequest`
```javascript
const { createRequest, loading, error } = useCreateRequest();
await createRequest({ latitude, longitude, description, priceCents: 50, category: 'general' });
```

### `useLockRequest`
```javascript
const { lockRequest, loading, error } = useLockRequest();
const result = await lockRequest(requestId); // result.success or result.error
```

### `useSubmitPhoto`
```javascript
const { submitPhoto, uploading, error } = useSubmitPhoto();
await submitPhoto({ requestId, photoUri: 'file://...', latitude, longitude });
```

### `useViewSession`
```javascript
const { startSession, photoUrl, timeRemaining, isExpired, loading } = useViewSession(photoId);
await startSession(); // timeRemaining counts down from 180000ms
```

### `useMyActivity`
```javascript
const { myRequests, myJobs, loading, refetch } = useMyActivity();
```

### `usePhotoTimer` — `context/PhotoTimerContext.js`
```javascript
const { getTimeRemaining, startTimer, isJobExpired, clearTimer } = usePhotoTimer();
// getTimeRemaining(jobId) => milliseconds
// startTimer(jobId, seconds, forceReset?)
```

### `useToast` — `context/ToastContext.js`
```javascript
const { showToast } = useToast();
showToast('Message', 'success'); // 'success' | 'error' | 'info'
```

---

## 10. USER FLOWS

### Requester Flow
```
1. Open RadarScreen (map view)
2. Tap "Ask Echo" button
3. Select location on map
4. Set price and description
5. Confirm payment (Stripe)
6. Wait for agent to accept
7. Receive notification when photo ready
8. View photo (3-minute window)
9. Approve or Report
```

### Agent Flow
```
1. Open RadarScreen
2. See available jobs as markers
3. Tap marker → JobOfferSheet
4. Accept job → CameraJobScreen
5. Navigate to location (PremiumRadar)
6. Get within 10 meters
7. Take photo (shutter enables)
8. Preview and submit
9. Receive payment (€0.40)
```

### Admin Flow
```
1. Access AdminDashboard (role-gated)
2. View pending disputes
3. Review reported photos
4. Approve (photographer paid) or Reject (strike)
5. Manage users and analytics
```

---

## 11. SCREEN IMPLEMENTATIONS

### RadarScreen
- Google Maps with dark theme, custom price-bubble markers
- User location tracking, "Ask Echo" FAB
- `useNearbyRequests` for job data, `useLockRequest` to accept
- `useFocusEffect` triggers refetch on tab focus

### CameraJobScreen
- Full-screen camera, PremiumRadar overlay (top-left)
- Real-time distance tracking, shutter enabled only within 10m
- Heading-based camera cone
- **Job unlock on back press:** Uses `beforeRemove` + `e.preventDefault()` + `await unlock_request()` + `navigation.dispatch(e.data.action)`. This blocks navigation until the RPC completes. `photoSubmittedRef` prevents unlocking after a successful submission. Do NOT use `useEffect` cleanup for this — fire-and-forget network calls from cleanup are unreliable.

### PhotoViewerScreen
- 3-minute countdown via PhotoTimerContext
- Screenshot blocking:
```javascript
useEffect(() => {
  ScreenCapture.preventScreenCaptureAsync();
  return () => { ScreenCapture.allowScreenCaptureAsync(); };
}, []);
```

### ActivityScreen
- Tabs: Requested / Completed
- Pull-to-refresh, status badges, VIEW PHOTO button for delivered photos

---

## 12. DATABASE SCHEMA

**Project URL:** `https://dyywmbrxvypnpvuygqub.supabase.co`

### Tables

#### `profiles`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Links to `auth.users.id` |
| `email` | TEXT | |
| `display_name` | TEXT | |
| `balance_cents` | INTEGER | |
| `reputation_score` | INTEGER | |
| `is_agent` | BOOLEAN | Can accept jobs |
| `role` | TEXT | `user`, `agent`, `reviewer`, `admin` |
| `stripe_customer_id` | TEXT | |
| `stripe_account_id` | TEXT | Stripe Connect |

#### `requests`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `creator_id` | UUID FK | |
| `agent_id` | UUID FK | Nullable until accepted |
| `location` | GEOGRAPHY | PostGIS point |
| `latitude` / `longitude` | DECIMAL | |
| `location_name` | TEXT | |
| `description` | TEXT | |
| `category` | TEXT | `general`, `urgent` |
| `price_cents` | INTEGER | |
| `status` | request_status | See enums |
| `validation_radius` | INTEGER | Default: 10m |
| `expires_at` | TIMESTAMPTZ | |

#### `photos`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `request_id` | UUID FK | |
| `agent_id` | UUID FK | |
| `storage_path` | TEXT | Path in Supabase Storage |
| `location` | GEOGRAPHY | |
| `latitude` / `longitude` | DECIMAL | |
| `status` | photo_status | See enums |
| `is_reported` | BOOLEAN | |
| `rejection_reason` | TEXT | |
| `view_session_started_at` | TIMESTAMPTZ | |
| `view_session_expires_at` | TIMESTAMPTZ | 3-min window end |

#### `disputes`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `photo_id`, `request_id`, `reporter_id` | UUID FK | |
| `reason` | dispute_reason | See enums |
| `status` | dispute_status | |
| `resolved_by` | UUID FK | Admin |

#### `ledger_entries`
Immutable transaction log. Columns: `id`, `user_id`, `type` (ledger_type), `amount_cents`, `balance_after_cents`, `request_id`, `photo_id`, `dispute_id`, `description`.

---

## 13. ENUMS

```sql
request_status: 'open' | 'locked' | 'fulfilled' | 'expired' | 'cancelled' | 'disputed'
photo_status:   'pending' | 'validated' | 'viewed' | 'expired' | 'approved' | 'disputed' | 'rejected'
dispute_status: 'open' | 'under_review' | 'resolved_creator' | 'resolved_agent' | 'closed'
dispute_reason: 'wrong_location' | 'poor_quality' | 'wrong_subject' | 'inappropriate' | 'other'
ledger_type:    'deposit' | 'withdrawal' | 'payment' | 'earning' | 'platform_fee' | 'refund' | 'bonus' | 'adjustment'
```

---

## 14. RPC FUNCTIONS

| Function | Signature | Purpose |
|----------|-----------|---------|
| `create_request()` | `(p_latitude, p_longitude, p_location_name, p_description, p_price_cents, p_category) → UUID` | Create job with PostGIS geography |
| `get_nearby_requests()` | `(p_latitude, p_longitude, p_radius_meters=5000) → TABLE` | Spatial query, filters `expires_at > NOW()` |
| `lock_request()` | `(p_request_id) → JSONB {success, error?}` | Accept job atomically (prevents race conditions) |
| `submit_photo()` | `(p_request_id, p_storage_path, p_latitude, p_longitude) → UUID` | Upload with 10m ST_Distance() validation |
| `start_view_session()` | `(p_photo_id) → TABLE {photo_id, storage_path, expires_at, already_expired}` | Begin 3-min timer |
| `report_photo()` | `(p_photo_id, p_reason, p_description) → UUID` | Create dispute |
| `resolve_dispute()` | `(p_dispute_id, p_resolution, p_reject) → JSONB` | Admin resolution |
| `get_admin_stats()` | `() → JSONB` | Dashboard stats |
| `get_admin_disputes()` | `(p_status) → TABLE` | Filtered disputes |
| `get_admin_users()` | `(p_search) → TABLE` | User search |
| `get_admin_analytics()` | `(p_period) → JSONB` | Period analytics |
| `unlock_request()` | `(p_request_id) → JSONB {success, error?}` | Release locked job atomically — only agent who locked it, only if no photo submitted |
| `admin_approve_photo()` | `(p_photo_id) → BOOLEAN` | |
| `admin_reject_photo()` | `(p_photo_id, p_reason) → BOOLEAN` | |

### Key Business Logic in SQL

**10-Meter Validation:**
```sql
SELECT ST_Distance(
    ST_MakePoint(p_longitude, p_latitude)::geography, r.location
) INTO v_distance FROM requests r WHERE r.id = p_request_id;
IF v_distance > COALESCE(r.validation_radius, 10) THEN
    RAISE EXCEPTION 'Too far from target location';
END IF;
```

**3-Minute Timer:**
```sql
IF v_photo.view_session_started_at IS NULL THEN
    UPDATE photos SET
        view_session_started_at = NOW(),
        view_session_expires_at = NOW() + INTERVAL '3 minutes'
    WHERE id = p_photo_id;
END IF;
```

**Atomic Job Lock:**
```sql
UPDATE requests SET agent_id = auth.uid(), status = 'locked', locked_at = NOW()
WHERE id = p_request_id AND status = 'open' AND agent_id IS NULL
RETURNING * INTO v_request;
IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request already taken');
END IF;
```

---

## 15. ROW LEVEL SECURITY

```sql
-- profiles: own row only
-- requests: open requests visible to all; own requests always visible
CREATE POLICY "Public can view open requests" ON requests FOR SELECT
USING (status = 'open' OR creator_id = auth.uid() OR agent_id = auth.uid());

-- photos: requester sees active session; agent sees own photos
CREATE POLICY "Requester can view active photos" ON photos FOR SELECT
USING (
    EXISTS (SELECT 1 FROM requests r WHERE r.id = photos.request_id AND r.creator_id = auth.uid())
    AND (view_session_expires_at IS NULL OR view_session_expires_at > NOW())
);

-- disputes: reviewers/admins only
-- ledger_entries: own entries only
```

---

## 16. STORAGE

| Bucket | Access | Path format | Signed URL TTL |
|--------|--------|-------------|----------------|
| `echo-photos` | Private | `{request_id}/{agent_id}_{timestamp}.jpg` | 180 seconds |

---

## 17. MIGRATIONS

Latest: `00031_get_nearby_requests_include_own`. Next new migration: `00032_...`

| File | Description |
|------|-------------|
| `00001` | PostGIS, UUID extensions |
| `00002` | profiles table |
| `00003` | requests table |
| `00004` | photos table |
| `00005` | disputes table |
| `00006` | ledger_entries table |
| `00007` | RLS policies |
| `00008` | Helper functions |
| `00009` | `get_nearby_requests` RPC |
| `00010` | `submit_photo` RPC |
| `00011` | Storage bucket |
| `00012` | Admin role + functions |
| `00013` | Admin analytics |
| `00014` | Own requests visibility |
| `00015` | `report_photo` RPC |
| `00016` | Dispute resolution |
| `00017` | `is_reported` column |
| `00018` | `resolve_dispute` v2 |
| `00019` | Rejected photo status |
| `00021` | Photo rejection reason |
| `00022` | Fix `get_admin_disputes` |
| `00023` | Fix `get_admin_stats` |
| `00024` | Photo auto-cleanup |
| `00025` | Fix `get_nearby_requests` |
| `00026` | Fix resolve dispute timer |
| `00027` | Auto-expire stale open requests |
| `00028` | `unlock_request` RPC — release locked job on agent back press |
| `00029` | Performance & security hardening — 4 FK indexes, 13 RLS policies (select auth.uid()), 23 function search_path |
| `00030` | Fix `expires_at` reset on job reopen — `resolve_dispute`, `admin_reject_photo`, `unlock_request` all set `expires_at = NOW() + 24h` |
| `00031` | Fix `get_nearby_requests` — always include requester's own open jobs regardless of distance (`OR r.creator_id = v_user_id`) |

---

## 18. STRIPE INTEGRATION (Planned)

### Payment Flow
```
1. User creates request → MCP: Create PaymentIntent (€0.50)
2. Frontend confirms payment via Stripe SDK
3. Webhook: payment_intent.succeeded → set request status 'open'
4. Agent submits photo → credit agent €0.40, record ledger entry
```

### Webhook Events
| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Set request `status = 'open'` |
| `payment_intent.payment_failed` | Set request `status = 'expired'` |
| `payout.paid` | Update user balance |

---

## 19. CRITICAL DEVELOPMENT RULES

### Supabase: CLI Only — MCP Disconnected
**RULE: Always use the Supabase CLI. Never use Supabase MCP.**
- MCP has been removed from `.mcp.json` and must not be reconnected
- All database operations (migrations, queries, RLS, functions) → CLI
- All Edge Function deployments → CLI
- CLI must be run from the `echo-app/` directory (where `supabase/config.toml` lives)

```bash
# Common CLI commands
supabase db push                        # apply local migrations to remote
supabase migration new <name>           # create new migration file
supabase functions deploy <name>        # deploy Edge Function
supabase db pull                        # sync remote schema to local
supabase gen types typescript           # generate TypeScript types
```

---

### React Native Bridge Type Safety
Android Java expects `Double`, not strings. ALWAYS use `parseFloat()`:
```javascript
// CORRECT
const lat = parseFloat(job.lat) || 0;
const size = parseFloat(job.size) || 100;
<MapView latitude={lat} />

// WRONG — crashes on Android
const lat = Number(job.lat);
<View width={`${size}`} />
```
Apply to: all coordinates, SVG dimensions, animated values, prices, distances, timer values.

### GPS Coordinates — DO NOT Buffer
```javascript
// CORRECT — pass directly, hook handles jitter internally
useNearbyRequests(location?.coords?.latitude, location?.coords?.longitude, 50000)

// WRONG — stableCoords starts null, hook skips first fetch, no markers appear
const [stableCoords, setStableCoords] = useState(null);
useNearbyRequests(stableCoords?.latitude, stableCoords?.longitude, 50000)
```

### Map Markers — `tracksViewChanges` Must Stay `true`
```javascript
// CORRECT — markers always re-render when data arrives
<Marker tracksViewChanges={true} ... />

// WRONG — freezes marker snapshots after N ms; markers that arrive after the
// freeze render as blank on Android (GPS + fetch takes > 500ms)
<Marker tracksViewChanges={!initialRenderComplete} ... />
```

### RadarScreen Initial Zoom
Keep `latitudeDelta: 0.01` / `longitudeDelta: 0.01` (~1km visible). Do not tighten back to `0.001` — at 100m zoom most markers are off-screen.

### Distance Calculations
```javascript
// Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
  return parseFloat(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
```

### Code Quality
1. Follow existing patterns in the codebase
2. Use `theme.js` constants for all colors/spacing
3. Keep components under 300 lines
4. Comment complex GPS/distance logic
5. Only `console.error` in production paths — no `console.log` or `Alert.alert` debug spam
6. Test on both iOS and Android

### Security
1. Never log sensitive data (coordinates, user IDs)
2. Validate GPS server-side (PostGIS)
3. All admin actions must be audit-logged
4. Signed URLs for photo access (5-15 min expiry)
5. Service role key never exposed to client

---

## 20. ENVIRONMENT VARIABLES

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://dyywmbrxvypnpvuygqub.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Google Maps
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=<your-api-key>

# Stripe (when implemented)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-publishable-key>
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## 21. QUICK COMMANDS

```bash
# Start dev server
cd echo-app && npm start

# Run on device
npm run android
npm run ios
```

```
# MCP: apply migration
"Apply migration 00028_feature.sql to Supabase"

# MCP: debug data
"Query all requests where status is 'open' and expires_at > now()"
"Show RLS policies for the photos table"
"Describe the requests table schema"
```

---

## 22. COMMON ISSUES & SOLUTIONS

| Issue | Solution |
|-------|----------|
| Map not loading | Check Google Maps API key in `app.json` |
| Location permission denied | Handle gracefully with fallback UI |
| Camera permission denied | Show permission request modal |
| Type crash on Android | Use `parseFloat()` for all numeric props |
| Timer not syncing | Use `PhotoTimerContext` keyed by `jobId` |
| Photos not loading | Check Supabase Storage signed URL expiry |
| Markers not appearing on RadarScreen | See below |
| User cannot log in (unconfirmed email) | Run: `UPDATE auth.users SET email_confirmed_at = now(), updated_at = now() WHERE id = '<uuid>';` — `confirmed_at` is a generated column, do not set it manually |

### RESOLVED: Job Markers Not Appearing on RadarScreen (March 2026)

Three bugs fixed in sequence:

**Bug 1 — Data never fetched (`stableCoords` null):**
`useNearbyRequests` received `null` coords via an intermediate `stableCoords` state → null-guard fired → fetch skipped → `requests = []` permanently.
Fix: Pass `location?.coords?.latitude` directly. The hook handles GPS jitter via `prevCoordsRef` (~1m threshold).

**Bug 2 — Only 3 of 7 markers visible (zoom too tight):**
RadarScreen initial zoom was `latitudeDelta: 0.001` (~100m visible area). Markers beyond 100m were off-screen.
Fix: Changed to `latitudeDelta: 0.01` (~1km visible), consistent with ExpandedMapModal.

**Bug 3 — Markers frozen blank on Android (`tracksViewChanges`):**
`tracksViewChanges={!initialRenderComplete}` froze markers after 500ms. GPS + fetch took longer → markers arrived after freeze → blank snapshots on Android.
Fix: `tracksViewChanges={true}` on all job markers, matching ExpandedMapModal behaviour.

**Also removed:** `updateKey` state (was unmounting all markers on every real-time event), `displayRequests` intermediate state, 30+ debug `console.log`/`Alert.alert` calls.

### RESOLVED: Job Stays Locked After Agent Presses Back (March 2026)

**Root cause:** `useEffect` cleanup called `supabase.rpc('unlock_request', ...)` fire-and-forget. The network request started but completed with an auth error silently — `auth.uid()` check in the RPC failed before the Promise resolved.

**Fix:** Replaced with `navigation.addListener('beforeRemove', async (e) => { e.preventDefault(); await supabase.rpc(...); navigation.dispatch(e.data.action); })`. Navigation is blocked until the RPC completes.

**Key rule:** Never rely on `useEffect` cleanup for critical async operations that must complete before navigation. Use `beforeRemove` + `e.preventDefault()` + `await` instead.

### RESOLVED: Google Places Search Broken in EAS Builds (March 2026)

**Symptom:** Location search (autocomplete) worked in Expo Go but did nothing in EAS builds — no suggestions, no error shown.

**Root cause:** `GOOGLE_API_KEY` in `CreateRequestSheet.js` was read from `Constants.expoConfig?.android?.config?.googleMaps?.apiKey`. This field is a **native plugin build-time config** — Expo uses it to write the key into `AndroidManifest.xml` for the Maps SDK, but it is **not reliably present in the runtime manifest of a standalone EAS build**. Result: key resolved to `''` → Places API returned `REQUEST_DENIED` → `data.status !== 'OK'` → `setSuggestions([])`. Silently swallowed by `catch` block.

**Fix:**
1. Added `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` to `eas.json` under `preview` and `production` `env` sections — EAS build servers expose it to Metro, which bakes it as a static string into the JS bundle.
2. Changed `CreateRequestSheet.js` to read `process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` first, with `Constants.expoConfig` as fallback.

**Key rule:** `EXPO_PUBLIC_*` env vars in `eas.json` `env` are the reliable way to pass config into EAS builds. `Constants.expoConfig.android.config.*` fields are for native plugin configuration only — do not rely on them at runtime in standalone builds.

**Files changed:** `eas.json`, `src/components/CreateRequestSheet.js`

---

### RESOLVED: Full QA Audit — Production Hardening (March 8, 2026)

**Scope:** Static code audit (`echo-qa-auditor` skill) + Expo MCP build check + Supabase advisor scan + live DB integrity checks.

**Code fixes applied:**

| File | Issue | Fix |
|------|-------|-----|
| `MiniMap.js` | `tracksViewChanges={!initialRenderComplete}` — 2s freeze caused blank markers on Android in CameraJobScreen | Changed to `tracksViewChanges={true}` on both markers; removed unused `initialRenderComplete` state + timer `useEffect` |
| `useCreateRequest.js` | 14 `console.log` calls including user ID, coordinates, price, description | Removed all; kept `console.error` on failure paths |
| `useSubmitPhoto.js` | 4 `console.log` including `filename`, `storagePath`, `latitude`, `longitude` | Removed |
| `useViewSession.js` | 4 `console.log` including `photoId` | Removed |
| `useLockRequest.js` | 2 `console.log` with `requestId` | Removed |
| `useReportPhoto.js` | 2 `console.log` with `photoId`, `reason` | Removed |
| `AuthContext.js` | `console.log('Auth event:', event)` on every auth state change | Removed |
| `PhotoTimerContext.js` | 2 `console.log` on every timer start | Removed |
| `PhotoViewerScreen.js` | 6 `console.log` including `supabasePhotoId`, expiry timestamps; redundant `setTimeout` verification block | Removed |
| `DisputesList.js` | 4 `console.log` including `isAdmin` status logged on every render | Removed |
| `CreateTestJob.js` | `console.log('Location error:')` in catch block | Changed to `console.error` |

**DB fixes applied:**
- Unlocked 1 stuck `locked` request (id `94c170ca`, locked 3+ days — same user as both creator and agent in a test run). Reset to `status='open'`.
- Updated 7 photos from `status='viewed'` to `status='expired'` (view sessions had expired 1–3 days prior — auto-cleanup had missed them).

**Migration `00029_performance_and_security_hardening`:**
- 4 missing FK indexes: `disputes.request_id`, `disputes.resolved_by`, `ledger_entries.dispute_id`, `ledger_entries.photo_id`
- 13 RLS policies rewritten: `auth.uid()` → `(select auth.uid())` — prevents per-row re-evaluation
- 23 functions hardened: `SET search_path = public, pg_catalog` — closes search_path injection vector

**False positives / intentional patterns (do NOT change):**
- `supabase.js` console.logs are inside `if (__DEV__)` — never run in production builds
- `Alert.alert` in AuthScreen / admin screens — legitimate user-facing error dialogs, not debug spam
- `latitudeDelta: 0.003` in CreateRequestSheet — this is the **location picker** map, not RadarScreen; tighter zoom is correct UX for pin placement
- `jobStore.js debugStore()` — explicit utility function, only called manually

**QA Skill:** `echo-app/Skills/echo-qa-auditor/` — run anytime with:
```bash
python3 Skills/echo-qa-auditor/scripts/quick_audit.py src/
```

### RESOLVED: Stale Rejection Feedback Shown in Activity (March 2026)

Two sub-bugs:

**Bug A — `isReopenedAfterRejection` too narrow:**
Condition required `req.status === 'open'`, but fulfilled requests with both a rejected and a validated photo also triggered the problem. Fix: removed the status check — `const isReopenedAfterRejection = !latestActivePhoto && !!latestRejectedPhoto`.

**Bug B — Admin Feedback shown alongside valid photo:**
When a request has both a rejected photo (old) and a validated photo (new), `disputeRejected=true` and `disputeResolutionNotes` were set, causing the Admin Feedback block to render even though the requester had a valid VIEW PHOTO button. Fix: added `&& !hasPhoto` to the condition in `ActivityScreen.js` — feedback is hidden whenever a valid photo exists.

---

### RESOLVED: Rejected Jobs Not Reappearing on Map (March 9, 2026)

**Root cause:** `lock_request` sets `expires_at = NOW() + 30 minutes` (a lock window). When a job was returned to `'open'` via `resolve_dispute` (reject), `admin_reject_photo`, or `unlock_request` (back press), none of them reset `expires_at`. The `get_nearby_requests` RPC filters `WHERE expires_at IS NULL OR expires_at > NOW()`. After the 30-minute lock window elapsed (during dispute review), the reopened job was excluded from all subsequent fetches. It appeared briefly on the map via the realtime event (which bypasses the RPC filter), then vanished on the next refetch.

**Fix — migration `00030_fix_expires_at_on_job_reopen`:**
All three RPCs that return a job to `'open'` now reset `expires_at = NOW() + INTERVAL '24 hours'`:
- `resolve_dispute` (reject path)
- `admin_reject_photo`
- `unlock_request`

**DB fix:** 21 existing open requests had stale `expires_at` in the past — all reset to `NOW() + 24 hours`.

**Key rule:** Every time a request transitions to `status = 'open'` (whether fresh creation, agent back-press, or photo rejection), `expires_at` must be set to `NOW() + 24 hours`. `lock_request` may overwrite it to a shorter window for the lock period — that is intentional — but any transition back to open must restore the full 24h window.

---

### RESOLVED: Photo Review Flow — Timer Freeze + "Under Review" Badge (March 9, 2026)

Two bugs fixed:

**Bug 1 — Countdown keeps running after requester reports a photo:**
After `reportPhoto` RPC succeeds in `PhotoViewerScreen`, the timer continued counting down in both `PhotoViewerScreen` (briefly before navigation) and `ActivityScreen` (ongoing). Fix: added `isReported` state to `PhotoViewerScreen`; set to `true` immediately after successful `reportPhoto` call; passed as `frozen={isReported}` to `<ViewTimer>`. Added `frozen` prop to `ViewTimer` component — when frozen, renders an orange "UNDER REVIEW" badge instead of the countdown.

**Bug 2 — Disputed photos showed "PHOTO DELIVERED" (green) in ActivityScreen:**
The simplified requester status logic in `ActivityScreen` collapsed `item.status === 'disputed'` into the `hasPhoto` branch, showing a green "PHOTO DELIVERED" badge. Fix: added `isDisputed` check as the first branch in the status logic (before `hasPhoto`), showing orange "UNDER REVIEW". Photo thumbnail and VIEW PHOTO button are also hidden for disputed items. ViewTimer receives `frozen={isDisputed}`.

**Bug 3 — App crash "Rendered fewer hooks than expected" (Rules of Hooks violation):**
The `frozen` early return was inserted inside `ViewTimer` between `useState` and the three `useEffect` calls. React requires all hooks to run in the same order on every render — an early return between hooks violates this. Fix: moved all hooks to run unconditionally first; `frozen` check moved to the final render section after all hooks. The `frozen` flag is threaded into `useEffect` dependency arrays so the tick interval stops and the expiry callback is suppressed while frozen.

**Key patterns:**
- `ViewTimer` `frozen` prop: when `true`, all hooks still run (Rules of Hooks), but the interval is skipped and the component renders "UNDER REVIEW" instead of the countdown
- "dispute" / "disputed" wording never shown to end users — always use "Under Review"
- `ActivityScreen`: `isDisputed = item.status === 'disputed'` — checked before `hasPhoto` in status logic

**Files changed:** `ViewTimer.js`, `PhotoViewerScreen.js`, `ActivityScreen.js`

---

### RESOLVED: Rejected Jobs Appear at Wrong Map Location — Realtime Payload Fix (March 12, 2026)

**Problem (second pass, after migration 00030):** Even after `expires_at` was reset by migration 00030, jobs returned to 'open' via `resolve_dispute` (reject) could still appear at wrong/missing coordinates when re-added via the Supabase Realtime UPDATE event.

**Root cause:** Supabase Realtime `postgres_changes` UPDATE events with DEFAULT `REPLICA IDENTITY` may omit unchanged columns (like `latitude`/`longitude`) from `payload.new` in some configurations. The realtime handler in `useNearbyRequests.js` was blindly using `parseFloat(updatedReq.latitude)` — if the column was absent, this produced `NaN`, and either the marker didn't appear or (in edge cases) appeared at 0,0.

**Fix — `useNearbyRequests.js`:**
- Added `silentRefetchRef` (keeps current `silentRefetch` function accessible from the realtime subscription closure, which has empty deps `[]`)
- In the `UPDATE → status='open' → !exists` path:
  - Validate `lat`/`lng` from payload — if `NaN`, skip optimistic add entirely
  - Schedule `silentRefetch` after 600ms via `setTimeout` — this calls `get_nearby_requests` RPC which returns authoritative coordinates from the DB
  - Optimistic add still fires instantly when coordinates are valid, for snappy UX; silentRefetch then confirms/corrects them

**Pattern:**
```javascript
// Keep ref current for realtime closure (which uses empty deps)
const silentRefetchRef = useRef(null);
useEffect(() => { silentRefetchRef.current = silentRefetch; }, [silentRefetch]);

// In UPDATE handler when job re-enters 'open':
setTimeout(() => silentRefetchRef.current?.(), 600);
const lat = parseFloat(updatedReq.latitude);
const lng = parseFloat(updatedReq.longitude);
if (isNaN(lat) || isNaN(lng)) return prev; // silentRefetch will add it
```

---

### RESOLVED: Jobs Disappearing from Map When Pinned in Different Location (March 12, 2026)

**Symptom:** Jobs placed at a location different from the user's current GPS position would appear on the map immediately after creation, then disappear without apparent reason — especially when the user switched tabs or their GPS updated.

**Root cause (two bugs):**

**Bug 1 — DB: `get_nearby_requests` distance filter excluded own jobs**
The RPC filtered `WHERE ST_DWithin(r.location, user_GPS, 50km)`. If the requester pinned a job at location X that was outside the 50km radius from their GPS (e.g. testing with a distant city, or GPS drift), every `silentRefetch` would return results without the job, then call `setRequests(transformedData)` which replaces the entire state — the job vanishes.

Fix — **migration `00031_get_nearby_requests_include_own`:**
```sql
AND (
    ST_DWithin(r.location, v_point, p_radius_meters)  -- nearby (for agents)
    OR r.creator_id = v_user_id                        -- own jobs (for requesters)
)
```
Requesters now always see their own open jobs on the radar regardless of where they pinned them.

**Bug 2 — Frontend: fallback `refetchSupabaseRequests()` in `handleConfirmRequest` was always skipped**
After creating a request, RadarScreen called `setTimeout(() => refetchSupabaseRequests(), 1000)` as a "fallback in case realtime misses the insert." But `refetchSupabaseRequests` = `fetchRequests`, which has a dedup check that aborts when GPS coords haven't changed — which is always the case right after creation. The fallback literally never ran.

Fix — **`RadarScreen.js`:** Changed to `silentRefetchRequests()` which bypasses the dedup check.

**Key rule:** `silentRefetch` (not `refetch`) must be used for any "refresh after a user action" call. `refetch` is for "refresh because user moved to new location." The dedup guard in `refetch` only makes sense for GPS-triggered refetches.

### NEW: ExpandedMapModal — Satellite View Toggle (March 12, 2026)

**Feature:** Top-right button in `ExpandedMapModal` now toggles between the dark standard map and Google Maps satellite view. The user can search for a location, navigate to it on the dark map, then press the button to see it in satellite before confirming the photo request location.

**Behavior:**
- First press: `mapType="satellite"`, `customMapStyle=[]` (no custom style — Google's native satellite tiles)
- Second press: `mapType="standard"`, `customMapStyle={DARK_MAP_STYLE}` (back to dark theme)
- Map view (center + zoom) is preserved across toggles — does NOT re-center
- Satellite mode is reset to off when the modal closes

**Implementation — `ExpandedMapModal.js`:**
- `isSatellite` state (default `false`)
- `currentRegionRef` stores full region `{ latitude, longitude, latitudeDelta, longitudeDelta }` — updated on every `onRegionChangeComplete`
- `handleToggleSatellite`: captures `currentRegionRef.current` before state update, calls `setIsSatellite`, then uses `requestAnimationFrame` to call `mapRef.current?.animateToRegion(region, 0)` — this re-locks the view after the mapType prop change
- Icon: `earth` in standard mode (tap to go satellite), `map-outline` + cyan tint in satellite mode (tap to go back)
- Active button gets a subtle cyan border (`mapsButtonActive` style)
- Removed unused `openInGoogleMaps` import (Google Maps deep-link button replaced by satellite toggle)

**Key pattern — preserving view on mapType change:**
```javascript
const handleToggleSatellite = () => {
    const regionToRestore = currentRegionRef.current;
    setIsSatellite(prev => !prev);
    if (regionToRestore) {
        requestAnimationFrame(() => {
            mapRef.current?.animateToRegion(regionToRestore, 0);
        });
    }
};
```
`requestAnimationFrame` ensures the call runs after React has flushed the `mapType` prop, so the map doesn't jump to `initialRegion`.

---

## 23. SECURITY CHECKLIST

- [x] RLS enabled on all tables
- [x] Service role key never exposed to client
- [x] Admin functions check role claims
- [x] Private storage bucket — signed URLs only
- [x] Signed URLs expire in 3 minutes
- [x] All RPC functions check `auth.uid()`
- [x] Atomic `lock_request` prevents race conditions
- [x] Ledger entries track all transactions
- [x] Photo access tracked via `view_session_started_at`

---

## 24. CURRENT STATUS

### Completed
- ✅ Phase 1: Project Scaffolding & Navigation
- ✅ Phase 2: Radar Screen (Google Maps)
- ✅ Phase 3: Camera & GPS System
- ✅ Phase 4: Photo Viewer Security
- ✅ Phase 5: Profile & Earnings
- ✅ Phase 6: Full Supabase Integration
- ✅ Critical Fix: RadarScreen job markers — 14 markers confirmed visible, real-time updates working (March 2026)
- ✅ DB Fix: Manually confirmed email for `filipamadureira.lmg@gmail.com` via `UPDATE auth.users SET email_confirmed_at = now()` — `confirmed_at` is a generated column (March 5, 2026)
- ✅ Bug Fix: Job stuck locked after agent back press — `unlock_request` RPC + `beforeRemove` pattern (March 6, 2026)
- ✅ Bug Fix: Stale rejection feedback in Activity — `isReopenedAfterRejection` broadened + `!hasPhoto` guard on Admin Feedback block (March 6, 2026)
- ✅ Bug Fix: Google Places search silent in EAS builds — `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` added to `eas.json` env + used as primary source in `CreateRequestSheet.js` (March 6, 2026)
- ✅ Full QA Audit + Hardening (March 8, 2026) — see §22 for details
- ✅ Bug Fix: Photo review flow — timer freeze + "Under Review" badge + Rules of Hooks crash fix (March 9, 2026) — see §22 for details
- ✅ Bug Fix: Rejected jobs not reappearing on map — `expires_at` stale after `lock_request` overwrite (March 9, 2026) — see §22 for details
- ✅ Bug Fix: Rejected jobs appearing at wrong coordinates — Realtime payload NaN guard + silentRefetch on reopen (March 12, 2026) — see §22 for details
- ✅ Feature: ExpandedMapModal satellite toggle — dark map ↔ satellite, view preserved across toggle (March 12, 2026) — see §22 for details
- ✅ Bug Fix: Jobs disappearing from map when pinned outside user's GPS radius — migration 00031 + RadarScreen fallback refetch fix (March 12, 2026) — see §22 for details

### In Progress
- 🚧 Stripe Payment Integration
- 🚧 Push Notifications

### Upcoming
- 📋 Production Security Hardening
- 📋 App Store Deployment