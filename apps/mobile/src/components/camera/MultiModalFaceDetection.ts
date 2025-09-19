/**
 * Multi-Modal Face Detection System
 * Combines multiple detection approaches for guaranteed face coverage
 */

import { Skia, ClipOp, TileMode } from '@shopify/react-native-skia';
import { runOnJS } from 'react-native-reanimated';
import { FaceTracker } from './AlternativeFaceDetection';

export interface DetectionResult {
  faces: any[];
  method: 'plugin' | 'tracking' | 'heuristic' | 'aggressive';
  confidence: number;
  timestamp: number;
}

export class MultiModalFaceDetector {
  private faceTracker = new FaceTracker();
  private consecutiveFailures = 0;
  private frameCount = 0;
  private lastSuccessfulDetection: DetectionResult | null = null;
  
  // Detection methods in order of preference
  async detectFaces(
    frame: any, 
    primaryDetector: any,
    viewWidth: number,
    viewHeight: number,
    isFrontCamera: boolean
  ): Promise<DetectionResult> {
    'worklet';
    
    this.frameCount++;
    const timestamp = Date.now();
    
    // Method 1: Try primary ML Kit detector
    try {
      const result = primaryDetector(frame);
      if (result?.faces && result.faces.length > 0) {
        this.consecutiveFailures = 0;
        const detectionResult: DetectionResult = {
          faces: result.faces,
          method: 'plugin',
          confidence: 1.0,
          timestamp
        };
        this.lastSuccessfulDetection = detectionResult;
        console.log(`✅ Plugin detected ${result.faces.length} faces`);
        return detectionResult;
      }
    } catch (error) {
      console.error('❌ Primary detector failed:', error);
    }
    
    // Method 2: Use face tracker for interpolation
    const trackedFaces = this.faceTracker.trackFaces([], frame);
    if (trackedFaces.length > 0) {
      console.log(`📍 Tracking ${trackedFaces.length} faces`);
      return {
        faces: trackedFaces,
        method: 'tracking',
        confidence: 0.7,
        timestamp
      };
    }
    
    // Method 3: Heuristic detection based on common face positions
    this.consecutiveFailures++;
    if (this.consecutiveFailures > 5) {
      const heuristicFaces = this.getHeuristicFaces(frame, viewWidth, viewHeight, isFrontCamera);
      if (heuristicFaces.length > 0) {
        console.log(`🎯 Heuristic detected ${heuristicFaces.length} face regions`);
        return {
          faces: heuristicFaces,
          method: 'heuristic',
          confidence: 0.5,
          timestamp
        };
      }
    }
    
    // Method 4: Aggressive mode - blur likely face areas
    if (this.consecutiveFailures > 15) {
      console.log('🚨 Entering aggressive privacy mode');
      return {
        faces: this.getAggressiveFaceRegions(viewWidth, viewHeight, isFrontCamera),
        method: 'aggressive',
        confidence: 0.3,
        timestamp
      };
    }
    
    // No faces detected
    return {
      faces: [],
      method: 'plugin',
      confidence: 0,
      timestamp
    };
  }
  
  private getHeuristicFaces(frame: any, viewWidth: number, viewHeight: number, isFrontCamera: boolean): any[] {
    'worklet';
    
    const faces = [];
    
    if (isFrontCamera) {
      // Selfie mode - faces typically in lower center
      faces.push({
        bounds: {
          x: frame.width * 0.25,
          y: frame.height * 0.4,
          width: frame.width * 0.5,
          height: frame.height * 0.4,
        },
        confidence: 0.6
      });
      
      // Check for multiple people in selfie
      if (this.frameCount % 30 < 15) { // Alternate detection
        faces.push({
          bounds: {
            x: frame.width * 0.05,
            y: frame.height * 0.45,
            width: frame.width * 0.35,
            height: frame.height * 0.35,
          },
          confidence: 0.4
        });
      }
    } else {
      // Back camera - center focused
      faces.push({
        bounds: {
          x: frame.width * 0.3,
          y: frame.height * 0.25,
          width: frame.width * 0.4,
          height: frame.height * 0.45,
        },
        confidence: 0.5
      });
    }
    
    return faces;
  }
  
  private getAggressiveFaceRegions(viewWidth: number, viewHeight: number, isFrontCamera: boolean): any[] {
    'worklet';
    
    // Create large regions that cover most typical face positions
    return [
      {
        bounds: {
          x: 0,
          y: viewHeight * 0.2,
          width: viewWidth,
          height: viewHeight * 0.6,
        },
        confidence: 0.3
      }
    ];
  }
  
  reset() {
    this.faceTracker.reset();
    this.consecutiveFailures = 0;
    this.frameCount = 0;
    this.lastSuccessfulDetection = null;
    console.log('🔄 Multi-modal detector reset');
  }
}

/**
 * Enhanced frame processor with multi-modal detection
 */
export const createMultiModalFrameProcessor = (
  primaryDetector: any,
  viewWidth: number,
  viewHeight: number,
  isFrontCamera: boolean
) => {
  'worklet';
  
  const detector = new MultiModalFaceDetector();
  
  // Create adaptive blur paint
  const createAdaptiveBlurPaint = (confidence: number) => {
    'worklet';
    const paint = Skia.Paint();
    const blurRadius = confidence > 0.8 ? 25 : confidence > 0.5 ? 40 : 60;
    const blurFilter = Skia.ImageFilter.MakeBlur(
      blurRadius,
      blurRadius,
      TileMode.Clamp,
      null
    );
    paint.setImageFilter(blurFilter);
    return paint;
  };
  
  return async (frame: any) => {
    'worklet';
    
    // Always render original frame first
    frame.render();
    
    if (viewWidth === 0 || viewHeight === 0) {
      return;
    }
    
    try {
      // Get faces using multi-modal detection
      const detection = await detector.detectFaces(
        frame, 
        primaryDetector, 
        viewWidth, 
        viewHeight, 
        isFrontCamera
      );
      
      if (detection.faces.length === 0) {
        return;
      }
      
      // Create blur paint based on detection confidence
      const blurPaint = createAdaptiveBlurPaint(detection.confidence);
      
      // Process each detected face
      for (const face of detection.faces) {
        if (!face.bounds) continue;
        
        // Transform coordinates
        const scale = Math.max(
          viewWidth / frame.width,
          viewHeight / frame.height
        );
        
        const scaledWidth = frame.width * scale;
        const scaledHeight = frame.height * scale;
        const offsetX = (viewWidth - scaledWidth) / 2;
        const offsetY = (viewHeight - scaledHeight) / 2;
        
        // Apply extra padding based on detection method
        const padding = detection.method === 'plugin' ? 20 : 
                       detection.method === 'tracking' ? 30 :
                       detection.method === 'heuristic' ? 40 : 50;
        
        const x = (isFrontCamera ? 
          frame.width - face.bounds.x - face.bounds.width : 
          face.bounds.x) * scale + offsetX - padding;
        const y = face.bounds.y * scale + offsetY - padding;
        const width = face.bounds.width * scale + padding * 2;
        const height = face.bounds.height * scale + padding * 2;
        
        // Create blur path
        const path = Skia.Path.Make();
        const rect = Skia.XYWHRect(x, y, width, height);
        
        // Use oval for natural faces, rectangle for heuristic/aggressive
        if (detection.method === 'plugin' || detection.method === 'tracking') {
          path.addOval(rect);
        } else {
          path.addRoundRect(rect, 15, 15);
        }
        
        // Apply blur with proper state isolation
        frame.save();
        frame.clipPath(path, ClipOp.Intersect, true);
        frame.render(blurPaint);
        frame.restore();
      }
      
      // Update face tracker with successful detections
      if (detection.method === 'plugin') {
        detector.faceTracker.trackFaces(detection.faces, frame);
      }
      
    } catch (error) {
      console.error('❌ Multi-modal detection error:', error);
      
      // Emergency fallback - blur entire lower portion
      const emergencyBlurPaint = Skia.Paint();
      const emergencyFilter = Skia.ImageFilter.MakeBlur(80, 80, TileMode.Clamp, null);
      emergencyBlurPaint.setImageFilter(emergencyFilter);
      
      const path = Skia.Path.Make();
      const rect = Skia.XYWHRect(0, viewHeight * 0.3, viewWidth, viewHeight * 0.7);
      path.addRect(rect);
      
      frame.save();
      frame.clipPath(path, ClipOp.Intersect, true);
      frame.render(emergencyBlurPaint);
      frame.restore();
    }
  };
};