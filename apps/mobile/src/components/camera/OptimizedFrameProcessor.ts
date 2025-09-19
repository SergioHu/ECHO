import { Skia, TileMode, ClipOp, PaintStyle } from '@shopify/react-native-skia';

/**
 * Optimized coordinate transformation for production use
 * Transforms face detection coordinates from camera frame space to view space
 */
export const createOptimizedFrameProcessor = (
  detectFaces: any,
  paint: any,
  viewWidth: number,
  viewHeight: number,
  isFrontCamera: boolean,
  deviceCapabilities: any
) => {
  'worklet';
  
  // Pre-calculate transformation constants to avoid per-frame calculations
  const transformCache = new Map();
  
  const getTransformForFrame = (frameWidth: number, frameHeight: number) => {
    'worklet';
    
    const cacheKey = `${frameWidth}x${frameHeight}`;
    if (transformCache.has(cacheKey)) {
      return transformCache.get(cacheKey);
    }
    
    // Calculate scale for 'cover' mode
    const frameAspect = frameWidth / frameHeight;
    const viewAspect = viewWidth / viewHeight;
    
    let scale: number;
    let offsetX = 0;
    let offsetY = 0;
    
    if (frameAspect > viewAspect) {
      scale = viewHeight / frameHeight;
      const scaledWidth = frameWidth * scale;
      offsetX = (viewWidth - scaledWidth) / 2;
    } else {
      scale = viewWidth / frameWidth;
      const scaledHeight = frameHeight * scale;
      offsetY = (viewHeight - scaledHeight) / 2;
    }
    
    const transform = { scale, offsetX, offsetY, frameWidth };
    transformCache.set(cacheKey, transform);
    return transform;
  };
  
  // Optimized point transformation
  const transformPoint = (
    x: number,
    y: number,
    transform: any
  ) => {
    'worklet';
    
    // Apply front camera mirroring if needed
    const mirroredX = isFrontCamera ? transform.frameWidth - x : x;
    
    // Apply scale and offset
    return {
      x: mirroredX * transform.scale + transform.offsetX,
      y: y * transform.scale + transform.offsetY,
    };
  };
  
  // Optimized bounds transformation
  const transformBounds = (
    bounds: any,
    transform: any
  ) => {
    'worklet';
    
    const topLeft = transformPoint(bounds.x, bounds.y, transform);
    
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bounds.width * transform.scale,
      height: bounds.height * transform.scale,
    };
  };
  
  // Return the actual frame processor function
  return (frame: any) => {
    'worklet';
    
    // Always render the original frame first
    frame.render();
    
    // Early exit if view dimensions not ready
    if (viewWidth === 0 || viewHeight === 0) {
      return;
    }
    
    try {
      // Detect faces
      const { faces } = detectFaces(frame);
      
      if (faces.length === 0) {
        return;
      }
      
      // Get transformation for this frame
      const transform = getTransformForFrame(frame.width, frame.height);
      
      // Process each face
      for (let i = 0; i < faces.length; i++) {
        const face = faces[i];
        
        // Create blur path
        const path = Skia.Path.Make();
        
        if (face.contours && face.contours.FACE && face.contours.FACE.length > 0) {
          // Use face contours for more accurate blur mask
          const contour = face.contours.FACE;
          const step = deviceCapabilities.isHighEnd ? 1 : 2;
          
          for (let j = 0; j < contour.length; j += step) {
            const transformed = transformPoint(
              contour[j].x,
              contour[j].y,
              transform
            );
            
            if (j === 0) {
              path.moveTo(transformed.x, transformed.y);
            } else {
              path.lineTo(transformed.x, transformed.y);
            }
          }
          path.close();
        } else if (face.bounds) {
          // Fallback to bounds-based oval blur
          const transformedBounds = transformBounds(face.bounds, transform);
          const ovalRect = Skia.XYWHRect(
            transformedBounds.x,
            transformedBounds.y,
            transformedBounds.width,
            transformedBounds.height
          );
          path.addOval(ovalRect);
        } else {
          continue;
        }
        
        // Apply blur effect
        frame.save();
        frame.clipPath(path, ClipOp.Intersect, true);
        frame.render(paint);
        frame.restore();
      }
    } catch (error) {
      // Silently handle errors in production
      console.error('[FrameProcessor] Error:', error);
    }
  };
};

/**
 * Create a simpler bounds-only processor for low-end devices
 */
export const createSimplifiedFrameProcessor = (
  detectFaces: any,
  paint: any,
  viewWidth: number,
  viewHeight: number,
  isFrontCamera: boolean
) => {
  'worklet';
  
  return (frame: any) => {
    'worklet';
    
    // Always render the original frame first
    frame.render();
    
    if (viewWidth === 0 || viewHeight === 0) {
      return;
    }
    
    try {
      const { faces } = detectFaces(frame);
      
      if (faces.length === 0) {
        return;
      }
      
      // Simple scale calculation for cover mode
      const scale = Math.max(
        viewWidth / frame.width,
        viewHeight / frame.height
      );
      
      const scaledWidth = frame.width * scale;
      const scaledHeight = frame.height * scale;
      const offsetX = (viewWidth - scaledWidth) / 2;
      const offsetY = (viewHeight - scaledHeight) / 2;
      
      // Process faces with simple oval blur
      for (const face of faces) {
        if (!face.bounds) continue;
        
        // Transform bounds
        const x = isFrontCamera 
          ? frame.width - face.bounds.x - face.bounds.width 
          : face.bounds.x;
        
        const transformedX = x * scale + offsetX;
        const transformedY = face.bounds.y * scale + offsetY;
        const transformedWidth = face.bounds.width * scale;
        const transformedHeight = face.bounds.height * scale;
        
        // Create oval path for blur
        const path = Skia.Path.Make();
        const rect = Skia.XYWHRect(
          transformedX,
          transformedY,
          transformedWidth,
          transformedHeight
        );
        path.addOval(rect);
        
        // Apply blur
        frame.save();
        frame.clipPath(path, ClipOp.Intersect, true);
        frame.render(paint);
        frame.restore();
      }
    } catch (error) {
      console.error('[SimplifiedProcessor] Error:', error);
    }
  };
};