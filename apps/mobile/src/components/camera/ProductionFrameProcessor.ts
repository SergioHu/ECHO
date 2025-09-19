/**
 * Production Frame Processor for Real-Time Face Blurring
 * Based on mrousavy/FaceBlurApp implementation
 * 
 * Performance targets:
 * - Face detection: < 50ms per frame
 * - Blur rendering: < 30ms per frame  
 * - Memory usage: < 150MB additional
 */

import { Skia, TileMode, ClipOp, Paint, Path } from '@shopify/react-native-skia';
import type { Frame } from 'react-native-vision-camera';
import type { Face } from 'react-native-vision-camera-face-detector';

// Performance configuration based on device capabilities
export interface PerformanceConfig {
  maxFacesToProcess: number;
  contourSamplingRate: number;
  blurRadius: number;
  skipFrames: number;
  enableDebugLogs: boolean;
}

export const getPerformanceConfig = (deviceCapabilities: {
  isHighEnd: boolean;
  isRecentDevice: boolean;
}): PerformanceConfig => {
  if (deviceCapabilities.isHighEnd) {
    return {
      maxFacesToProcess: 10,
      contourSamplingRate: 1, // Use every point
      blurRadius: 25,
      skipFrames: 0, // Process every frame
      enableDebugLogs: __DEV__,
    };
  } else if (deviceCapabilities.isRecentDevice) {
    return {
      maxFacesToProcess: 5,
      contourSamplingRate: 2, // Use every 2nd point
      blurRadius: 20,
      skipFrames: 1, // Process every other frame
      enableDebugLogs: false,
    };
  } else {
    return {
      maxFacesToProcess: 3,
      contourSamplingRate: 3, // Use every 3rd point
      blurRadius: 15,
      skipFrames: 2, // Process every 3rd frame
      enableDebugLogs: false,
    };
  }
};

// Optimized blur paint creation
export const createBlurPaint = (blurRadius: number): Paint => {
  'worklet';
  
  const paint = Skia.Paint();
  const blurFilter = Skia.ImageFilter.MakeBlur(
    blurRadius,
    blurRadius,
    TileMode.Clamp,
    null
  );
  paint.setImageFilter(blurFilter);
  
  return paint;
};

// Optimized path creation from face contours
export const createFacePath = (
  face: Face,
  samplingRate: number
): Path | null => {
  'worklet';
  
  if (!face.contours?.FACE || face.contours.FACE.length < 3) {
    return null;
  }
  
  const path = Skia.Path.Make();
  const contour = face.contours.FACE;
  let pointsAdded = 0;
  
  for (let i = 0; i < contour.length; i += samplingRate) {
    const point = contour[i];
    if (pointsAdded === 0) {
      path.moveTo(point.x, point.y);
    } else {
      path.lineTo(point.x, point.y);
    }
    pointsAdded++;
  }
  
  // Ensure we close with the last point if we sampled
  if (samplingRate > 1 && contour.length > 0) {
    const lastPoint = contour[contour.length - 1];
    path.lineTo(lastPoint.x, lastPoint.y);
  }
  
  path.close();
  return path;
};

// Main production frame processor
export const processFrame = (
  frame: Frame,
  faces: Face[],
  paint: Paint,
  config: PerformanceConfig,
  frameCount: number
): void => {
  'worklet';
  
  // Step 1: Always render the original frame first
  frame.render();
  
  // Step 2: Skip processing based on performance config
  if (config.skipFrames > 0 && frameCount % (config.skipFrames + 1) !== 0) {
    return;
  }
  
  // Step 3: Process faces up to max limit
  const facesToProcess = faces.slice(0, config.maxFacesToProcess);
  
  for (const face of facesToProcess) {
    const path = createFacePath(face, config.contourSamplingRate);
    
    if (path) {
      // Apply blur effect with proper save/restore for performance
      frame.save();
      frame.clipPath(path, ClipOp.Intersect, true);
      frame.render(paint);
      frame.restore();
    }
  }
  
  // Debug logging (production-safe)
  if (config.enableDebugLogs && frameCount % 60 === 0) {
    console.log(
      `[FrameProcessor] Frame #${frameCount}: ` +
      `Processed ${facesToProcess.length}/${faces.length} faces`
    );
  }
};

// Memory management utilities
export const cleanupResources = (paint: Paint | null): void => {
  'worklet';
  
  if (paint) {
    // Ensure proper cleanup of Skia resources
    // Note: Skia handles most cleanup automatically, but we can
    // explicitly null references to help garbage collection
    paint.setImageFilter(null);
  }
};

// Performance monitoring utilities
export interface PerformanceMetrics {
  averageFPS: number;
  frameDrops: number;
  processingTime: number;
}

export const createPerformanceMonitor = () => {
  'worklet';
  
  let frameTimestamps: number[] = [];
  let frameDrops = 0;
  let lastTimestamp = 0;
  
  return {
    recordFrame: (timestamp: number) => {
      'worklet';
      
      if (lastTimestamp > 0) {
        const delta = timestamp - lastTimestamp;
        const expectedDelta = 1000 / 30; // 30 FPS target
        
        if (delta > expectedDelta * 1.5) {
          frameDrops++;
        }
      }
      
      lastTimestamp = timestamp;
      frameTimestamps.push(timestamp);
      
      // Keep only last 30 frames for rolling average
      if (frameTimestamps.length > 30) {
        frameTimestamps.shift();
      }
    },
    
    getMetrics: (): PerformanceMetrics => {
      'worklet';
      
      if (frameTimestamps.length < 2) {
        return {
          averageFPS: 0,
          frameDrops: 0,
          processingTime: 0,
        };
      }
      
      const totalTime = frameTimestamps[frameTimestamps.length - 1] - frameTimestamps[0];
      const averageFPS = (frameTimestamps.length - 1) / (totalTime / 1000);
      const processingTime = totalTime / frameTimestamps.length;
      
      return {
        averageFPS,
        frameDrops,
        processingTime,
      };
    },
    
    reset: () => {
      'worklet';
      frameTimestamps = [];
      frameDrops = 0;
      lastTimestamp = 0;
    },
  };
};

// Export optimized frame processor hook
export const useOptimizedFrameProcessor = (
  detectFaces: (frame: Frame) => { faces: Face[] },
  config: PerformanceConfig
) => {
  const paint = createBlurPaint(config.blurRadius);
  const performanceMonitor = createPerformanceMonitor();
  let frameCount = 0;
  
  return {
    frameProcessor: (frame: Frame) => {
      'worklet';
      
      const startTime = Date.now();
      frameCount++;
      
      try {
        const { faces } = detectFaces(frame);
        processFrame(frame, faces, paint, config, frameCount);
        
        // Record performance metrics
        performanceMonitor.recordFrame(Date.now());
        
        // Log performance warnings
        const processingTime = Date.now() - startTime;
        if (processingTime > 50 && config.enableDebugLogs) {
          console.warn(`[FrameProcessor] Slow frame: ${processingTime}ms`);
        }
      } catch (error) {
        if (config.enableDebugLogs) {
          console.error('[FrameProcessor] Error:', error);
        }
      }
    },
    
    getPerformanceMetrics: () => performanceMonitor.getMetrics(),
    
    cleanup: () => {
      cleanupResources(paint);
      performanceMonitor.reset();
    },
  };
};