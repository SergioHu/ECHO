# ECHO App - Supabase Integration Documentation

> **IMPORTANT**: All database updates, migrations, and troubleshooting MUST be done via **MCP Protocol**.
> Claude Code is connected to Supabase MCP - use it for all database operations.

---

## MCP Supabase Integration (PRIMARY METHOD)

### Status: ✅ CONNECTED

The ECHO project is connected to Supabase via Model Context Protocol (MCP).

| Setting | Value |
|---------|-------|
| **MCP Server** | `supabase` |
| **Transport** | HTTP |
| **URL** | `https://mcp.supabase.com/mcp` |
| **Project Ref** | `dyywmbrxvypnpvuygqub` |
| **Auth** | OAuth 2.0 (authenticated) |

### Configuration File

**Location**: `/.mcp.json` (project root)

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

### How to Use MCP for Updates

**ALL database changes must go through MCP:**

1. **Schema Changes** → Ask Claude to execute via MCP
2. **New Migrations** → Create SQL file, then apply via MCP
3. **RPC Functions** → Create/update via MCP SQL execution
4. **Troubleshooting** → Query tables via MCP to debug
5. **Data Fixes** → Run UPDATE/INSERT via MCP

### MCP Commands (via Claude Code)

Ask Claude to perform these operations:

| Task | Example Prompt |
|------|----------------|
| List tables | "Show me all tables in Supabase" |
| Query data | "Select all open requests" |
| Run migration | "Execute this SQL migration via MCP" |
| Check schema | "Describe the photos table" |
| Debug issues | "Query disputes where status is open" |
| Create function | "Create this RPC function in Supabase" |

### Applying Migrations via MCP

1. **Create migration file** in `/supabase/migrations/`:
   ```
   00027_your_migration_name.sql
   ```

2. **Ask Claude to apply**:
   ```
   "Apply the migration 00027_your_migration_name.sql to Supabase via MCP"
   ```

3. **Verify**:
   ```
   "Query the database to verify the migration was applied"
   ```

### MCP Setup (If Reconnection Needed)

```bash
# Add MCP server
claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=dyywmbrxvypnpvuygqub"

# Verify
claude mcp list

# Authenticate (in Claude Code chat)
/mcp
```

---

## Project Configuration

| Setting | Value |
|---------|-------|
| **Project URL** | `https://dyywmbrxvypnpvuygqub.supabase.co` |
| **Project Ref** | `dyywmbrxvypnpvuygqub` |
| **Dashboard** | [Open Dashboard](https://supabase.com/dashboard/project/dyywmbrxvypnpvuygqub) |
| **Anon Key** | Configured in `.env` |

### Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://dyywmbrxvypnpvuygqub.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

---

## Database Schema

### Core Tables

#### `profiles`
User profiles linked to Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Links to `auth.users.id` |
| `email` | TEXT | User email |
| `display_name` | TEXT | Display name |
| `balance_cents` | INTEGER | User balance in cents |
| `reputation_score` | INTEGER | User reputation |
| `is_agent` | BOOLEAN | Can accept jobs |
| `role` | TEXT | `user`, `admin`, `reviewer` |
| `stripe_customer_id` | TEXT | Stripe integration (future) |
| `stripe_account_id` | TEXT | Stripe Connect (future) |
| `created_at` | TIMESTAMPTZ | Account creation |
| `updated_at` | TIMESTAMPTZ | Last update |

#### `requests`
Photo requests created by users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Request ID |
| `creator_id` | UUID (FK) | User who created request |
| `agent_id` | UUID (FK) | Agent who accepted (nullable) |
| `location` | GEOGRAPHY | PostGIS point |
| `latitude` | DECIMAL | Latitude coordinate |
| `longitude` | DECIMAL | Longitude coordinate |
| `location_name` | TEXT | Address/place name |
| `description` | TEXT | What photo is needed |
| `category` | TEXT | `general`, `urgent`, etc. |
| `price_cents` | INTEGER | Price in cents |
| `status` | request_status | `open`, `locked`, `fulfilled`, `expired`, `cancelled`, `disputed` |
| `validation_radius` | INTEGER | Meters for location validation (default: 10) |
| `locked_at` | TIMESTAMPTZ | When agent locked |
| `fulfilled_at` | TIMESTAMPTZ | When photo accepted |
| `expires_at` | TIMESTAMPTZ | Request expiration |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

#### `photos`
Photos submitted by agents.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Photo ID |
| `request_id` | UUID (FK) | Related request |
| `agent_id` | UUID (FK) | Agent who took photo |
| `storage_path` | TEXT | Path in Supabase Storage |
| `location` | GEOGRAPHY | Where photo was taken |
| `latitude` | DECIMAL | Photo latitude |
| `longitude` | DECIMAL | Photo longitude |
| `status` | photo_status | `pending`, `validated`, `viewed`, `expired`, `approved`, `disputed`, `rejected` |
| `is_reported` | BOOLEAN | Currently disputed |
| `rejection_reason` | TEXT | Why rejected (admin) |
| `view_session_started_at` | TIMESTAMPTZ | When viewing started |
| `view_session_expires_at` | TIMESTAMPTZ | When 3-min timer expires |
| `created_at` | TIMESTAMPTZ | Upload time |
| `updated_at` | TIMESTAMPTZ | Last update |

#### `disputes`
Photo disputes/reports.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Dispute ID |
| `request_id` | UUID (FK) | Related request |
| `photo_id` | UUID (FK) | Disputed photo |
| `reporter_id` | UUID (FK) | Who reported |
| `reason` | dispute_reason | `wrong_location`, `poor_quality`, `wrong_subject`, `inappropriate`, `other` |
| `description` | TEXT | Details |
| `status` | dispute_status | `open`, `under_review`, `resolved_creator`, `resolved_agent`, `closed` |
| `resolved_at` | TIMESTAMPTZ | Resolution time |
| `resolved_by` | UUID (FK) | Admin who resolved |
| `resolution_notes` | TEXT | Resolution details |
| `refund_amount_cents` | INTEGER | Refund if applicable |
| `created_at` | TIMESTAMPTZ | Report time |

#### `ledger_entries`
Immutable transaction log.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Entry ID |
| `user_id` | UUID (FK) | User account |
| `type` | ledger_type | `deposit`, `withdrawal`, `payment`, `earning`, `platform_fee`, `refund`, `bonus`, `adjustment` |
| `amount_cents` | INTEGER | Transaction amount |
| `balance_after_cents` | INTEGER | Balance after transaction |
| `request_id` | UUID (FK) | Related request (nullable) |
| `photo_id` | UUID (FK) | Related photo (nullable) |
| `dispute_id` | UUID (FK) | Related dispute (nullable) |
| `description` | TEXT | Transaction description |
| `created_at` | TIMESTAMPTZ | Transaction time |

---

## Enums

```sql
-- Request status
CREATE TYPE request_status AS ENUM (
    'open', 'locked', 'fulfilled', 'expired', 'cancelled', 'disputed'
);

-- Photo status
CREATE TYPE photo_status AS ENUM (
    'pending', 'validated', 'viewed', 'expired', 'approved', 'disputed', 'rejected'
);

-- Dispute status
CREATE TYPE dispute_status AS ENUM (
    'open', 'under_review', 'resolved_creator', 'resolved_agent', 'closed'
);

-- Dispute reasons
CREATE TYPE dispute_reason AS ENUM (
    'wrong_location', 'poor_quality', 'wrong_subject', 'inappropriate', 'other'
);

-- Ledger types
CREATE TYPE ledger_type AS ENUM (
    'deposit', 'withdrawal', 'payment', 'earning', 'platform_fee', 'refund', 'bonus', 'adjustment'
);
```

---

## RPC Functions

### `create_request`
Creates a new photo request with PostGIS geography.

```sql
create_request(
    p_creator_id UUID,
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_location_name TEXT,
    p_description TEXT,
    p_price_cents INTEGER,
    p_category TEXT
) RETURNS UUID
```

### `get_nearby_requests`
Fetches open requests within radius using PostGIS.

```sql
get_nearby_requests(
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_radius_meters INTEGER
) RETURNS TABLE (
    id, latitude, longitude, location_name, description,
    category, price_cents, status, distance_meters,
    created_at, expires_at, creator_id, is_own
)
```

### `submit_photo`
Submits a photo with location validation.

```sql
submit_photo(
    p_request_id UUID,
    p_storage_path TEXT,
    p_latitude DECIMAL,
    p_longitude DECIMAL
) RETURNS UUID
```

### `start_view_session`
Starts 3-minute viewing session for photo.

```sql
start_view_session(
    p_photo_id UUID
) RETURNS TABLE (
    photo_id, storage_path, expires_at, already_expired
)
```

### `report_photo`
Reports a photo (creates dispute).

```sql
report_photo(
    p_photo_id UUID,
    p_reason dispute_reason,
    p_description TEXT
) RETURNS UUID
```

### `resolve_dispute`
Admin function to resolve disputes.

```sql
resolve_dispute(
    p_dispute_id UUID,
    p_resolution TEXT,
    p_reject BOOLEAN
) RETURNS JSONB
```

### `add_ledger_entry`
Adds transaction to ledger with atomic balance update.

```sql
add_ledger_entry(
    p_user_id UUID,
    p_type ledger_type,
    p_amount_cents INTEGER,
    p_request_id UUID,
    p_photo_id UUID,
    p_dispute_id UUID,
    p_description TEXT
) RETURNS UUID
```

---

## Storage

### Bucket: `echo-photos`

- **Access**: Private (requires signed URLs)
- **Structure**: `{request_id}/{agent_id}_{timestamp}.jpg`
- **Signed URL Duration**: 180 seconds (3 minutes)

---

## React Native Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useAuth` | `context/AuthContext.js` | Authentication state |
| `useNearbyRequests` | `hooks/useNearbyRequests.js` | Fetch nearby jobs |
| `useCreateRequest` | `hooks/useCreateRequest.js` | Create requests |
| `useLockRequest` | `hooks/useLockRequest.js` | Accept jobs |
| `useSubmitPhoto` | `hooks/useSubmitPhoto.js` | Upload photos |
| `useViewSession` | `hooks/useViewSession.js` | 3-min timer |
| `useReportPhoto` | `hooks/useReportPhoto.js` | Dispute photos |
| `useMyActivity` | `hooks/useMyActivity.js` | User activity |
| `useAdminStats` | `hooks/useAdminStats.js` | Admin dashboard |
| `useAdminDisputes` | `hooks/useAdminDisputes.js` | Manage disputes |
| `useAdminUsers` | `hooks/useAdminUsers.js` | User management |
| `useAdminPhotos` | `hooks/useAdminPhotos.js` | Photo moderation |
| `useAdminAnalytics` | `hooks/useAdminAnalytics.js` | Analytics |

---

## Migrations

All schema changes are managed via SQL migrations in `/supabase/migrations/`.

> **Note**: Apply migrations via MCP - ask Claude to execute them.

| Migration | Description |
|-----------|-------------|
| `00001_enable_extensions.sql` | PostGIS, UUID extensions |
| `00002_profiles.sql` | Profiles table |
| `00003_requests.sql` | Requests table |
| `00004_photos.sql` | Photos table |
| `00005_disputes.sql` | Disputes table |
| `00006_ledger.sql` | Ledger entries table |
| `00007_rls_policies.sql` | Row Level Security |
| `00008_helper_functions.sql` | Utility functions |
| `00009_nearby_requests.sql` | `get_nearby_requests` RPC |
| `00010_submit_photo.sql` | `submit_photo` RPC |
| `00011_storage_bucket.sql` | Storage bucket setup |
| `00012_admin_role.sql` | Admin functions |
| `00013_admin_analytics.sql` | Analytics functions |
| `00014_show_own_requests.sql` | Own requests visibility |
| `00015_report_photo.sql` | `report_photo` RPC |
| `00016_resolve_dispute_update.sql` | Dispute resolution |
| `00017_add_is_reported_column.sql` | Photo reporting flag |
| `00018_resolve_dispute_v2.sql` | Dispute v2 |
| `00019_photo_rejected_status.sql` | Rejected status |
| `00021_add_photo_rejection_reason.sql` | Rejection reason field |
| `00022_fix_get_admin_disputes.sql` | Admin disputes fix |
| `00023_fix_get_admin_stats.sql` | Admin stats fix |
| `00024_photo_auto_cleanup.sql` | Auto cleanup expired |
| `00025_fix_get_nearby_requests.sql` | Nearby requests fix |
| `00026_fix_resolve_dispute_timer.sql` | Timer reset on dispute resolve |

---

## Real-time Subscriptions

The app uses Supabase Realtime for live updates:

```javascript
// Example from useNearbyRequests.js
const channel = supabase
    .channel('nearby-requests')
    .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'requests',
    }, (payload) => {
        // Handle INSERT, UPDATE, DELETE
    })
    .subscribe();
```

### Subscribed Tables
- `requests` - Job updates on map
- `photos` - Photo status changes
- `disputes` - Dispute updates

---

## Security (RLS)

Row Level Security is enabled on all tables. Key policies:

- Users can only see their own profile
- Users can see open requests (for accepting)
- Users can only modify their own data
- Agents can only see photos they submitted
- Admins have elevated access via role check

---

## Troubleshooting (via MCP)

> **All troubleshooting should be done via MCP queries.**

### "RPC function not found"
```
Ask Claude: "Check if function get_nearby_requests exists in Supabase"
```

### "Permission denied"
```
Ask Claude: "Show me the RLS policies for the requests table"
```

### "Photo upload failed"
```
Ask Claude: "List all storage buckets and their policies"
```

### Real-time not working
```
Ask Claude: "Check if Realtime is enabled for the requests table"
```

### Debug Data Issues
```
Ask Claude: "Query all requests where status is 'open' and show me the results"
```

### Check Table Schema
```
Ask Claude: "Describe the photos table schema"
```

---

## Quick Reference

### Create a Request (Frontend)
```javascript
const { createRequest } = useCreateRequest();
await createRequest({
    latitude: 40.7128,
    longitude: -74.0060,
    description: 'Photo of Times Square',
    priceCents: 50,
});
```

### Accept a Job (Frontend)
```javascript
const { lockRequest } = useLockRequest();
await lockRequest(requestId);
```

### Submit a Photo (Frontend)
```javascript
const { submitPhoto } = useSubmitPhoto();
await submitPhoto({
    requestId,
    photoUri: 'file://...',
    latitude: 40.7128,
    longitude: -74.0060,
});
```

### Start View Session (Frontend)
```javascript
const { startSession, photoUrl, timeRemaining } = useViewSession(photoId);
await startSession();
// photoUrl contains signed URL
// timeRemaining counts down from 180000ms
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `/.mcp.json` | MCP server configuration |
| `/.gitignore` | Excludes .mcp.json from git |
| `/echo-app/.env` | Environment variables |
| `/echo-app/src/lib/supabase.js` | Supabase client |
| `/echo-app/src/context/AuthContext.js` | Auth provider |
| `/echo-app/src/hooks/` | All Supabase hooks |
| `/echo-app/supabase/migrations/` | SQL migrations |

---

*Last updated: January 2025*
*MCP Integration: Active*
