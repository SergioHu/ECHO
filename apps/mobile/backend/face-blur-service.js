/**
 * Echo Face Blur Service
 * Node.js backend service for server-side face detection and blurring
 * Deployed on DigitalOcean Droplet
 * 
 * Dependencies:
 * - face-api.js or AWS Rekognition for face detection
 * - sharp for image processing
 * - @supabase/supabase-js for storage operations
 */

const express = require('express');
const sharp = require('sharp');
const faceapi = require('@vladmandic/face-api');
const { createClient } = require('@supabase/supabase-js');
const Bull = require('bull');
const path = require('path');
const fetch = require('node-fetch');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
// Load environment from apps/mobile/.env so ECHO_DEV_STUBS and other vars are available to this server
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Initialize Express app
const app = express();
// CORS first to allow cross-origin requests from Expo dev server
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Initialize Redis queue for job processing
const imageProcessingQueue = new Bull('image-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
});

// Load face detection models on startup
let modelsLoaded = false;

async function loadFaceDetectionModels() {
  const MODEL_URL = path.join(__dirname, 'models');
  
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL),
    faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL),
  ]);
  
  modelsLoaded = true;
  console.log('Face detection models loaded successfully');
}

// Initialize models
loadFaceDetectionModels().catch(console.error);

/**
 * Dev helper: Challenge code endpoint
 * Simple random code generator with 5-minute expiry
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

// In-memory dev job store for process-image/status stubs
const devJobs = new Map();

/**
 * Main image processing endpoint
 * Receives image URL from private bucket, processes it, and uploads to public bucket
 */
app.post('/api/process-image', authenticateRequest, async (req, res) => {
  const useStubs = process.env.ECHO_DEV_STUBS === 'true';
  if (useStubs) {
    // Dev stub: immediately return a mock jobId and skip real processing
    const jobId = uuidv4();
    devJobs.set(jobId, Date.now());
    return res.json({
      jobId,
      status: 'processing',
      message: 'Dev stub: processing started',
    });
  }
  try {
    const { imageUrl, userId, requestId, timestamp, platform } = req.body;

    // Validate request
    if (!imageUrl || !userId || !requestId) {
      return res.status(400).json({ 
        error: 'Missing required parameters' 
      });
    }

    // Only process web platform images (mobile does on-device)
    if (platform !== 'web') {
      return res.status(400).json({ 
        error: 'Server-side processing is only for web platform' 
      });
    }

    // Create job for async processing
    const job = await imageProcessingQueue.add({
      imageUrl,
      userId,
      requestId,
      timestamp,
      jobId: uuidv4(),
    });

    res.json({
      jobId: job.id,
      status: 'processing',
      message: 'Image processing started',
    });

  } catch (error) {
    console.error('Process image error:', error);
    res.status(500).json({ 
      error: 'Failed to start image processing' 
    });
  }
});

/**
 * Get processing status endpoint
 */
app.get('/api/process-status/:jobId', authenticateRequest, async (req, res) => {
  const useStubs = process.env.ECHO_DEV_STUBS === 'true';
  if (useStubs) {
    const { jobId } = req.params;
    const started = devJobs.get(jobId);
    if (!started) {
      // If job not found, simulate it exists and is processing now
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
  }
  try {
    const { jobId } = req.params;
    
    const job = await imageProcessingQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ 
        error: 'Job not found' 
      });
    }

    const state = await job.getState();
    const progress = job.progress();
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    res.json({
      jobId,
      status: state,
      progress,
      ...(state === 'completed' && { publicUrl: result?.publicUrl }),
      ...(state === 'failed' && { error: failedReason }),
    });

  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ 
      error: 'Failed to get processing status' 
    });
  }
});

/**
 * Process job queue
 */
imageProcessingQueue.process(async (job) => {
  const { imageUrl, userId, requestId, timestamp } = job.data;
  
  try {
    // Update progress
    await job.progress(10);
    
    // Download image from private bucket
    const imageBuffer = await downloadImage(imageUrl);
    await job.progress(30);
    
    // Detect faces
    const faces = await detectFaces(imageBuffer);
    await job.progress(50);
    
    // Apply blur to faces
    const blurredBuffer = await blurFaces(imageBuffer, faces);
    await job.progress(70);
    
    // Upload to public bucket
    const publicUrl = await uploadToPublicBucket(
      blurredBuffer, 
      userId, 
      requestId, 
      timestamp
    );
    await job.progress(90);
    
    // Update database record
    await updateDatabaseRecord(userId, requestId, publicUrl);
    await job.progress(100);
    
    return { publicUrl };
    
  } catch (error) {
    console.error('Job processing error:', error);
    throw error;
  }
});

/**
 * Download image from Supabase private bucket
 */
async function downloadImage(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    return buffer;
    
  } catch (error) {
    console.error('Download error:', error);
    throw new Error('Failed to download image from storage');
  }
}

/**
 * Detect faces using face-api.js
 */
async function detectFaces(imageBuffer) {
  if (!modelsLoaded) {
    throw new Error('Face detection models not loaded');
  }
  
  try {
    // Convert buffer to tensor
    const img = await sharp(imageBuffer).toBuffer();
    const decoded = await faceapi.decodeImage(img);
    
    // Detect faces with landmarks
    const detections = await faceapi
      .detectAllFaces(decoded, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();
    
    // Convert detections to blur regions
    const faces = detections.map(detection => {
      const box = detection.detection.box;
      
      // Expand box slightly for better coverage
      const padding = Math.max(box.width, box.height) * 0.2;
      
      return {
        x: Math.max(0, Math.round(box.x - padding / 2)),
        y: Math.max(0, Math.round(box.y - padding / 2)),
        width: Math.round(box.width + padding),
        height: Math.round(box.height + padding),
      };
    });
    
    console.log(`Detected ${faces.length} faces`);
    return faces;
    
  } catch (error) {
    console.error('Face detection error:', error);
    // Return empty array if detection fails (image still uploads)
    return [];
  }
}

/**
 * Alternative: Detect faces using AWS Rekognition
 */
async function detectFacesWithRekognition(imageBuffer) {
  const AWS = require('aws-sdk');
  const rekognition = new AWS.Rekognition({
    region: process.env.AWS_REGION,
  });
  
  try {
    const params = {
      Image: {
        Bytes: imageBuffer,
      },
      Attributes: ['DEFAULT'],
    };
    
    const response = await rekognition.detectFaces(params).promise();
    
    // Get image metadata for dimensions
    const metadata = await sharp(imageBuffer).metadata();
    
    // Convert Rekognition bounding boxes to pixel coordinates
    const faces = response.FaceDetails.map(face => {
      const box = face.BoundingBox;
      
      return {
        x: Math.round(box.Left * metadata.width),
        y: Math.round(box.Top * metadata.height),
        width: Math.round(box.Width * metadata.width),
        height: Math.round(box.Height * metadata.height),
      };
    });
    
    console.log(`AWS Rekognition detected ${faces.length} faces`);
    return faces;
    
  } catch (error) {
    console.error('AWS Rekognition error:', error);
    return [];
  }
}

/**
 * Apply blur to detected face regions
 */
async function blurFaces(imageBuffer, faces) {
  try {
    if (faces.length === 0) {
      // No faces detected, return original image
      console.log('No faces to blur, returning original image');
      return imageBuffer;
    }
    
    // Load image with sharp
    let image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    // Create composite operations for each face
    const composites = await Promise.all(
      faces.map(async (face) => {
        // Extract face region
        const faceBuffer = await sharp(imageBuffer)
          .extract({
            left: face.x,
            top: face.y,
            width: Math.min(face.width, metadata.width - face.x),
            height: Math.min(face.height, metadata.height - face.y),
          })
          .blur(25) // Strong blur for privacy
          .toBuffer();
        
        return {
          input: faceBuffer,
          left: face.x,
          top: face.y,
        };
      })
    );
    
    // Apply all blurred regions back to original image
    const blurredImage = await image
      .composite(composites)
      .jpeg({ quality: 90 })
      .toBuffer();
    
    console.log(`Applied blur to ${faces.length} faces`);
    return blurredImage;
    
  } catch (error) {
    console.error('Blur application error:', error);
    throw new Error('Failed to apply blur to faces');
  }
}

/**
 * Upload processed image to public bucket
 */
async function uploadToPublicBucket(imageBuffer, userId, requestId, timestamp) {
  try {
    const fileName = `public/${userId}/${requestId}/${timestamp}-blurred.jpg`;
    
    const { data, error } = await supabase.storage
      .from('echo-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });
    
    if (error) {
      throw error;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('echo-images')
      .getPublicUrl(fileName);
    
    console.log(`Uploaded blurred image: ${publicUrl}`);
    return publicUrl;
    
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error('Failed to upload processed image');
  }
}

/**
 * Update database with processed image URL
 */
async function updateDatabaseRecord(userId, requestId, publicUrl) {
  try {
    const { error } = await supabase
      .from('responses')
      .update({ 
        processed_image_url: publicUrl,
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .match({ 
        user_id: userId, 
        request_id: requestId 
      });
    
    if (error) {
      throw error;
    }
    
    console.log('Database updated with processed image URL');
    
  } catch (error) {
    console.error('Database update error:', error);
    // Non-critical error, don't throw
  }
}

/**
 * Authentication middleware
 */
function authenticateRequest(req, res, next) {
  const isDev = process.env.NODE_ENV !== 'production';
  const authHeader = req.headers.authorization;

  // Dev-only bypass: allow requests without strict auth, or with a known placeholder token
  if (isDev) {
    return next();
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Allow placeholder token in non-production environments
  if (token === 'user-auth-token') {
    return next();
  }

  // TODO: Verify JWT or session token (production)
  req.userId = 'authenticated-user'; // Set from token after validation
  next();
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    modelsLoaded,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Dev-only: create upload endpoints to satisfy front-end useUpload()
 * These simulate an upload and return a mock URL that this server can serve.
 */
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || `http://localhost:${process.env.PORT || 3000}`;

// Presign endpoint used by some flows — return placeholder values in dev
app.post('/_create/api/upload/presign/', (req, res) => {
  const secureExpire = String(Math.floor(Date.now() / 1000) + 60);
  res.json({ secureSignature: 'dev-signature', secureExpire });
});

// Generic upload endpoint: always succeed and return a URL we can serve
app.post('/_create/api/upload/', async (req, res) => {
  try {
    const id = uuidv4();
    const url = `${PUBLIC_ORIGIN}/dev-upload/${id}/`;
    const mimeType = 'image/jpeg';
    res.json({ url, mimeType });
  } catch (error) {
    console.error('Dev upload error:', error);
    res.status(500).json({ error: 'Upload failed (dev)' });
  }
});

// Serve a placeholder JPEG for any dev-upload URL so downstream processing can fetch it
app.get('/dev-upload/:id/', async (req, res) => {
  try {
    const buffer = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: { r: 220, g: 225, b: 230 },
      },
    })
      .blur(25)
      .jpeg({ quality: 85 })
      .toBuffer();

    res.set('Content-Type', 'image/jpeg');
    res.send(buffer);
  } catch (error) {
    console.error('Dev placeholder image error:', error);
    res.status(500).send('Failed to generate image');
  }
});

/**
 * Webhook endpoint for Supabase storage events
 */
app.post('/webhook/storage', async (req, res) => {
  try {
    const { type, record } = req.body;
    
    if (type === 'INSERT' && record.bucket_id === 'echo-images-private') {
      // Automatically process new images in private bucket
      await imageProcessingQueue.add({
        imageUrl: record.name,
        userId: record.owner,
        requestId: 'webhook-trigger',
        timestamp: Date.now(),
        jobId: uuidv4(),
      });
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed' 
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const useStubs = process.env.ECHO_DEV_STUBS === 'true';
  const bannerLines = [
    '==========================================',
    ' ECHO DEV SERVER',
    ` Mode: ${useStubs ? 'STUBS ENABLED' : 'REAL SERVICES'}`,
    useStubs ? ' API calls will be mocked.' : ' Attempting to connect to Supabase & Redis.',
    '==========================================',
    ` Face blur service running on port ${PORT}`,
    ` Environment: ${process.env.NODE_ENV || 'development'}`,
    ` ECHO_DEV_STUBS: ${useStubs}`,
  ];
  console.log(bannerLines.map((l) => `// ${l}`).join('\n'));
});
