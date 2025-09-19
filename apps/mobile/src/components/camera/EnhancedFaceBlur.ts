import { Skia, ClipOp, TileMode } from '@shopify/react-native-skia';

/**
 * Enhanced face blur with multiple fallback zones for better privacy protection
 * This ensures faces are blurred even when detection fails
 */

export const createEnhancedFaceBlurProcessor = (
  detectFaces: any,
  viewWidth: number,
  viewHeight: number,
  isFrontCamera: boolean
) => {
  'worklet';
  
  // Create strong blur paint
  const blurPaint = Skia.Paint();
  const blurFilter = Skia.ImageFilter.MakeBlur(
    50, // Very strong blur
    50,
    TileMode.Clamp,
    null
  );
  blurPaint.setImageFilter(blurFilter);
  
  // Define multiple blur zones for comprehensive coverage
  const getBlurZones = () => {
    'worklet';
    
    const zones = [];
    
    if (isFrontCamera) {
      // Front camera - typical selfie positions
      
      // Zone 1: Lower center (main face in selfie)
      zones.push({
        x: viewWidth * 0.25,
        y: viewHeight * 0.35,
        width: viewWidth * 0.5,
        height: viewHeight * 0.35,
      });
      
      // Zone 2: Lower left (person on left)
      zones.push({
        x: viewWidth * 0.05,
        y: viewHeight * 0.4,
        width: viewWidth * 0.35,
        height: viewHeight * 0.3,
      });
      
      // Zone 3: Lower right (person on right)
      zones.push({
        x: viewWidth * 0.6,
        y: viewHeight * 0.4,
        width: viewWidth * 0.35,
        height: viewHeight * 0.3,
      });
      
      // Zone 4: Upper center (child or person in background)
      zones.push({
        x: viewWidth * 0.35,
        y: viewHeight * 0.15,
        width: viewWidth * 0.3,
        height: viewHeight * 0.25,
      });
      
    } else {
      // Back camera - typical photo positions
      
      // Zone 1: Center
      zones.push({
        x: viewWidth * 0.25,
        y: viewHeight * 0.25,
        width: viewWidth * 0.5,
        height: viewHeight * 0.4,
      });
      
      // Zone 2: Left side
      zones.push({
        x: viewWidth * 0.05,
        y: viewHeight * 0.3,
        width: viewWidth * 0.35,
        height: viewHeight * 0.35,
      });
      
      // Zone 3: Right side
      zones.push({
        x: viewWidth * 0.6,
        y: viewHeight * 0.3,
        width: viewWidth * 0.35,
        height: viewHeight * 0.35,
      });
    }
    
    return zones;
  };
  
  return (frame: any) => {
    'worklet';
    
    // Always render the original frame first
    frame.render();
    
    if (viewWidth === 0 || viewHeight === 0) {
      return;
    }
    
    try {
      // Try to detect faces
      const { faces } = detectFaces(frame);
      
      if (faces.length > 0) {
        // Faces detected - blur them with extra padding
        for (const face of faces) {
          if (face.bounds) {
            // Transform bounds to view coordinates
            const scale = Math.max(
              viewWidth / frame.width,
              viewHeight / frame.height
            );
            
            const scaledWidth = frame.width * scale;
            const scaledHeight = frame.height * scale;
            const offsetX = (viewWidth - scaledWidth) / 2;
            const offsetY = (viewHeight - scaledHeight) / 2;
            
            // Apply transformation with extra padding
            const padding = 40; // Large padding for safety
            const x = (isFrontCamera ? frame.width - face.bounds.x - face.bounds.width : face.bounds.x) * scale + offsetX - padding;
            const y = face.bounds.y * scale + offsetY - padding;
            const width = face.bounds.width * scale + padding * 2;
            const height = face.bounds.height * scale + padding * 2;
            
            // Create oval path for natural blur
            const path = Skia.Path.Make();
            const rect = Skia.XYWHRect(x, y, width, height);
            path.addOval(rect);
            
            // Apply blur
            frame.save();
            frame.clipPath(path, ClipOp.Intersect, true);
            frame.render(blurPaint);
            frame.restore();
          }
        }
      } else {
        // No faces detected - apply comprehensive fallback blur zones
        const zones = getBlurZones();
        
        for (const zone of zones) {
          const path = Skia.Path.Make();
          const rect = Skia.XYWHRect(
            zone.x,
            zone.y,
            zone.width,
            zone.height
          );
          path.addOval(rect);
          
          // Apply blur to zone
          frame.save();
          frame.clipPath(path, ClipOp.Intersect, true);
          frame.render(blurPaint);
          frame.restore();
        }
      }
    } catch (error) {
      // On error, apply all fallback zones for safety
      const zones = getBlurZones();
      
      for (const zone of zones) {
        const path = Skia.Path.Make();
        const rect = Skia.XYWHRect(
          zone.x,
          zone.y,
          zone.width,
          zone.height
        );
        path.addOval(rect);
        
        frame.save();
        frame.clipPath(path, ClipOp.Intersect, true);
        frame.render(blurPaint);
        frame.restore();
      }
    }
  };
};

/**
 * Create an aggressive privacy mode that blurs most of the frame
 */
export const createAggressivePrivacyProcessor = (
  viewWidth: number,
  viewHeight: number
) => {
  'worklet';
  
  // Create very strong blur
  const blurPaint = Skia.Paint();
  const blurFilter = Skia.ImageFilter.MakeBlur(
    60,
    60,
    TileMode.Clamp,
    null
  );
  blurPaint.setImageFilter(blurFilter);
  
  return (frame: any) => {
    'worklet';
    
    // Render original frame
    frame.render();
    
    if (viewWidth === 0 || viewHeight === 0) {
      return;
    }
    
    // Blur entire lower 2/3 of frame where faces typically appear
    const path = Skia.Path.Make();
    const rect = Skia.XYWHRect(
      0,
      viewHeight * 0.2, // Start from 20% down
      viewWidth,
      viewHeight * 0.8  // Cover 80% of height
    );
    path.addRect(rect);
    
    // Apply heavy blur
    frame.save();
    frame.clipPath(path, ClipOp.Intersect, true);
    frame.render(blurPaint);
    frame.restore();
  };
};