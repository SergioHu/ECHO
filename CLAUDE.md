# ECHO - Master Project Context for Claude

**Last Updated:** January 2025
**Project Status:** Phase 6 Complete - Full Supabase Integration
**Version:** 2.0

---

## QUICK REFERENCE

| Aspect | Details |
|--------|---------|
| **Project** | ECHO - On-Demand Photo Marketplace |
| **Frontend** | React Native (Expo ~54), React Navigation 7.x |
| **Backend** | Supabase (PostgreSQL + PostGIS) |
| **Payments** | Stripe (PaymentIntents) |
| **Communication** | MCP Protocol (Supabase MCP, Stripe MCP) |

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

## 3. ARCHITECTURE OVERVIEW

### Directory Structure
```
ECHO/
├── CLAUDE.md                    # THIS FILE - Master context
├── docs/
│   └── BACKEND_SECURITY.md      # Security requirements
├── echo-app/                    # React Native Frontend
│   ├── CLAUDE.md                # Frontend-specific context
│   ├── src/
│   │   ├── screens/             # App screens
│   │   ├── components/          # Reusable UI
│   │   ├── hooks/               # Supabase integration hooks
│   │   ├── context/             # React Context providers
│   │   ├── lib/                 # Supabase client
│   │   ├── store/               # Local state management
│   │   ├── constants/           # Theme, mock data
│   │   ├── navigation/          # React Navigation
│   │   └── utils/               # Helper functions
│   ├── supabase/
│   │   ├── CLAUDE.md            # Backend-specific context (MCP)
│   │   ├── migrations/          # 26+ SQL migrations
│   │   ├── config.toml          # Local Supabase config
│   │   └── seed.sql             # Test data
│   ├── assets/                  # Images, fonts
│   └── *.md                     # Documentation files
└── .mcp.json                    # MCP server configuration
```

### Technology Stack

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

## 4. COMMUNICATION PROTOCOL: MCP

### What is MCP?
Model Context Protocol (MCP) enables Claude to communicate directly with backend services.

### Connected Services

#### Supabase MCP
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=dyywmbrxvypnpvuygqub"
    }
  }
}
```

**Use Supabase MCP for:**
- Schema changes and migrations
- RPC function creation/updates
- Data queries and debugging
- RLS policy management
- Storage bucket operations

#### Stripe MCP (When Configured)
**Use Stripe MCP for:**
- PaymentIntent creation
- Customer management
- Webhook handling
- Payout operations

### MCP Usage Examples

```
"Apply migration 00027_new_feature.sql to Supabase via MCP"
"Query all open requests from the database"
"Create a new RPC function for getting user stats"
"Check the current RLS policies on the photos table"
```

---

## 5. DATABASE SCHEMA (Supabase)

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts (balance, reputation, role) |
| `requests` | Photo jobs with PostGIS location |
| `photos` | Submitted photos with viewing session |
| `disputes` | Reported photos under review |
| `ledger_entries` | Transaction history |

### Key RPC Functions

| Function | Purpose |
|----------|---------|
| `create_request()` | Create photo job with geography |
| `get_nearby_requests()` | Spatial query for jobs within radius |
| `lock_request()` | Accept job atomically |
| `submit_photo()` | Upload with 10m validation |
| `start_view_session()` | Begin 3-minute timer |
| `resolve_dispute()` | Admin dispute resolution |

### Storage

| Bucket | Purpose |
|--------|---------|
| `echo-photos` | Temporary photo storage (signed URLs) |

---

## 6. FRONTEND HOOKS (React Native)

| Hook | Purpose |
|------|---------|
| `useAuth` | Authentication state |
| `useNearbyRequests` | Fetch jobs near location |
| `useCreateRequest` | Create new requests |
| `useLockRequest` | Accept jobs |
| `useSubmitPhoto` | Upload photos |
| `useViewSession` | 3-minute viewing timer |
| `useMyActivity` | User's requests and jobs |
| `useAdminStats` | Admin dashboard data |
| `useAdminDisputes` | Dispute management |
| `useAdminPhotos` | Photo moderation |

---

## 7. USER FLOWS

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

## 8. CRITICAL DEVELOPMENT RULES

### React Native Bridge Type Safety
```javascript
// ALWAYS use parseFloat() for numeric values
const lat = parseFloat(job.lat) || 0;
const size = parseFloat(job.size) || 100;

// NEVER use string interpolation in native props
<View width={size} />  // ✅ Correct
<View width={`${size}`} />  // ❌ Will crash on Android
```

### Code Quality Standards
1. Follow existing patterns in codebase
2. Use theme.js constants for colors/spacing
3. Keep components under 300 lines
4. Add comments for complex GPS/distance logic
5. Test on both iOS and Android

### Security Considerations
1. Never log sensitive data (coordinates, user IDs)
2. Validate GPS coordinates server-side (PostGIS)
3. All admin actions must be audit-logged
4. Use signed URLs for photo access (5-15 min expiry)

---

## 9. ENVIRONMENT VARIABLES

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://dyywmbrxvypnpvuygqub.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Google Maps
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=<your-api-key>

# Stripe (when implemented)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-publishable-key>
```

---

## 10. DOCUMENTATION INDEX

| Document | Location | Purpose |
|----------|----------|---------|
| **Main CLAUDE.md** | `/CLAUDE.md` | Master project context (this file) |
| **Frontend CLAUDE.md** | `/echo-app/CLAUDE.md` | Frontend-specific details |
| **Backend CLAUDE.md** | `/echo-app/supabase/CLAUDE.md` | Backend + MCP details |
| **Backend Security** | `/docs/BACKEND_SECURITY.md` | Admin access requirements |
| **Supabase Integration** | `/echo-app/supabase/SUPABASE_INTEGRATION.md` | Database schema reference |
| **Backend Implementation** | `/echo-app/Backend-Implementation.md` | Edge functions guide |
| **Frontend Roadmap** | `/echo-app/Front-end.md` | UI development phases |

---

## 11. QUICK COMMANDS

### Start Development
```bash
cd echo-app
npm install
npm start
```

### Apply Migration via MCP
```
"Apply the migration file 00027_feature.sql to Supabase"
```

### Debug Database
```
"Query all requests where status is 'open'"
"Show me the RLS policies for the photos table"
```

### Check Schema
```
"Describe the photos table schema"
"List all RPC functions in the database"
```

---

## 12. CURRENT STATUS

### Completed Phases
- ✅ Phase 1: Project Scaffolding & Navigation
- ✅ Phase 2: Radar Screen (Google Maps)
- ✅ Phase 3: Camera & GPS System
- ✅ Phase 4: Photo Viewer Security
- ✅ Phase 5: Profile & Earnings
- ✅ Phase 6: Full Supabase Integration

### In Progress
- 🚧 Stripe Payment Integration
- 🚧 Push Notifications

### Upcoming
- 📋 Production Security Hardening
- 📋 App Store Deployment

---

**For detailed frontend documentation, see:** `/echo-app/CLAUDE.md`
**For detailed backend documentation, see:** `/echo-app/supabase/CLAUDE.md`
