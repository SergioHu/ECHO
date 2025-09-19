# Backend Architecture

This document captures the current server-side design for Echo. It covers the production face blur service, the simplified development server, how they integrate with Supabase storage, Redis, and the Expo client, plus the gaps that still need to be addressed.

## Overview
- **Primary service:** `backend/face-blur-service.js` ? Node/Express API that performs authoritative face detection and masking for web captures.
- **Queues:** Bull + Redis queue (`image-processing`) handles asynchronous blur jobs so web clients can poll for status.
- **Storage:** Supabase buckets (private ingestion + public distribution) supply source images and receive blurred results.
- **Auth:** Bearer token header with dev bypass; production path needs real JWT/session validation.
- **Deployment target:** DigitalOcean Droplet running Node 18.x (or later) with Redis service.

A fallback server (`backend/simple-dev-server.js`) mocks all endpoints for local development when computer vision dependencies are unavailable.

## Runtime Components
### Express API (`face-blur-service.js`)
- **Routing:**
  - `GET /health` ? service heartbeat including model load status.
  - `GET /api/camera/challenge` ? short-lived capture verification code surfaced in the client UI.
  - `POST /api/process-image` ? enqueues web captures for blurring and returns a `jobId` for polling.
  - `GET /api/process-status/:jobId` ? reports job state (`processing | completed | failed`) plus the blurred asset URL.
  - `POST /_create/api/upload/` & `/_create/api/upload/presign/` ? dev-friendly upload stubs used by `src/utils/useUpload.js`.
  - `POST /webhook/storage` ? listens to Supabase storage events to auto-queue new images (future automation path).
- **Face detection stack:** Loads Vision API models from `backend/models/**` on start via `@vladmandic/face-api`. Results feed into `sharp` to apply elliptical masks with +35%/+50% expansion, matching the contract from `CAMERA_ARCHITECTURE.md:41`.
- **Supabase integration:**
  - Reads env vars from `apps/mobile/.env` (shared with client) via `dotenv.config({ path: path.resolve(__dirname, '..', '.env') })`.
  - Uses `createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)` to pull originals from the private bucket and push blurred versions to the public bucket.
- **Job orchestration:** Adds payloads `{ imageUrl, userId, requestId, timestamp, jobId }` to Bull. Worker logic fetches the image, runs detection, stores the blurred result, and updates job metadata.
- **Dev stubs:** When `ECHO_DEV_STUBS=true`, `/api/process-image` skips queueing and records timestamps in an in-memory `Map`, allowing the frontend to exercise polling without Redis.

### Background Worker
The same process currently registers queue processors. For production scalability, extract workers into a separate Node process that shares the Redis URL. Pending TODOs exist in the code to split this responsibility and add failure retries/backoff.

### Simplified Dev Server (`simple-dev-server.js`)
- Pure Express + in-memory storage; no face detection, Redis, or Supabase.
- Mirrors the production routes with static responses and canned delays (`setTimeout` to 2s) so the mobile/web client can run end-to-end during UI development.
- Automatically generates placeholder blurred JPEGs via `sharp` for `/dev-upload/:id/` requests.

### Minimal Service (`face-blur-service-minimal.js`)
A trimmed version that keeps the API surface but removes queue + Supabase dependencies. Useful for Windows developers who cannot compile `sharp`; relies entirely on stubbed responses.

## Data Flow
1. **Capture:** Web client uploads raw image to Supabase private bucket via `useUpload()` -> `/ _create /api/upload/` (stub) or direct Uploadcare (mobile).
2. **Processing Kickoff:** Frontend calls `POST /api/process-image` with `{ imageUrl, userId, requestId, timestamp, platform:'web' }`.
3. **Queue:** Server enqueues job (or stubs it in dev mode) and returns `jobId`.
4. **Worker:** Fetches private asset, runs face detection, composes blur overlays, saves final JPEG to public bucket, and marks the job as `completed` with metadata.
5. **Client Polling:** Frontend hits `GET /api/process-status/:jobId` until completion and then swaps the preview to the blurred image.
6. **Challenge Verification:** Optional `GET /api/camera/challenge` ensures each capture session receives a short-lived code for antifraud UI prompts.

## Environment & Configuration
Primary env vars (load from `apps/mobile/.env`):
- `PORT` ? server port, default 3000.
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_STORAGE_BUCKET_PRIVATE`, `SUPABASE_STORAGE_BUCKET_PUBLIC`.
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_USE_TLS` (future), `REDIS_PASSWORD`.
- `ECHO_DEV_STUBS` ? toggles stubbed processing.
- `PUBLIC_ORIGIN` ? external URL used to craft dev upload responses for `useUpload()`.

## Operational Notes
- **Model assets:** `backend/models` must contain SSD Mobilenet, TinyFace, and FaceLandmark nets exported for `@vladmandic/face-api`.
- **Logging:** Console logs highlight queue transitions, processing durations, and errors; instrument with structured logs before production cutover.
- **Metrics:** To-do ? add basic Prometheus or statsd counters for job throughput, detection failures, and mask counts.
- **Error handling:** `/api/process-image` currently returns generic 500 on Supabase failures; plan custom error shapes for the client to surface actionable issues.

## Local Development
1. Install dependencies: `npm install` inside `apps/mobile/backend`.
2. Copy `.env.example` to `.env` in the repo root and set `ECHO_DEV_STUBS=true`.
3. Run the dev server: `node backend/simple-dev-server.js` when working on UI only.
4. Run the full service (requires `sharp`, Redis, and Supabase creds): `node backend/face-blur-service.js`.
5. Expo app expects the backend at `http://localhost:3000`; adjust `EXPO_PUBLIC_BASE_URL` if port changes.

## Open Workstreams
- Harden auth for `/api/process-image` and upload endpoints.
- Externalize queue workers and add retry/backoff policy.
- Streamline Supabase storage paths to avoid race conditions when multiple answers upload simultaneously.
- Integrate production-grade detector (RetinaFace/SCRFD) and benchmark versus the current face-api models.
- Wire webhook automation so storage INSERTs trigger processing without client polling.
