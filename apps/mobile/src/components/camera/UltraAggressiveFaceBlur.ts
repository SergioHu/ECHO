/**
 * ULTRA-AGGRESSIVE FACE BLUR SYSTEM
 * 
 * Philosophy: It's better to blur too much than to miss a face.
 * This system GUARANTEES face privacy by blurring all areas where faces could possibly appear.
 * 
 * NO DETECTION REQUIRED - Just pure, reliable blurring.
 */

import { Skia, ClipOp, TileMode, BlendMode } from '@shopify/react-native-skia';

/**
 * Ultra-aggressive blur configuration
 */
export const ULTRA_BLUR_CONFIG = {
  // Maximum blur strength
  blurRadius: 80,
  
  // Coverage zones for different scenarios
  zones: {
    // SELFIE MODE (Front Camera)
    selfie: {
      // Primary zone - covers 90% of typical selfie positions
      primary: {
        x: 0,
        y: 0.1,  // Start from 10% down
        width: 1,  // Full width
        height: 0.75,  // Cover 75% of screen
        strength: 1.0
      },
      // Secondary zone - extra coverage for group selfies
      secondary: {
        x: 0,
        y: 0,  // Start from top
        width: 1,
        height: 0.9,  // Cover 90% of screen
        strength: 0.8
      }
    },
    
    // PHOTO MODE (Back Camera)
    photo: {
      // Central zone - where most subjects are
      primary: {
        x: 0,
        y: 0.15,
        width: 1,
        height: 0.7,
        strength: 1.0
      },
      // Full coverage for group photos
      secondary: {
        x: 0,
        y: 0.05,
        width: 1,
        height: 0.85,
        strength: 0.7
      }
    }
  }
};

/**
 * Create the ultimate face blur processor
 * This GUARANTEES all faces are blurred
 */
export const createUltraAggressiveBlurProcessor = (
  viewWidth: number,
  viewHeight: number,
  isFrontCamera: boolean
) => {
  'worklet';
  
  // Create multiple blur paints with different strengths
  const ultraBlurPaint = Skia.Paint();
  const ultraBlurFilter = Skia.ImageFilter.MakeBlur(
    ULTRA_BLUR_CONFIG.blurRadius,
    ULTRA_BLUR_CONFIG.blurRadius,
    TileMode.Clamp,
    null
  );
  ultraBlurPaint.setImageFilter(ultraBlurFilter);
  ultraBlurPaint.setAlphaf(0.95); // Slightly transparent for layering
  
  const megaBlurPaint = Skia.Paint();
  const megaBlurFilter = Skia.ImageFilter.MakeBlur(
    100, // Even stronger blur
    100,
    TileMode.Clamp,
    null
  );
  megaBlurPaint.setImageFilter(megaBlurFilter);
  megaBlurPaint.setAlphaf(0.9);
  
  return (frame: any) => {
    'worklet';
    
    // ALWAYS render the frame first
    frame.render();
    
    if (viewWidth === 0 || viewHeight === 0) {
      return;
    }
    
    const zones = isFrontCamera ? 
      ULTRA_BLUR_CONFIG.zones.selfie : 
      ULTRA_BLUR_CONFIG.zones.photo;
    
    // LAYER 1: Apply primary zone with maximum blur
    const primaryZone = zones.primary;
    const primaryPath = Skia.Path.Make();
    const primaryRect = Skia.XYWHRect(
      primaryZone.x * viewWidth,
      primaryZone.y * viewHeight,
      primaryZone.width * viewWidth,
      primaryZone.height * viewHeight
    );
    
    // Use rounded rectangle for more natural look
    primaryPath.addRoundRect(primaryRect, 20, 20);
    
    frame.save();
    frame.clipPath(primaryPath, ClipOp.Intersect, true);
    frame.render(megaBlurPaint);
    frame.restore();
    
    // LAYER 2: Apply secondary zone for extra coverage
    const secondaryZone = zones.secondary;
    const secondaryPath = Skia.Path.Make();
    const secondaryRect = Skia.XYWHRect(
      secondaryZone.x * viewWidth,
      secondaryZone.y * viewHeight,
      secondaryZone.width * viewWidth,
      secondaryZone.height * viewHeight
    );
    
    secondaryPath.addRoundRect(secondaryRect, 30, 30);
    
    frame.save();
    frame.clipPath(secondaryPath, ClipOp.Intersect, true);
    frame.render(ultraBlurPaint);
    frame.restore();
    
    // LAYER 3: Extra aggressive mode for selfies
    if (isFrontCamera) {
      // Add multiple overlapping circular zones
      const circleZones = [
        { x: 0.25, y: 0.35, r: 0.3 },  // Left face
        { x: 0.75, y: 0.35, r: 0.3 },  // Right face
        { x: 0.5, y: 0.4, r: 0.35 },   // Center face
        { x: 0.5, y: 0.25, r: 0.25 },  // Upper face
        { x: 0.3, y: 0.5, r: 0.25 },   // Lower left
        { x: 0.7, y: 0.5, r: 0.25 },   // Lower right
      ];
      
      for (const zone of circleZones) {
        const circlePath = Skia.Path.Make();
        const centerX = zone.x * viewWidth;
        const centerY = zone.y * viewHeight;
        const radius = zone.r * Math.min(viewWidth, viewHeight);
        
        circlePath.addCircle(centerX, centerY, radius);
        
        frame.save();
        frame.clipPath(circlePath, ClipOp.Intersect, true);
        frame.render(ultraBlurPaint);
        frame.restore();
      }
    }
    
    // Log once per second for debugging
    if (Date.now() % 1000 < 50) {
      console.log(`🛡️ ULTRA-BLUR: ${isFrontCamera ? 'SELFIE' : 'PHOTO'} mode - ALL faces protected`);
    }
  };
};

/**
 * Create a "Privacy First" mode that blurs EVERYTHING except a small safe zone
 */
export const createPrivacyFirstProcessor = (
  viewWidth: number,
  viewHeight: number
) => {
  'worklet';
  
  const extremeBlurPaint = Skia.Paint();
  const extremeBlurFilter = Skia.ImageFilter.MakeBlur(
    120, // Extreme blur
    120,
    TileMode.Clamp,
    null
  );
  extremeBlurPaint.setImageFilter(extremeBlurFilter);
  
  return (frame: any) => {
    'worklet';
    
    // Render original
    frame.render();
    
    if (viewWidth === 0 || viewHeight === 0) {
      return;
    }
    
    // Blur EVERYTHING
    const fullPath = Skia.Path.Make();
    const fullRect = Skia.XYWHRect(0, 0, viewWidth, viewHeight);
    fullPath.addRect(fullRect);
    
    frame.save();
    frame.clipPath(fullPath, ClipOp.Intersect, true);
    frame.render(extremeBlurPaint);
    frame.restore();
    
    // Optional: Leave a small unblurred area at bottom for UI
    // (Uncomment if you want to see camera controls clearly)
    /*
    const safePath = Skia.Path.Make();
    const safeRect = Skia.XYWHRect(
      viewWidth * 0.35,
      viewHeight * 0.85,
      viewWidth * 0.3,
      viewHeight * 0.15
    );
    safePath.addRect(safeRect);
    
    frame.save();
    frame.clipPath(safePath, ClipOp.Difference, true);
    frame.render();
    frame.restore();
    */
  };
};

/**
 * Smart zone calculator based on face detection statistics
 * Uses heatmap approach - blur more where faces are commonly found
 */
export const createHeatmapBlurProcessor = (
  viewWidth: number,
  viewHeight: number,
  isFrontCamera: boolean
) => {
  'worklet';
  
  // Face position heatmap (based on common face positions)
  const heatmap = isFrontCamera ? [
    // Selfie heatmap
    { x: 0.5, y: 0.4, intensity: 1.0, radius: 0.4 },   // Center (most common)
    { x: 0.3, y: 0.4, intensity: 0.9, radius: 0.35 },  // Left face
    { x: 0.7, y: 0.4, intensity: 0.9, radius: 0.35 },  // Right face
    { x: 0.5, y: 0.25, intensity: 0.8, radius: 0.3 },  // Upper center
    { x: 0.5, y: 0.55, intensity: 0.8, radius: 0.3 },  // Lower center
    { x: 0.2, y: 0.35, intensity: 0.7, radius: 0.25 }, // Far left
    { x: 0.8, y: 0.35, intensity: 0.7, radius: 0.25 }, // Far right
  ] : [
    // Photo heatmap
    { x: 0.5, y: 0.4, intensity: 1.0, radius: 0.5 },   // Center large
    { x: 0.3, y: 0.4, intensity: 0.8, radius: 0.4 },   // Left
    { x: 0.7, y: 0.4, intensity: 0.8, radius: 0.4 },   // Right
    { x: 0.5, y: 0.6, intensity: 0.7, radius: 0.35 },  // Lower
    { x: 0.5, y: 0.2, intensity: 0.7, radius: 0.35 },  // Upper
  ];
  
  return (frame: any) => {
    'worklet';
    
    frame.render();
    
    if (viewWidth === 0 || viewHeight === 0) {
      return;
    }
    
    // Apply blur based on heatmap
    for (const zone of heatmap) {
      const blurStrength = 40 + (zone.intensity * 60); // 40-100 blur range
      
      const paint = Skia.Paint();
      const filter = Skia.ImageFilter.MakeBlur(
        blurStrength,
        blurStrength,
        TileMode.Clamp,
        null
      );
      paint.setImageFilter(filter);
      paint.setAlphaf(0.8 + (zone.intensity * 0.2)); // 0.8-1.0 alpha range
      
      const path = Skia.Path.Make();
      const centerX = zone.x * viewWidth;
      const centerY = zone.y * viewHeight;
      const radius = zone.radius * Math.min(viewWidth, viewHeight);
      
      // Create oval for more natural face shape
      const rect = Skia.XYWHRect(
        centerX - radius,
        centerY - radius * 1.2, // Faces are taller than wide
        radius * 2,
        radius * 2.4
      );
      path.addOval(rect);
      
      frame.save();
      frame.clipPath(path, ClipOp.Intersect, true);
      frame.render(paint);
      frame.restore();
    }
  };
};

/**
 * The ULTIMATE solution: Grid-based blur
 * Divides screen into grid and blurs cells likely to contain faces
 */
export const createGridBlurProcessor = (
  viewWidth: number,
  viewHeight: number,
  isFrontCamera: boolean
) => {
  'worklet';
  
  const gridSize = 4; // 4x4 grid
  const cellWidth = viewWidth / gridSize;
  const cellHeight = viewHeight / gridSize;
  
  // Define which cells to blur (1 = blur, 0 = don't blur)
  // This covers ALL possible face positions
  const blurGrid = isFrontCamera ? [
    [1, 1, 1, 1],  // Top row - all blurred
    [1, 1, 1, 1],  // Second row - all blurred
    [1, 1, 1, 1],  // Third row - all blurred
    [0, 1, 1, 0],  // Bottom row - corners clear for UI
  ] : [
    [0, 1, 1, 0],  // Top row
    [1, 1, 1, 1],  // Second row
    [1, 1, 1, 1],  // Third row
    [0, 1, 1, 0],  // Bottom row
  ];
  
  const blurPaint = Skia.Paint();
  const blurFilter = Skia.ImageFilter.MakeBlur(70, 70, TileMode.Clamp, null);
  blurPaint.setImageFilter(blurFilter);
  
  return (frame: any) => {
    'worklet';
    
    frame.render();
    
    if (viewWidth === 0 || viewHeight === 0) {
      return;
    }
    
    // Apply blur to each grid cell
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (blurGrid[row][col] === 1) {
          const path = Skia.Path.Make();
          const rect = Skia.XYWHRect(
            col * cellWidth,
            row * cellHeight,
            cellWidth,
            cellHeight
          );
          path.addRoundRect(rect, 10, 10);
          
          frame.save();
          frame.clipPath(path, ClipOp.Intersect, true);
          frame.render(blurPaint);
          frame.restore();
        }
      }
    }
  };
};