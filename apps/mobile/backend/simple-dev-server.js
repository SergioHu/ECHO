/**
 * Simplified Echo Dev Server
 * Minimal backend for local development without complex dependencies
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

// Simple UUID v4 generator
const uuidv4 = () => crypto.randomUUID();

// Load environment from apps/mobile/.env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// In-memory store for dev jobs
const devJobs = new Map();

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'Echo Dev Server',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Challenge code endpoint
 * Simple random code generator with 5-minute expiry
 */
app.get('/api/camera/challenge', (req, res) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'ECHO-';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  
  console.log(`[Challenge] Generated code: ${code}`);
  res.json({ code, expiresAt });
});

/**
 * Main image processing endpoint (stub)
 * Simulates image processing without actual face detection
 */
app.post('/api/process-image', (req, res) => {
  const { imageUrl, userId, requestId, timestamp, platform } = req.body;
  
  console.log('[Process] Image processing request:', {
    userId,
    requestId,
    platform,
    timestamp,
  });
  
  // Generate a job ID
  const jobId = uuidv4();
  devJobs.set(jobId, {
    status: 'processing',
    startTime: Date.now(),
    imageUrl,
    userId,
    requestId,
  });
  
  // Simulate async processing - mark as complete after 2 seconds
  setTimeout(() => {
    const job = devJobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.publicUrl = `http://localhost:3000/dev-upload/${jobId}.jpg`;
      console.log(`[Process] Job ${jobId} completed`);
    }
  }, 2000);
  
  res.json({
    jobId,
    status: 'processing',
    message: 'Dev stub: processing started',
  });
});

/**
 * Get processing status endpoint (stub)
 */
app.get('/api/process-status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = devJobs.get(jobId);
  
  if (!job) {
    console.log(`[Status] Job ${jobId} not found`);
    return res.status(404).json({ error: 'Job not found' });
  }
  
  const elapsed = Date.now() - job.startTime;
  const progress = Math.min(100, Math.floor((elapsed / 2000) * 100));
  
  console.log(`[Status] Job ${jobId}: ${job.status} (${progress}%)`);
  
  res.json({
    jobId,
    status: job.status,
    progress,
    ...(job.status === 'completed' && { publicUrl: job.publicUrl }),
  });
});

/**
 * Presign endpoint for upload (stub)
 */
app.post('/_create/api/upload/presign/', (req, res) => {
  const secureExpire = String(Math.floor(Date.now() / 1000) + 60);
  console.log('[Upload] Presign request');
  res.json({ 
    secureSignature: 'dev-signature', 
    secureExpire 
  });
});

/**
 * Generic upload endpoint (stub)
 */
app.post('/_create/api/upload/', (req, res) => {
  const id = uuidv4();
  const url = `http://localhost:3000/dev-upload/${id}.jpg`;
  
  console.log(`[Upload] Created upload URL: ${url}`);
  res.json({ 
    url, 
    mimeType: 'image/jpeg' 
  });
});

/**
 * Serve placeholder images for dev uploads
 */
app.get('/dev-upload/:filename', (req, res) => {
  const { filename } = req.params;
  console.log(`[Serve] Serving placeholder for: ${filename}`);
  
  // Return a simple 1x1 pixel transparent PNG as placeholder
  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  );
  
  res.set('Content-Type', 'image/png');
  res.send(pixel);
});

/**
 * Catch-all for unmatched routes
 */
app.use((req, res) => {
  console.log(`[404] Unmatched route: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Not found',
    path: req.path,
    method: req.method,
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('==========================================');
  console.log(' ECHO SIMPLIFIED DEV SERVER');
  console.log(' Mode: DEVELOPMENT (All stubs enabled)');
  console.log('==========================================');
  console.log(` ✅ Server running on port ${PORT}`);
  console.log(` ✅ Health check: http://localhost:${PORT}/health`);
  console.log(` ✅ CORS enabled for all origins`);
  console.log('==========================================');
  console.log(' Ready to handle requests...');
  console.log('');
});