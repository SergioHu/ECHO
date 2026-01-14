# PROJECT ECHO: BACKEND MASTER CONTEXT (SUPABASE + STRIPE)

**Act as a Senior Backend Architect and Database Administrator.**
We are building the backend for **"Echo"**, an on-demand ephemeral photo marketplace.

## 1. TECH STACK
- **Platform:** Supabase (Managed PostgreSQL).
- **Auth:** Supabase Auth (Email/Password).
- **Storage:** Supabase Storage (for temporary photos).
- **Logic:** Supabase Edge Functions (Deno/TypeScript).
- **Payments:** Stripe (PaymentIntents).
- **Geo:** PostGIS (for precise location queries).

## 2. BUSINESS RULES (NON-NEGOTIABLE)
1.  **The "10-Meter" Rule:** Agents can only submit a photo if their GPS location is within 10 meters of the request coordinates. (Validated via PostGIS).
2.  **The "3-Minute" Rule:** Photos are strictly ephemeral. They must be hard-deleted from Storage and Database exactly 3 minutes (180 seconds) after the first view. Warning shown at 30s remaining, critical at 10s.
3.  **The "No Refund" Rule:** If a photo is reported, the Agent forfeits their €0.40 cut, but the Requester does not get a refund (simplifies flows). The €0.50 is sunk cost.
4.  **The Split:**
    - Total Transaction: €0.50.
    - Agent Earnings: €0.40 (added to internal ledger).
    - Platform Revenue: €0.10.

---

## 3. DATABASE SCHEMA STRATEGY

### A. Tables
1.  **`profiles`**: Extends `auth.users`.
    - `id` (uuid, PK)
    - `balance` (decimal, default 0)
    - `reputation` (int)
    - `is_agent` (boolean)

2.  **`requests`**: The job postings.
    - `id` (uuid, PK)
    - `requester_id` (FK to profiles)
    - `location` (geography(Point) - CRITICAL for geospatial queries)
    - `title` (text)
    - `price` (decimal, default 0.50)
    - `status` (enum: 'open', 'locked', 'fulfilled', 'expired')
    - `created_at` (timestamp)

3.  **`photos`**: The ephemeral content.
    - `id` (uuid, PK)
    - `request_id` (FK to requests)
    - `agent_id` (FK to profiles)
    - `storage_path` (text)
    - `expires_at` (timestamp) - Set automatically to NOW() + 3 minutes (180 seconds) upon first view.
    - `is_reported` (boolean)

### B. Security (Row Level Security - RLS)
- **Profiles:** Users can read public profiles but only update their own.
- **Requests:** Publicly readable (so Agents can find them). Only create-able by authenticated users.
- **Photos:**
    - **INSERT:** Only allowed if `request_id` is nearby (check PostGIS distance < 10m in a Database Function).
    - **SELECT:** Only allowed if `auth.uid() == requester_id` AND `now() < expires_at`.
    - **CRITICAL:** If `now() > expires_at`, the row must be invisible to everyone, effectively "deleting" access before physical deletion.

---

## 4. EDGE FUNCTIONS (BUSINESS LOGIC)

### Function 1: `create-order`
- **Trigger:** Requester wants to post a request.
- **Action:** 
    1. Create Stripe PaymentIntent (€0.50).
    2. Insert row into `requests` table.
    3. Return `client_secret` to frontend.

### Function 2: `submit-photo` (The "Handover")
- **Trigger:** Agent uploads photo.
- **Action:**
    1. Verify GPS distance (Double check server-side).
    2. Insert into `photos`.
    3. Update `requests` status to 'fulfilled'.
    4. **Ledger:** UPDATE `profiles` SET balance = balance + 0.40 WHERE id = agent_id.

### Function 3: `cleanup-cron` (Privacy Enforcement)
- **Trigger:** Scheduled every 1 minute via `pg_cron`.
- **Action:** 
    1. Query `photos` where `expires_at < NOW()`.
    2. Delete corresponding files from Supabase Storage.
    3. Delete rows from `photos` table.

---

## 5. ADMIN DASHBOARD & PHOTO REVIEW SYSTEM

### Purpose
The Admin Dashboard is **CRITICAL** for reviewing reported photos. Only authorized reviewers/admins can access this feature.

### A. Admin Roles Table
```sql
-- Add to profiles table or create separate roles table
ALTER TABLE profiles ADD COLUMN role VARCHAR(20) DEFAULT 'user';
-- Roles: 'user', 'reviewer', 'admin'
```

### B. Reported Photos Table
```sql
CREATE TABLE reported_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID REFERENCES photos(id),
    request_id UUID REFERENCES requests(id),
    reporter_id UUID REFERENCES profiles(id),
    agent_id UUID REFERENCES profiles(id),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'reviewed', 'upheld', 'dismissed'
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### C. RLS Policies for Admin Access
```sql
-- Only reviewers/admins can view reported photos
CREATE POLICY "Reviewers can view reports"
ON reported_photos FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('reviewer', 'admin')
    )
);

-- Only admins can update report status
CREATE POLICY "Admins can update reports"
ON reported_photos FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);
```

### D. Admin Edge Functions

#### Function: `review-photo`
- **Trigger:** Admin reviews a reported photo
- **Action:**
    1. Verify caller has 'reviewer' or 'admin' role
    2. Update `reported_photos.status`
    3. If upheld: Apply strike to agent, forfeit payment
    4. If dismissed: No action, close report
    5. Log audit trail

#### Function: `get-pending-reports`
- **Trigger:** Admin opens dashboard
- **Action:**
    1. Verify caller role
    2. Return all `reported_photos` where `status = 'pending'`
    3. Include photo data, agent info, reporter info

### E. Security Notes
- **NEVER** expose admin endpoints to regular users
- All admin actions must be logged for audit
- Photo review access is time-sensitive (before photo expires)
- Consider extending photo TTL for reported photos until review complete

### F. Frontend Admin Screens (Already Implemented)
- `AdminDashboard.js` — Main admin hub
- `PhotoReviewer.js` — Review individual reported photos
- `DisputesList.js` — List of all disputes
- `DisputeReview.js` — Detailed dispute review
- `ManageUsers.js` — User management
- `Analytics.js` — Platform analytics

---

## 6. IMPLEMENTATION STEPS (WAIT FOR MY COMMAND)

**Phase 1: Database Init**
- Enable PostGIS extension.
- Create Tables & Enums.
- Setup RLS Policies.

**Phase 2: Storage & Geo**
- Create `echo-temp` bucket.
- Write the Database Function `is_within_range(lat, long, request_id)` returning boolean.

**Phase 3: The Stripe Integration**
- Setup the PaymentIntent logic.

**Phase 4: The "Self-Destruct" Timer**
- Configure the cleanup job.

**Phase 5: Admin & Review System**
- Add `role` column to profiles table.
- Create `reported_photos` table.
- Setup admin RLS policies.
- Create `review-photo` and `get-pending-reports` Edge Functions.
- Connect frontend Admin Dashboard to backend.

---

## 7. ADMIN DASHBOARD FLOW

```
User Reports Photo (PhotoViewerScreen)
        ↓
reported_photos table (status: 'pending')
        ↓
Admin opens AdminDashboard
        ↓
Admin sees pending reports in DisputesList
        ↓
Admin reviews photo in DisputeReview/PhotoReviewer
        ↓
Admin decision:
    ├── UPHELD → Agent gets strike, forfeits €0.40
    └── DISMISSED → No action, case closed
        ↓
reported_photos.status updated
        ↓
Audit log created
```

---

Acknowledge this architecture. I will instruct you on which Phase to execute first.
