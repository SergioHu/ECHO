# Bugs & Issues Log

## Open
### 2025-09-19 ? Web camera capture never resolves
- **Impact:** Echo responders on web cannot finish submissions; the capture screen stays in `processing` forever.
- **Surface:** `src/components/camera/EchoCameraWebFixed.jsx` waits for `/api/process-status/:jobId` to return `status === "completed"`.
- **Root cause (current understanding):**
  1. Frontend posts raw captures to `/api/process-image` with `platform: "web"` (see `EchoCameraWebFixed.jsx`).
  2. Backend (`backend/face-blur-service.js`) detects `ECHO_DEV_STUBS=true` in local env and short-circuits, returning a stubbed job without ever touching Redis or Supabase.
  3. `/api/process-status/:jobId` then polls the in-memory stub map, which currently never transitions to `completed` with a blurred asset URL.
- **Severity:** High for web parity (native unaffected).
- **Next actions:**
  - Implement stub completion in `face-blur-service.js` so dev mode mirrors a real `completed` response, or disable stubs for end-to-end testing.
  - When running the production path, ensure Redis is available and Supabase credentials point to buckets with read/write access.
  - Add defensive timeout + user messaging in `EchoCameraWebFixed.jsx` so the UI surfaces a retry option instead of hanging.

## Recently Resolved
- _None yet._
