# ECHO Backend - Claude Context

**Last Updated:** January 2025
**Backend:** Supabase (PostgreSQL + PostGIS)
**Communication:** MCP Protocol (Model Context Protocol)

---

## CRITICAL: ALL BACKEND COMMUNICATION VIA MCP

> **IMPORTANT:** All database operations, migrations, queries, and troubleshooting
> MUST be performed via MCP Protocol. Claude is connected to both Supabase MCP
> and Stripe MCP for direct backend communication.

---

## 1. MCP CONFIGURATION

### Supabase MCP Connection

**Status:** ✅ CONNECTED

```json
// .mcp.json (project root)
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=dyywmbrxvypnpvuygqub"
    }
  }
}
```

| Setting | Value |
|---------|-------|
| **MCP Server** | `supabase` |
| **Transport** | HTTP |
| **URL** | `https://mcp.supabase.com/mcp` |
| **Project Ref** | `dyywmbrxvypnpvuygqub` |
| **Auth** | OAuth 2.0 (authenticated) |

### GitHub MCP Connection

**Status:** ✅ CONNECTED

```json
// .mcp.json (project root)
{
  "mcpServers": {
    "supabase": { ... },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<token>"
      }
    }
  }
}
```

| Setting | Value |
|---------|-------|
| **MCP Server** | `github` |
| **Transport** | stdio (npx) |
| **Repository** | `SergioHu/ECHO` |
| **Capabilities** | Issues, PRs, Commits, Branches |

### GitHub MCP Usage

```
"Create a new issue for bug tracking"
"List open pull requests"
"Get commit history for main branch"
"Create a new branch for feature development"
```

### Stripe MCP Connection (When Configured)

```json
// Future .mcp.json addition
{
  "mcpServers": {
    "supabase": { ... },
    "github": { ... },
    "stripe": {
      "type": "http",
      "url": "https://mcp.stripe.com/v1"
    }
  }
}
```

---

## 2. MCP USAGE PATTERNS

### Schema Operations

```
"Create a new table called notifications with columns..."
"Add a column 'verification_status' to the profiles table"
"Drop the unused 'temp_data' table"
```

### Migration Management

```
"Apply the migration file 00027_new_feature.sql to Supabase"
"Execute this SQL via MCP: CREATE TABLE..."
"Run the migration in /supabase/migrations/00028_fix.sql"
```

### RPC Function Creation

```
"Create an RPC function called get_user_stats that returns..."
"Update the submit_photo function to add validation..."
"Drop and recreate the resolve_dispute function"
```

### Data Queries (Debugging)

```
"Query all requests where status is 'open'"
"Select the last 10 photos with their request details"
"Count disputes grouped by status"
"Show me profile for user ID xyz"
```

### RLS Policy Management

```
"Show me the RLS policies for the photos table"
"Add a new policy allowing admins to view all disputes"
"Update the select policy on requests to include own requests"
```

### Storage Operations

```
"List all storage buckets"
"Check the policies on the echo-photos bucket"
"Generate a signed URL for photo xyz"
```

### Stripe Operations (via Stripe MCP)

```
"Create a PaymentIntent for €0.50"
"Retrieve customer details for customer_id"
"List recent payments for account"
"Create a payout to connected account"
```

---

## 3. DATABASE SCHEMA

### Project Details

| Setting | Value |
|---------|-------|
| **Project URL** | `https://dyywmbrxvypnpvuygqub.supabase.co` |
| **Project Ref** | `dyywmbrxvypnpvuygqub` |
| **Region** | (Supabase hosted) |
| **Database** | PostgreSQL with PostGIS |

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
| `role` | TEXT | `user`, `agent`, `reviewer`, `admin` |
| `stripe_customer_id` | TEXT | Stripe integration |
| `stripe_account_id` | TEXT | Stripe Connect |
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
| `status` | request_status | Enum (see below) |
| `validation_radius` | INTEGER | Meters for validation (default: 10) |
| `locked_at` | TIMESTAMPTZ | When agent locked |
| `fulfilled_at` | TIMESTAMPTZ | When photo accepted |
| `expires_at` | TIMESTAMPTZ | Request expiration |
| `created_at` | TIMESTAMPTZ | Creation time |

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
| `status` | photo_status | Enum (see below) |
| `is_reported` | BOOLEAN | Currently disputed |
| `rejection_reason` | TEXT | Why rejected (admin) |
| `view_session_started_at` | TIMESTAMPTZ | When viewing started |
| `view_session_expires_at` | TIMESTAMPTZ | When 3-min timer expires |
| `created_at` | TIMESTAMPTZ | Upload time |

#### `disputes`
Photo disputes/reports.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Dispute ID |
| `request_id` | UUID (FK) | Related request |
| `photo_id` | UUID (FK) | Disputed photo |
| `reporter_id` | UUID (FK) | Who reported |
| `reason` | dispute_reason | Enum (see below) |
| `description` | TEXT | Details |
| `status` | dispute_status | Enum (see below) |
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
| `type` | ledger_type | Enum (see below) |
| `amount_cents` | INTEGER | Transaction amount |
| `balance_after_cents` | INTEGER | Balance after transaction |
| `request_id` | UUID (FK) | Related request |
| `photo_id` | UUID (FK) | Related photo |
| `dispute_id` | UUID (FK) | Related dispute |
| `description` | TEXT | Transaction description |
| `created_at` | TIMESTAMPTZ | Transaction time |

---

## 4. ENUMS

```sql
-- Request status
CREATE TYPE request_status AS ENUM (
    'open',       -- Available for agents
    'locked',     -- Agent accepted, taking photo
    'fulfilled',  -- Photo delivered
    'expired',    -- Timed out
    'cancelled',  -- Creator cancelled
    'disputed'    -- Under review
);

-- Photo status
CREATE TYPE photo_status AS ENUM (
    'pending',    -- Just uploaded
    'validated',  -- Location verified
    'viewed',     -- Creator started viewing
    'expired',    -- 3-min timer ended
    'approved',   -- Admin approved
    'disputed',   -- Under dispute
    'rejected'    -- Admin rejected
);

-- Dispute status
CREATE TYPE dispute_status AS ENUM (
    'open',            -- New dispute
    'under_review',    -- Admin reviewing
    'resolved_creator',-- Creator wins
    'resolved_agent',  -- Agent wins
    'closed'           -- Case closed
);

-- Dispute reasons
CREATE TYPE dispute_reason AS ENUM (
    'wrong_location',
    'poor_quality',
    'wrong_subject',
    'inappropriate',
    'other'
);

-- Ledger types
CREATE TYPE ledger_type AS ENUM (
    'deposit',
    'withdrawal',
    'payment',
    'earning',
    'platform_fee',
    'refund',
    'bonus',
    'adjustment'
);
```

---

## 5. RPC FUNCTIONS

### `create_request()`
Creates a new photo request with PostGIS geography.

```sql
create_request(
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_location_name TEXT,
    p_description TEXT,
    p_price_cents INTEGER,
    p_category TEXT
) RETURNS UUID
```

**MCP Usage:**
```
"Create a request via RPC at latitude 40.7128, longitude -74.0060"
```

### `get_nearby_requests()`
Fetches open requests within radius using PostGIS.

```sql
get_nearby_requests(
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_radius_meters INTEGER DEFAULT 5000
) RETURNS TABLE (
    id, latitude, longitude, location_name, description,
    category, price_cents, status, distance_meters,
    created_at, expires_at, creator_id, is_own
)
```

**MCP Usage:**
```
"Call get_nearby_requests for lat 40.7, lng -74.0, radius 3000"
```

### `lock_request()`
Accepts a job atomically (prevents race conditions).

```sql
lock_request(
    p_request_id UUID
) RETURNS JSONB  -- { success: boolean, error?: string }
```

**MCP Usage:**
```
"Lock request ID abc-123 for the current user"
```

### `submit_photo()`
Submits a photo with 10-meter location validation.

```sql
submit_photo(
    p_request_id UUID,
    p_storage_path TEXT,
    p_latitude DECIMAL,
    p_longitude DECIMAL
) RETURNS UUID
```

**Validation:**
- Uses `ST_Distance()` to verify agent is within 10m
- Returns error if distance > validation_radius

### `start_view_session()`
Starts 3-minute viewing session for photo.

```sql
start_view_session(
    p_photo_id UUID
) RETURNS TABLE (
    photo_id UUID,
    storage_path TEXT,
    expires_at TIMESTAMPTZ,
    already_expired BOOLEAN
)
```

**Logic:**
- If `view_session_started_at IS NULL`: Sets to NOW() + 3 minutes
- Returns signed URL path and expiration

### `report_photo()`
Reports a photo (creates dispute).

```sql
report_photo(
    p_photo_id UUID,
    p_reason dispute_reason,
    p_description TEXT
) RETURNS UUID
```

### `resolve_dispute()`
Admin function to resolve disputes.

```sql
resolve_dispute(
    p_dispute_id UUID,
    p_resolution TEXT,
    p_reject BOOLEAN
) RETURNS JSONB
```

**Actions:**
- If approved (reject=false): Agent gets paid, photo remains
- If rejected (reject=true): Agent gets strike, refund processed
- Resets view session for re-viewing

### Admin Functions

```sql
-- Get dashboard statistics
get_admin_stats() RETURNS JSONB

-- Get disputes with optional status filter
get_admin_disputes(p_status TEXT) RETURNS TABLE

-- Get users with search
get_admin_users(p_search TEXT) RETURNS TABLE

-- Get analytics for period
get_admin_analytics(p_period TEXT) RETURNS JSONB

-- Get top photographers
get_top_photographers(p_limit INTEGER) RETURNS TABLE

-- Approve photo directly
admin_approve_photo(p_photo_id UUID) RETURNS BOOLEAN

-- Reject photo with reason
admin_reject_photo(p_photo_id UUID, p_reason TEXT) RETURNS BOOLEAN
```

---

## 6. ROW LEVEL SECURITY (RLS)

### Profiles
```sql
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```

### Requests
```sql
-- Anyone can see open requests
CREATE POLICY "Public can view open requests"
ON requests FOR SELECT
USING (status = 'open' OR creator_id = auth.uid() OR agent_id = auth.uid());

-- Authenticated users can create requests
CREATE POLICY "Authenticated can create requests"
ON requests FOR INSERT
WITH CHECK (auth.uid() = creator_id);
```

### Photos
```sql
-- Only requester can view during active session
CREATE POLICY "Requester can view active photos"
ON photos FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM requests r
        WHERE r.id = photos.request_id
        AND r.creator_id = auth.uid()
    )
    AND (view_session_expires_at IS NULL OR view_session_expires_at > NOW())
);

-- Agent can view their own photos
CREATE POLICY "Agent can view own photos"
ON photos FOR SELECT
USING (agent_id = auth.uid());
```

### Admin Policies
```sql
-- Admins can view all disputes
CREATE POLICY "Admins can view all disputes"
ON disputes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('reviewer', 'admin')
    )
);

-- Only admins can update disputes
CREATE POLICY "Admins can update disputes"
ON disputes FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);
```

---

## 7. STORAGE

### Bucket: `echo-photos`

| Setting | Value |
|---------|-------|
| **Name** | `echo-photos` |
| **Access** | Private (requires signed URLs) |
| **Structure** | `{request_id}/{agent_id}_{timestamp}.jpg` |
| **Signed URL Duration** | 180 seconds (3 minutes) |

### Storage Policies
```sql
-- Agents can upload photos
CREATE POLICY "Agents can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'echo-photos' AND auth.role() = 'authenticated');

-- Requesters can download their photos
CREATE POLICY "Requesters can download photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'echo-photos' AND ...);
```

---

## 8. MIGRATIONS

All migrations are in `/supabase/migrations/`. Apply via MCP.

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
| `00021_add_photo_rejection_reason.sql` | Rejection reason |
| `00022_fix_get_admin_disputes.sql` | Admin disputes fix |
| `00023_fix_get_admin_stats.sql` | Admin stats fix |
| `00024_photo_auto_cleanup.sql` | Auto cleanup expired |
| `00025_fix_get_nearby_requests.sql` | Nearby requests fix |
| `00026_fix_resolve_dispute_timer.sql` | Timer reset fix |

### Applying Migrations via MCP

```
"Apply the migration 00027_new_feature.sql to Supabase via MCP"
```

Or for inline SQL:
```
"Execute this SQL via MCP:
CREATE OR REPLACE FUNCTION my_function()
RETURNS void AS $$
BEGIN
  -- function body
END;
$$ LANGUAGE plpgsql;"
```

---

## 9. STRIPE INTEGRATION (via MCP)

### Payment Flow

```
1. User creates request
   └── MCP: Create PaymentIntent (€0.50)
   └── Return client_secret to frontend

2. Frontend completes payment
   └── Stripe SDK confirms payment

3. Webhook receives confirmation
   └── Update request status to 'open'

4. Agent submits photo
   └── Update request status to 'fulfilled'
   └── Credit agent balance (€0.40)
   └── Record ledger entry
```

### Stripe MCP Commands

```
"Create a PaymentIntent for 50 cents EUR"
"Retrieve PaymentIntent pi_xxx"
"Create a Stripe customer for user email@example.com"
"Create a payout of €10.00 to connected account acct_xxx"
"List recent charges for the account"
```

### Webhook Events

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Set request status to 'open' |
| `payment_intent.payment_failed` | Set request status to 'expired' |
| `payout.paid` | Update user balance |

---

## 10. BUSINESS RULES IMPLEMENTATION

### 10-Meter Validation (PostGIS)

```sql
-- In submit_photo function
SELECT ST_Distance(
    ST_MakePoint(p_longitude, p_latitude)::geography,
    r.location
) INTO v_distance
FROM requests r WHERE r.id = p_request_id;

IF v_distance > COALESCE(r.validation_radius, 10) THEN
    RAISE EXCEPTION 'Too far from target location';
END IF;
```

### 3-Minute Timer

```sql
-- In start_view_session function
IF v_photo.view_session_started_at IS NULL THEN
    UPDATE photos SET
        view_session_started_at = NOW(),
        view_session_expires_at = NOW() + INTERVAL '3 minutes'
    WHERE id = p_photo_id;
END IF;
```

### Race Condition Prevention

```sql
-- In lock_request function (atomic)
UPDATE requests SET
    agent_id = auth.uid(),
    status = 'locked',
    locked_at = NOW()
WHERE id = p_request_id
AND status = 'open'
AND agent_id IS NULL
RETURNING * INTO v_request;

IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request already taken');
END IF;
```

---

## 11. TROUBLESHOOTING VIA MCP

### Check Function Exists
```
"Check if function get_nearby_requests exists in Supabase"
```

### Debug RLS Issues
```
"Show me all RLS policies for the requests table"
"Test if user xyz can select from photos table"
```

### Query Data Issues
```
"Select all requests where status is 'open' and show creator details"
"Count photos grouped by status"
"Show the last 10 ledger entries"
```

### Check Schema
```
"Describe the photos table schema"
"List all columns in the disputes table"
"Show all foreign keys on the requests table"
```

### Storage Issues
```
"List all buckets in Supabase Storage"
"Show policies for the echo-photos bucket"
"Check if file path exists in storage"
```

---

## 12. COMMON MCP OPERATIONS

### Create New Migration
```
"Create a new migration file 00027_add_notifications.sql with:
- notifications table
- RLS policies
- Insert trigger"
```

### Update RPC Function
```
"Update the get_nearby_requests function to also return category field"
```

### Fix Data Issue
```
"Update all requests where status is 'locked' and locked_at < NOW() - INTERVAL '1 hour' to status 'expired'"
```

### Add Column
```
"Add column 'notification_token' TEXT to profiles table"
```

### Create Index
```
"Create a spatial index on requests.location for faster nearby queries"
```

---

## 13. SECURITY CHECKLIST

### Database Security
- [x] RLS enabled on all tables
- [x] Service role key never exposed to client
- [x] Anon key used for client operations
- [x] Admin functions check role claims

### Storage Security
- [x] Private bucket (no public access)
- [x] Signed URLs with short expiry (3 min)
- [x] Upload policies restrict to authenticated users
- [x] Download policies verify ownership

### API Security
- [x] All RPC functions check auth.uid()
- [x] Admin functions verify role
- [x] Atomic operations prevent race conditions
- [x] Input validation in all functions

### Audit Logging
- [x] Ledger entries track all transactions
- [x] Dispute resolution logged
- [x] Photo access tracked via view_session_started_at

---

## 14. ENVIRONMENT VARIABLES

### Supabase (Client-Side)
```env
EXPO_PUBLIC_SUPABASE_URL=https://dyywmbrxvypnpvuygqub.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Supabase (Server-Side - Edge Functions)
```env
SUPABASE_URL=https://dyywmbrxvypnpvuygqub.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Stripe
```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

**For frontend documentation, see:** `/echo-app/CLAUDE.md`
**For main project context, see:** `/CLAUDE.md`
