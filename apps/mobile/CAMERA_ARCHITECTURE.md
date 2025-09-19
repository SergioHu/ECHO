# Camera Architecture: Live Multi-Face Blur with Capture Guarantee

This document describes the final camera architecture for Echo across Mobile (iOS/Android) and Web. It ensures that every captured photo has all faces blurred, while providing smooth, live preview blurring and robust fallbacks.

## Quick Start Guide

### For Development
1. **Start the backend server** (in a separate terminal):
   ```bash
   cd backend
   node simple-dev-server.js
   ```
   
2. **Start the Expo dev server** (in main directory):
   ```bash
   node_modules/.bin/expo start --clear
   ```
   
3. **Open the app**:
   - Web: Navigate to `http://localhost:8081`
   - Mobile: Scan QR code with Expo Go app

4. **Verify backend connection**:
   - Check health: `http://localhost:3000/health`
   - Should return: `{"status":"ok","server":"Echo Dev Server"}`

### Troubleshooting
- **Connection Refused**: Ensure backend server is running on port 3000
- **Image Not Displaying**: Check browser console for URI format issues
- **Windows Issues**: Use `simple-dev-server.js` instead of `face-blur-service.js`

## Goals
- Live preview shows face masks that follow motion in real-time.
- Captured photo is guaranteed to blur every face before storage or upload.
- Never save or upload an unblurred face.

---

## Mobile (iOS/Android)

### Live Preview (VisionCamera)
- Stack: react-native-vision-camera + react-native-vision-camera-face-detector + Skia.
- Detector config (preview):
  - performanceMode: fast
  - trackingEnabled: true
  - minFaceSize: 0.02 (2% of image)
  - maxFaces: 20
- Mask expansion: +35% width, +50% height (forehead/chin/sides).
- Optional debug overlay: Green rounded rectangles show detected regions in __DEV__.

### Capture Guarantee
1) Burst Refine (N=8 frames)
- Maintain a rolling buffer of the last 8 frames of face rectangles.
- On shutter, compute union (IoU clustering) to merge near/overlapping boxes.
- Send union boxes to the worklet via SharedValue override.
- Wait ~120 ms to ensure override masks render; then capture via ViewShot.

2) Accurate Still-Image Pass (Recommended)
- Immediately run ML Kit on the captured still (scaled to ~1280 px wide):
  - performanceMode: accurate
  - minFaceSize: 0.01
- Union any new boxes with burst results.
- Re-apply blur to the still (Skia bitmap) and persist/upload that file.

3) Fail-Safe
- If accurate pass returns 0 faces in an obviously face-present scene, apply privacy-first zones to the still.

### Why This Works
- Live preview detector + tracker handles motion and multiple faces.
- Burst refine mitigates single-frame misses.
- Still-image accurate pass provides a final, authoritative guarantee before persistence.

---

## Web

### Live Preview (UX Only)
- Keep Expo Camera for capture.
- Add MediaPipe Face Detection (Tasks Vision) to run in the browser.
- Draw dynamic blurred ovals on a canvas overlay above the <video> element.
- Do NOT alter the captured frame client-side; preview is for UX only.

### Capture Guarantee (Authoritative)
- Upload the original capture to the server.
- Server runs a robust multi-face detector (e.g., RetinaFace/SCRFD).
- Expand masks by +35%/+50% and blur faces server-side.
- Return a blurred public URL; final asset is always blurred.

### Structure
- <CameraView> with no children to avoid warnings.
- Overlays (header/footer/preview blur canvas) are absolutely-positioned siblings in a wrapper view.

### Fail-Safe
- If the server detector returns 0 faces in obvious face scenes, apply privacy-first zones server-side.

---

## Shared

- Mask Geometry: Elliptical/rounded masks aligned to expanded bounds.
- Safety Logging: Log detection counts and mapped rectangles periodically in __DEV__.
- UI: Only allow "Use This Photo" after guarantee conditions are satisfied (detected >= 1 or privacy fallback applied).

---

## File Structure & Key Components

### Core Camera Components
- **src/components/EchoCameraPro.tsx**
  - Real-time detector (fast) for preview
  - Debug overlay for live rectangles
  - Burst refine (union of last 8 frames)
  - SharedValue override for capture
  - Hook points to add accurate still-image pass

- **src/components/camera/EchoCameraWeb.tsx**
  - Server-side detection pipeline for final blur
  - Processing state management with progress tracking
  - Polling mechanism for async processing status
  - Overlays positioned as siblings, not children of CameraView
  - Challenge code integration for verification

- **src/components/EchoCameraUnified.jsx**
  - Platform-agnostic camera interface
  - Routes to appropriate implementation based on platform

### Response Flow
- **src/app/respond/[id].jsx**
  - Main response screen with camera integration
  - Routes web camera to EchoCameraWeb.tsx
  - State management for captured photos
  - Location verification system
  - Two-step response flow: photo + text explanation
  - Normalized URI handling for cross-platform compatibility

### Backend Services
- **backend/face-blur-service.js**
  - Production backend with face detection
  - Redis queue for async processing
  - Supabase integration for storage
  - Webhook support for automated processing

- **backend/simple-dev-server.js**
  - Simplified development server
  - Mock endpoints for all camera APIs
  - No external dependencies required
  - Simulated 2-second processing delay

---

## Development Environment Setup

### Backend Server Requirements
For local development, the camera system requires a backend server running on port 3000:

1. **Simplified Dev Server** (`backend/simple-dev-server.js`)
   - Lightweight Node.js/Express server for development
   - Provides all necessary endpoints without complex dependencies
   - No actual face detection - returns stubbed responses
   - Start with: `node backend/simple-dev-server.js`

2. **Full Backend Server** (`backend/face-blur-service.js`)
   - Production-ready server with actual face detection
   - Requires: sharp, @vladmandic/face-api, @supabase/supabase-js, bull, Redis
   - Start with: `node backend/face-blur-service.js`
   - Note: Complex dependencies may require additional setup on Windows

### Environment Configuration (.env)
```
EXPO_PUBLIC_BASE_URL=http://localhost:3000
EXPO_PUBLIC_PROXY_BASE_URL=http://localhost:3000
ECHO_DEV_STUBS=true  # Enable dev stubs for simplified testing
```

### API Endpoints
- `/health` - Health check endpoint
- `/api/camera/challenge` - Generate challenge codes for verification
- `/api/process-image` - Process captured images (blur faces)
- `/api/process-status/:jobId` - Check processing status
- `/_create/api/upload/` - Handle image uploads

---

## Current Implementation Status

### ✅ Completed
- **Mobile Preview**: Live face detection with VisionCamera + Skia masks
- **Web Camera**: Server-side processing pipeline established
- **State Management**: Fixed data flow for captured images in respond/[id].jsx
- **Development Server**: Simplified backend for local testing
- **Challenge System**: Verification codes for capture authenticity
- **CORS Configuration**: Proper cross-origin support for web development

### 🔧 Recent Fixes (September 2024)
- **Backend Connectivity**: Resolved `net::ERR_CONNECTION_REFUSED` errors
- **Image Display Bug**: Fixed state management to properly show captured photos
- **URI Normalization**: Handles multiple URI property formats (imageUrl, localUri, uri)
- **Success Modal**: Removed redundant modal, integrated feedback into main UI
- **Package Updates**: Updated Expo and React Native dependencies to latest compatible versions

### 📝 Known Issues & Workarounds
- **Windows Development**: Sharp module installation may fail; use simple-dev-server.js instead
- **Face Detection Models**: Model files need to be downloaded separately for production server
- **Redis Dependency**: Production server requires Redis; dev server works without it

---

## Next Implementation Tasks
- [ ] Implement accurate still-image pass for mobile and bitmap re-blur
- [ ] Add MediaPipe live detection overlay for web preview
- [ ] Finalize server model (RetinaFace/SCRFD) and integrate thresholds
- [ ] Harden fail-safe: privacy-first zones on still/server when detection fails
- [ ] Add progressive image loading for better UX
- [ ] Implement retry logic for failed uploads
- [ ] Add telemetry for face detection accuracy monitoring

This architecture provides live, synchronized multi-face blur during preview and a two-stage guarantee that the final captured asset always blurs every face.
