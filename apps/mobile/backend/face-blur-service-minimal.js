/**
 * Echo Face Blur Service - Minimal Dev Version
 * Stub-only version without heavy dependencies for quick testing
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

// Load environment from apps/mobile/.env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// In-memory dev job store for process-image/status stubs
const devJobs = new Map();

/**
 * Dev helper: Challenge code endpoint
 */
app.get('/api/camera/challenge', (req, res) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'ECHO';
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  res.json({ code, expiresAt });
});

/**
 * Main image processing endpoint (stub)
 */
app.post('/api/process-image', (req, res) => {
  const useStubs = process.env.ECHO_DEV_STUBS === 'true';
  if (!useStubs) {
    return res.status(503).json({ 
      error: 'Real processing not available in minimal mode' 
    });
  }
  
  // Dev stub: immediately return a mock jobId
  const jobId = crypto.randomUUID();
  devJobs.set(jobId, Date.now());
  return res.json({
    jobId,
    status: 'processing',
    message: 'Dev stub: processing started',
  });
});

/**
 * Get processing status endpoint (stub)
 */
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || `http://localhost:${process.env.PORT || 3000}`;

app.get('/api/process-status/:jobId', (req, res) => {
  const useStubs = process.env.ECHO_DEV_STUBS === 'true';
  if (!useStubs) {
    return res.status(503).json({ 
      error: 'Real processing not available in minimal mode' 
    });
  }
  
  const { jobId } = req.params;
  const started = devJobs.get(jobId);
  if (!started) {
    devJobs.set(jobId, Date.now());
    return res.json({ jobId, status: 'processing', progress: 10 });
  }
  const elapsed = Date.now() - started;
  if (elapsed >= 500) {
    return res.json({
      jobId,
      status: 'completed',
      progress: 100,
      publicUrl: `${PUBLIC_ORIGIN}/dev-upload/${jobId}/`,
    });
  }
  const progress = Math.min(99, Math.max(15, Math.floor((elapsed / 500) * 100)));
  return res.json({ jobId, status: 'processing', progress });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: 'minimal',
    stubsEnabled: process.env.ECHO_DEV_STUBS === 'true',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Dev upload endpoints
 */
app.post('/_create/api/upload/presign/', (req, res) => {
  const secureExpire = String(Math.floor(Date.now() / 1000) + 60);
  res.json({ secureSignature: 'dev-signature', secureExpire });
});

app.post('/_create/api/upload/', async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const url = `${PUBLIC_ORIGIN}/dev-upload/${id}/`;
    const mimeType = 'image/jpeg';
    res.json({ url, mimeType });
  } catch (error) {
    console.error('Dev upload error:', error);
    res.status(500).json({ error: 'Upload failed (dev)' });
  }
});

// Serve a simple placeholder response for dev-upload URLs
app.get('/dev-upload/:id/', async (req, res) => {
  // Return a simple base64 encoded 1x1 pixel JPEG
  const pixel = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==', 'base64');
  res.set('Content-Type', 'image/jpeg');
  res.send(pixel);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const useStubs = process.env.ECHO_DEV_STUBS === 'true';
  const bannerLines = [
    '==========================================',
    ' ECHO DEV SERVER (MINIMAL)',
    ` Mode: ${useStubs ? 'STUBS ENABLED' : 'REAL SERVICES (not available)'}`,
    useStubs ? ' API calls will be mocked.' : ' Set ECHO_DEV_STUBS=true for mocks.',
    '==========================================',
    ` Face blur service running on port ${PORT}`,
    ` Environment: ${process.env.NODE_ENV || 'development'}`,
    ` ECHO_DEV_STUBS: ${useStubs}`,
  ];
  console.log(bannerLines.map((l) => `// ${l}`).join('\n'));
});