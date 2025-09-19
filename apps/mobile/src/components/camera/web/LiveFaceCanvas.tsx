import React, { useEffect, useRef } from 'react';

interface LiveFaceCanvasProps {
  containerId: string;
  width: number;
  height: number;
}

// Web-only live preview face detection using the built-in FaceDetector API (Chromium)
// Falls back to MediaPipe Tasks Vision in non-Chromium browsers.
// Draws blurred patches over detected faces on a canvas overlay.
export default function LiveFaceCanvas({ containerId, width, height }: LiveFaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<any | null>(null);
  const mpRef = useRef<any | null>(null);
  const isMediapipeRef = useRef<boolean>(false);

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const video: HTMLVideoElement | null = container.querySelector('video');
    if (!video) return;

    // Resize canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error('script load failed'));
      document.head.appendChild(s);
    });

    const initDetector = async () => {
      try {
        // Prefer built-in FaceDetector (fast, Chromium)
        // @ts-ignore
        if ('FaceDetector' in window) {
          // @ts-ignore
          detectorRef.current = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 10 });
          isMediapipeRef.current = false;
          return;
        }
        // Fallback: MediaPipe Tasks Vision
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.js');
        // @ts-ignore
        const tv = (window as any);
        if (tv && tv.FilesetResolver && tv.FaceDetector) {
          // @ts-ignore
          const vision = await tv.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm');
          // @ts-ignore
          detectorRef.current = await tv.FaceDetector.createFromOptions(vision, {
            baseOptions: {
              // Public model asset via CDN
              modelAssetPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm/face_detection_short_range.tflite',
            },
            runningMode: 'VIDEO',
          });
          mpRef.current = tv;
          isMediapipeRef.current = true;
          console.log('[LiveFaceCanvas] MediaPipe detector initialized');
        } else {
          console.warn('[LiveFaceCanvas] MediaPipe not available. Preview masks disabled.');
        }
      } catch (e) {
        console.warn('[LiveFaceCanvas] Detector init failed:', e);
      }
    };

    const expandBox = (box: DOMRectReadOnly) => {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const w = box.width * 1.35;
      const h = box.height * 1.5;
      return { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
    };

    const loop = async () => {
      if (!running) return;
      rafRef.current = requestAnimationFrame(loop);

      if (!detectorRef.current) return;

      try {
        let faces: any[] = [];
        if (isMediapipeRef.current) {
          // @ts-ignore
          const res = await detectorRef.current.detectForVideo(video, performance.now());
          faces = (res?.detections || []).map((d: any) => {
            const box = d.boundingBox || d.box || d; // normalize
            return { boundingBox: { x: box.originX ?? box.x ?? 0, y: box.originY ?? box.y ?? 0, width: box.width ?? box.width ?? 0, height: box.height ?? box.height ?? 0 } };
          });
        } else {
          faces = await detectorRef.current.detect(video);
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!faces || faces.length === 0) return;

        // Compute scale from video to canvas
        const videoW = video.videoWidth || width;
        const videoH = video.videoHeight || height;
        const scale = Math.max(width / videoW, height / videoH);
        const scaledW = videoW * scale;
        const scaledH = videoH * scale;
        const offsetX = (width - scaledW) / 2;
        const offsetY = (height - scaledH) / 2;

        faces.forEach((f: any) => {
          const b = expandBox(f.boundingBox);

          // Map to canvas coordinates
          const x = b.x * scale + offsetX;
          const y = b.y * scale + offsetY;
          const w = b.width * scale;
          const h = b.height * scale;

          // Draw blurred oval patch from the video
          ctx.save();
          ctx.beginPath();
          // Elliptical clip
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.clip();
          ctx.filter = 'blur(24px)';
          // Draw from video using same mapping as preview
          ctx.drawImage(
            video,
            // Source rect in video space
            Math.max(0, b.x),
            Math.max(0, b.y),
            Math.min(videoW - b.x, b.width),
            Math.min(videoH - b.y, b.height),
            // Destination in canvas
            x,
            y,
            w,
            h
          );
          ctx.restore();
        });
      } catch (e) {
        // Ignore frame errors to keep loop running
      }
    };

    initDetector().then(() => {
      rafRef.current = requestAnimationFrame(loop);
    });

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [containerId, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', left: 0, top: 0, width, height, pointerEvents: 'none' }}
    />
  );
}
