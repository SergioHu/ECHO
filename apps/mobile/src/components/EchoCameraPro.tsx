import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  Pressable,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Device from 'expo-device';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCameraFormat,
  useSkiaFrameProcessor,
  useFaceDetector,
} from 'react-native-vision-camera';
import {
  Skia, 
  TileMode, 
  ClipOp,
  PaintStyle,
} from '@shopify/react-native-skia';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { X, Camera as CameraIcon, RefreshCw, Shield } from 'lucide-react-native';
import useUpload from '@/utils/useUpload';
import * as ImageManipulator from 'expo-image-manipulator';
import { fetchChallengeCode } from '@/utils/cameraChallenge';
import { detectFacesManually, createManualBlurMasks } from './camera/ManualFaceDetection';
import { createMultiModalFrameProcessor, MultiModalFaceDetector } from './camera/MultiModalFaceDetection';
import { 
  createUltraAggressiveBlurProcessor, 
  createPrivacyFirstProcessor,
  createHeatmapBlurProcessor,
  createGridBlurProcessor 
} from './camera/UltraAggressiveFaceBlur';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Coordinate transformation utilities for mapping frame space to view space
const createFrameToViewTransform = (
  frameWidth: number,
  frameHeight: number,
  viewWidth: number,
  viewHeight: number,
  isFrontCamera: boolean = false,
  rotation: number = 0
) => {
  'worklet';
  
  // Calculate scale for 'cover' mode - scale to fill the view while maintaining aspect ratio
  const frameAspect = frameWidth / frameHeight;
  const viewAspect = viewWidth / viewHeight;
  
  let scale: number;
  let offsetX = 0;
  let offsetY = 0;
  
  if (frameAspect > viewAspect) {
    // Frame is wider - scale based on height and crop width
    scale = viewHeight / frameHeight;
    const scaledWidth = frameWidth * scale;
    offsetX = (viewWidth - scaledWidth) / 2;
  } else {
    // Frame is taller - scale based on width and crop height
    scale = viewWidth / frameWidth;
    const scaledHeight = frameHeight * scale;
    offsetY = (viewHeight - scaledHeight) / 2;
  }
  
  // Return transformation function
  return (x: number, y: number, width: number, height: number) => {
    'worklet';
    
    // Apply front camera mirroring if needed
    let transformedX = isFrontCamera ? frameWidth - x - width : x;
    let transformedY = y;
    
    // Apply scale
    transformedX = transformedX * scale + offsetX;
    transformedY = transformedY * scale + offsetY;
    const transformedWidth = width * scale;
    const transformedHeight = height * scale;
    
    return {
      x: transformedX,
      y: transformedY,
      width: transformedWidth,
      height: transformedHeight,
    };
  };
};

// Transform a contour point
const transformContourPoint = (
  point: { x: number; y: number },
  frameWidth: number,
  frameHeight: number,
  viewWidth: number,
  viewHeight: number,
  isFrontCamera: boolean = false
) => {
  'worklet';
  
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
  
  // Apply transformations
  let transformedX = isFrontCamera ? frameWidth - point.x : point.x;
  let transformedY = point.y;
  
  transformedX = transformedX * scale + offsetX;
  transformedY = transformedY * scale + offsetY;
  
  return { x: transformedX, y: transformedY };
};

interface EchoCameraProProps {
  userId: string;
  requestId: string;
  onComplete: (result: {
    imageUrl: string;
    localUri: string;
    challengeCode: string;
    timestamp: number;
  }) => void;
  onCancel: () => void;
}

export default function EchoCameraPro({
  userId,
  requestId,
  onComplete,
  onCancel,
}: EchoCameraProProps) {
  // Refs
  const cameraRef = useRef<Camera>(null);
  const viewShotRef = useRef<ViewShot>(null);
  
  // Camera permissions and device
  const { hasPermission, requestPermission } = useCameraPermission();
  // Use front camera for selfies with face detection
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('front');
  const device = useCameraDevice(cameraPosition);
  const isFrontCamera = cameraPosition === 'front';
  
  // Select optimal camera format for full-screen experience
  const format = useCameraFormat(device, [
    { videoAspectRatio: screenHeight / screenWidth }, // Match device aspect ratio
    { photoAspectRatio: screenHeight / screenWidth },
    { photoResolution: 'max' },
    { fps: 30 }
  ]);
  
  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [challengeCode, setChallengeCode] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [viewDimensions, setViewDimensions] = useState({ width: 0, height: 0 });
  const [upload] = useUpload();
  
  // Debug overlay state (development only)
  const [showDebugOverlay, setShowDebugOverlay] = useState(__DEV__);
  const [debugFaces, setDebugFaces] = useState<Array<{x:number;y:number;width:number;height:number;id?:number}>>([]);

  // Burst refine buffers (last N frames)
  const recentDetectionsRef = useRef<Array<Array<{x:number;y:number;width:number;height:number;id?:number}>>>([]);
  const MAX_RECENT = 8;

  // Override rectangles (JS -> Worklet bridge via SharedValue)
  const overrideRects = useSharedValue<Array<{x:number;y:number;width:number;height:number}>>([]);
  const lastBurstRectsRef = useRef<Array<{x:number;y:number;width:number;height:number}>>([]);
  const accurateMode = useSharedValue(false);
  
  // Device capability detection
  const deviceCapabilities = useMemo(() => {
    const isHighEnd = Device.totalMemory ? Device.totalMemory > 4 * 1024 * 1024 * 1024 : false;
    const deviceYear = Device.deviceYearClass || new Date().getFullYear();
    const isRecentDevice = deviceYear >= 2020;
    
    return {
      isHighEnd,
      isRecentDevice,
      supportsFaceBlur: isHighEnd || isRecentDevice,
      performanceMode: isHighEnd ? 'fast' : 'balanced',
      blurQuality: isHighEnd ? 'high' : 'medium',
    };
  }, []);
  
  const [faceBlurEnabled, setFaceBlurEnabled] = useState(deviceCapabilities.supportsFaceBlur);
  const [aggressiveMode, setAggressiveMode] = useState(false); // Default to detection-based blur
  const [detectionAttempts, setDetectionAttempts] = useState(0);
  const [maxDetectedFaces, setMaxDetectedFaces] = useState(0);
  const [useManualDetection, setUseManualDetection] = useState(false);
  const [useMultiModal, setUseMultiModal] = useState(false); // Disabled - using ultra-aggressive instead
  const [multiModalDetector] = useState(() => new MultiModalFaceDetector());
  const [useUltraAggressive, setUseUltraAggressive] = useState(true); // ULTRA-AGGRESSIVE BY DEFAULT
  const [blurMode, setBlurMode] = useState<'ultra' | 'privacy' | 'heatmap' | 'grid'>('privacy'); // GUARANTEED: blur everything by default
  
  // Initialize face detector with multiple configurations to test what works
  const { detectFaces } = useFaceDetector({
    // Dynamic, real-time multi-face detection
    performanceMode: 'fast',           // prioritize realtime
    contourMode: 'none',               // bounds only for speed
    landmarkMode: 'none',              // not needed for blur
    classificationMode: 'none',        // not needed for blur
    trackingEnabled: true,             // maintain IDs across frames
    minFaceSize: 0.02,                 // detect very small faces (2% of image)
    maxFaces: 20,                      // support many faces
  });

  // Accurate detector used during refine window
  const { detectFaces: detectFacesAccurate } = useFaceDetector({
    performanceMode: 'accurate',
    contourMode: 'none',
    landmarkMode: 'none',
    classificationMode: 'none',
    trackingEnabled: true,
    minFaceSize: 0.01,
    maxFaces: 20,
  });
  
  // Multi-modal frame processor using the enhanced detection system
  const multiModalFrameProcessor = useMemo(() => {
    if (!useMultiModal) return null;
    
    return createMultiModalFrameProcessor(
      detectFaces,
      viewDimensions.width,
      viewDimensions.height,
      isFrontCamera
    );
  }, [useMultiModal, detectFaces, viewDimensions.width, viewDimensions.height, isFrontCamera]);
  
  // ULTRA-AGGRESSIVE frame processors - GUARANTEED face blur
  const ultraAggressiveProcessor = useMemo(() => {
    if (!useUltraAggressive || viewDimensions.width === 0) return null;
    
    switch (blurMode) {
      case 'privacy':
        return createPrivacyFirstProcessor(viewDimensions.width, viewDimensions.height);
      case 'heatmap':
        return createHeatmapBlurProcessor(viewDimensions.width, viewDimensions.height, isFrontCamera);
      case 'grid':
        return createGridBlurProcessor(viewDimensions.width, viewDimensions.height, isFrontCamera);
      case 'ultra':
      default:
        return createUltraAggressiveBlurProcessor(viewDimensions.width, viewDimensions.height, isFrontCamera);
    }
  }, [useUltraAggressive, blurMode, viewDimensions.width, viewDimensions.height, isFrontCamera]);
  
  // Create Skia blur paint with stronger blur
  const blurRadius = deviceCapabilities.blurQuality === 'high' ? 60 : 45; // Increased blur strength
  const blurFilter = useMemo(() => 
    Skia.ImageFilter.MakeBlur(
      blurRadius,
      blurRadius,
      TileMode.Clamp,
      null
    ), [blurRadius]
  );
  
  const paint = useMemo(() => {
    const p = Skia.Paint();
    p.setImageFilter(blurFilter);
    return p;
  }, [blurFilter]);
  
  // Debug paint for visualizing face bounds
  const debugPaint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color('#ff3b30')); // Red color
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(3);
    return p;
  }, []);
  
  // Real-time face detection and blur (dynamic positioning)
  const frameProcessor = useSkiaFrameProcessor(
    (frame) => {
      'worklet';

      const currentFrame = frameCount + 1;

      // Always render original frame first
      frame.render();

      if (!faceBlurEnabled || viewDimensions.width === 0 || viewDimensions.height === 0) {
        return;
      }

      try {
        // 1) Detect faces in this frame (switch to accurate detector when requested)
        const detection = accurateMode.value ? detectFacesAccurate(frame) : detectFaces(frame);
        const faces = Array.isArray(detection) ? detection : (detection?.faces ?? []);

        // Debug every second
        if (__DEV__ && currentFrame % 30 === 0) {
          console.log(`[Detector] faces=${faces.length} frame=${frame.width}x${frame.height} view=${viewDimensions.width}x${viewDimensions.height}`);
          faces.forEach((f: any, i: number) => {
            if (f?.bounds) {
              console.log(`  [${i}] x=${Math.round(f.bounds.x)} y=${Math.round(f.bounds.y)} w=${Math.round(f.bounds.width)} h=${Math.round(f.bounds.height)}`);
            }
          });
        }

        // 2) Map frame-space bounds to view-space and blur
        const toView = createFrameToViewTransform(
          frame.width,
          frame.height,
          viewDimensions.width,
          viewDimensions.height,
          isFrontCamera,
          0
        );

        const overlayRects: Array<{x:number;y:number;width:number;height:number;id?:number}> = [];

        for (let i = 0; i < faces.length; i++) {
          const face: any = faces[i];
          if (!face?.bounds) continue;

          // Expand bounds to fully cover forehead/chin/sides
          const cx = face.bounds.x + face.bounds.width / 2;
          const cy = face.bounds.y + face.bounds.height / 2;
          const w = face.bounds.width * 1.35;  // +35% width
          const h = face.bounds.height * 1.5;   // +50% height
          const rectFrame = { x: cx - w / 2, y: cy - h / 2, width: w, height: h };

          const mapped = toView(rectFrame.x, rectFrame.y, rectFrame.width, rectFrame.height);
          overlayRects.push({ x: mapped.x, y: mapped.y, width: mapped.width, height: mapped.height, id: face?.trackingId ?? i });

          const path = Skia.Path.Make();
          const rect = Skia.XYWHRect(mapped.x, mapped.y, mapped.width, mapped.height);
          path.addOval(rect);

          frame.save();
          frame.clipPath(path, ClipOp.Intersect, true);
          frame.render(paint);
          frame.restore();
        }

        // Throttled debug overlay pass to JS
        if (currentFrame % 3 === 0) {
          // Keep recent detections for burst refine
          // @ts-expect-error runOnJS worklet bridge
          runOnJS((rects) => {
            recentDetectionsRef.current.push(rects);
            if (recentDetectionsRef.current.length > MAX_RECENT) recentDetectionsRef.current.shift();
            if (showDebugOverlay) setDebugFaces(rects);
          })(overlayRects);
        }

        // Apply any override rectangles from JS (burst refine)
        if (overrideRects.value && overrideRects.value.length > 0) {
          for (let k = 0; k < overrideRects.value.length; k++) {
            const r = overrideRects.value[k];
            const path = Skia.Path.Make();
            const rect = Skia.XYWHRect(r.x, r.y, r.width, r.height);
            path.addOval(rect);
            frame.save();
            frame.clipPath(path, ClipOp.Intersect, true);
            frame.render(paint);
            frame.restore();
          }
        }
      } catch (error) {
        if (__DEV__) console.error('[FrameProcessor] detection error', error);
      }
    },
    [detectFaces, detectFacesAccurate, paint, faceBlurEnabled, viewDimensions, isFrontCamera, frameCount, showDebugOverlay, accurateMode]
  );
  
  // Fetch challenge code on mount
  useEffect(() => {
    const controller = new AbortController();
    
    (async () => {
      try {
        const code = await fetchChallengeCode({ userId, requestId, signal: controller.signal });
        setChallengeCode(code);
      } catch (e) {
        console.warn('[EchoCameraPro] Challenge code fetch failed:', e);
      }
    })();
    
    return () => controller.abort();
  }, [userId, requestId]);
  
  // Performance warning for low-end devices
  useEffect(() => {
    if (!deviceCapabilities.supportsFaceBlur) {
      Alert.alert(
        'Performance Notice',
        'Your device may experience reduced performance with real-time face blurring. You can disable this feature if needed.',
        [
          { text: 'Keep Enabled', style: 'default' },
          { 
            text: 'Disable Face Blur', 
            onPress: () => setFaceBlurEnabled(false),
            style: 'destructive'
          },
        ]
      );
    }
  }, [deviceCapabilities.supportsFaceBlur]);
  
  // Handle camera view layout to capture dimensions
  const handleCameraLayout = useCallback((event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setViewDimensions({ width, height });
    console.log('[EchoCameraPro] Camera view dimensions:', { width, height });
  }, []);
  
  // Capture photo using ViewShot (captures the rendered view with blur effects)
  // Compute union of rectangles with simple IoU clustering
  const computeUnionRects = useCallback((rects: Array<{x:number;y:number;width:number;height:number}>) => {
    const clusters: Array<{x:number;y:number;width:number;height:number}> = [];
    const iou = (a:any,b:any) => {
      const ax2=a.x+a.width, ay2=a.y+a.height, bx2=b.x+b.width, by2=b.y+b.height;
      const x1=Math.max(a.x,b.x), y1=Math.max(a.y,b.y), x2=Math.min(ax2,bx2), y2=Math.min(ay2,by2);
      const inter=Math.max(0,x2-x1)*Math.max(0,y2-y1);
      const ua=a.width*a.height + b.width*b.height - inter;
      return ua>0 ? inter/ua : 0;
    };
    rects.forEach(r => {
      let merged=false;
      for (let c of clusters) {
        if (iou(c,r) > 0.3) { // merge
          const x=Math.min(c.x,r.x), y=Math.min(c.y,r.y);
          const x2=Math.max(c.x+c.width,r.x+r.width), y2=Math.max(c.y+c.height,r.y+r.height);
          c.x=x; c.y=y; c.width=x2-x; c.height=y2-y; merged=true; break;
        }
      }
      if (!merged) clusters.push({...r});
    });
    return clusters;
  }, []);

  const totalArea = useCallback((rects: Array<{x:number;y:number;width:number;height:number}>) => {
    return rects.reduce((s, r) => s + r.width * r.height, 0);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!viewShotRef.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // BURST REFINE: compute union of last N frames rects and apply as override for this capture
      // Ensure we are in fast mode for burst
      accurateMode.value = false;
      let burstRects = computeUnionRects(recentDetectionsRef.current.flat());
      lastBurstRectsRef.current = burstRects;
      // If no faces detected in recent frames, fall back to privacy-first zones for safety
      if (!burstRects || burstRects.length === 0) {
        const vw = viewDimensions.width;
        const vh = viewDimensions.height;
        burstRects = [
          { x: 0, y: vh * 0.15, width: vw, height: vh * 0.7 },
        ];
      }
      overrideRects.value = burstRects;
      // Give 1-2 frames for worklet to draw override rects
      await new Promise(resolve => setTimeout(resolve, 120));
      
      // Capture the entire rendered view (including blur effects)
      let uri = await viewShotRef.current.capture({
        format: 'jpg',
        quality: 0.9,
        result: 'tmpfile',
      });
      
      console.log('[EchoCameraPro] Captured view with burst-refine override:', uri);
      
      // Post-capture verify: if following frames reveal more/larger faces, recapture quickly
      const verifyRects = computeUnionRects(recentDetectionsRef.current.flat());
      const grew = verifyRects.length > lastBurstRectsRef.current.length ||
                   totalArea(verifyRects) > totalArea(lastBurstRectsRef.current) * 1.15;
      if (grew) {
        overrideRects.value = verifyRects;
        await new Promise(resolve => setTimeout(resolve, 120));
        try {
          const recapture = await viewShotRef.current.capture({ format: 'jpg', quality: 0.9, result: 'tmpfile' });
          if (recapture) uri = recapture;
          console.log('[EchoCameraPro] Recaptured with verified rects');
        } catch {}
      }
      
      // Accurate refine window (extra frames for ~180ms)
      // Switch to accurate detector during refine window
      accurateMode.value = true;
      const refineStart = Date.now();
      while (Date.now() - refineStart < 180) {
        await new Promise(r => setTimeout(r, 30));
      }
      const refineRects = computeUnionRects(recentDetectionsRef.current.flat());
      const refineGrew = refineRects.length > verifyRects.length || totalArea(refineRects) > totalArea(verifyRects) * 1.12;
      if (refineGrew) {
        overrideRects.value = refineRects;
        await new Promise(resolve => setTimeout(resolve, 120));
        try {
          const recapture2 = await viewShotRef.current.capture({ format: 'jpg', quality: 0.9, result: 'tmpfile' });
          if (recapture2) uri = recapture2;
          console.log('[EchoCameraPro] Recaptured with accurate refine rects');
        } catch {}
      }

      // Clear overrides and return to fast mode
      overrideRects.value = [];
      accurateMode.value = false;

      // Process and upload (accurate pass placeholder)
      await processAndUploadPhoto(uri);
      
      setPhotoTaken(true);
      lastBurstRectsRef.current = [];
      
    } catch (error) {
      console.error('[EchoCameraPro] Capture error:', error);
      Alert.alert('Capture Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, []);
  
  // Process and upload the captured image
  const processAndUploadPhoto = async (photoUri: string) => {
    try {
      // Resize for optimal upload
      const processedImage = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 1280 } }],
        { 
          compress: 0.85,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      // Upload to storage
      const timestamp = Date.now();
      const fileName = `${userId}/${requestId}/${timestamp}-echo.jpg`;
      
      const uploadResult = await upload({
        uri: processedImage.uri,
        fileName,
      });
      
      if (uploadResult.error) {
        throw new Error(uploadResult.error);
      }
      
      // Return results
      onComplete({
        imageUrl: uploadResult.url,
        localUri: processedImage.uri,
        challengeCode: challengeCode || '',
        timestamp,
      });
      
      Alert.alert(
        'Success!',
        'Photo captured with privacy protection and uploaded successfully.',
        [{ text: 'OK', onPress: onCancel }]
      );
      
    } catch (error) {
      console.error('[EchoCameraPro] Upload error:', error);
      Alert.alert('Upload Error', 'Failed to upload photo. Please try again.');
      setIsProcessing(false);
    }
  };
  
  // Handle permission states
  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permissionContent}>
          <CameraIcon size={64} color="#fff" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionDescription}>
            Echo needs camera access to capture privacy-protected photos with real-time face blurring.
          </Text>
          <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  if (!device) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.permissionTitle}>No camera device found</Text>
        <Text style={styles.permissionDescription}>
          Please ensure your device has a working camera.
        </Text>
        <TouchableOpacity onPress={onCancel} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (!format) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.permissionTitle}>Configuring camera...</Text>
      </View>
    );
  }
  
  // Main camera UI - Full screen immersive experience
  return (
    <ViewShot ref={viewShotRef} style={StyleSheet.absoluteFill} options={{ format: 'jpg', quality: 0.9 }}>
      <StatusBar hidden />
      
      {/* Full-screen camera */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        isActive={!photoTaken && !isProcessing}
        photo={true}
        frameProcessor={frameProcessor}
        resizeMode="cover"
        onLayout={handleCameraLayout}
      />

      {/* Debug overlay rectangles (development only) */}
      {__DEV__ && showDebugOverlay && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {debugFaces.map((r, idx) => (
            <View key={`${r.id ?? idx}-${idx}`} style={{
              position: 'absolute',
              left: r.x,
              top: r.y,
              width: r.width,
              height: r.height,
              borderColor: '#00FF88',
              borderWidth: 2,
              borderRadius: Math.min(r.width, r.height) / 2,
              backgroundColor: 'rgba(0,255,136,0.08)'
            }} />
          ))}
        </View>
      )}
      
      {/* Header overlay */}
      <View style={styles.headerOverlay}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Echo Camera</Text>
            <Text style={styles.headerSubtitle}>
              🔒 Real-time Privacy Protection
            </Text>
            {challengeCode && (
              <Text style={styles.challengeCode}>
                🎯 Challenge: {challengeCode}
              </Text>
            )}
          </View>
          
          <View style={styles.headerButtons}>
            <Pressable
              onPress={() => setCameraPosition(prev => prev === 'front' ? 'back' : 'front')}
              disabled={isProcessing}
              style={[styles.headerButton, { marginRight: 12 }]}
            >
              <RefreshCw size={24} color="#fff" />
            </Pressable>
            <Pressable
              onPress={onCancel}
              disabled={isProcessing}
              style={styles.headerButton}
            >
              <X size={24} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>
      
      {/* Footer overlay */}
      <View style={styles.footerOverlay}>
        <Text style={styles.instructionText}>
          Frame your subject and tap to capture
        </Text>
        
        {photoTaken ? (
          <View style={styles.successContainer}>
            <View style={styles.successIcon} />
            <Text style={styles.successText}>Photo captured successfully!</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              onPress={capturePhoto}
              disabled={isProcessing}
              style={[
                styles.shutterButton,
                isProcessing && styles.shutterButtonDisabled,
              ]}
            >
              {isProcessing ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>
            
            <Text style={[styles.privacyText, useUltraAggressive && styles.ultraAggressiveText]}>
              {useUltraAggressive ? `🛡️ ULTRA-AGGRESSIVE: ${blurMode.toUpperCase()}` : aggressiveMode ? '🛡️ Maximum Privacy Mode' : '🔒 Privacy protection active'}
            </Text>
            <TouchableOpacity
              onPress={() => setAggressiveMode(!aggressiveMode)}
              style={styles.privacyToggle}
            >
              <Shield size={20} color={aggressiveMode ? '#ff3b30' : '#fff'} />
              <Text style={styles.privacyToggleText}>
                {aggressiveMode ? 'Max' : 'Normal'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      
      {/* Debug overlay (development only) */}
      {__DEV__ && (
        <View style={styles.debugOverlay}>
          <Text style={styles.debugText}>
            Device: {deviceCapabilities.isHighEnd ? 'High-end' : 'Standard'}
          </Text>
          <Text style={styles.debugText}>
            Blur: {faceBlurEnabled ? 'Enabled' : 'Disabled'}
          </Text>
          <Text style={styles.debugText}>
            Format: {format.photoWidth}x{format.photoHeight}
          </Text>
          <Text style={[styles.debugText, { color: maxDetectedFaces > 1 ? '#00ff00' : '#ff3b30' }]}>
            Max Faces: {maxDetectedFaces}
          </Text>
          <Text style={styles.debugText}>
            Detection: {detectionAttempts > 0 ? Math.round((maxDetectedFaces / detectionAttempts) * 100) : 0}% success
          </Text>
          <Text style={[styles.debugText, { color: useUltraAggressive ? '#ff00ff' : useMultiModal ? '#00ff00' : '#ffaa00' }]}>
            Mode: {useUltraAggressive ? `ULTRA-${blurMode.toUpperCase()}` : useMultiModal ? 'Multi-Modal' : 'Legacy'}
          </Text>
          <TouchableOpacity 
            onPress={() => {
              if (useUltraAggressive) {
                // Cycle through blur modes
                const modes: Array<'ultra' | 'privacy' | 'heatmap' | 'grid'> = ['ultra', 'privacy', 'heatmap', 'grid'];
                const currentIndex = modes.indexOf(blurMode);
                const nextMode = modes[(currentIndex + 1) % modes.length];
                setBlurMode(nextMode);
              } else {
                setUseUltraAggressive(true);
              }
            }}
            style={[styles.debugButton, { backgroundColor: useUltraAggressive ? '#ff00ff' : '#666', marginBottom: 5 }]}
          >
            <Text style={styles.debugButtonText}>
              {useUltraAggressive ? `ULTRA: ${blurMode.toUpperCase()}` : 'Enable ULTRA'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              setUseUltraAggressive(false);
              setUseMultiModal(!useMultiModal);
            }}
            style={[styles.debugButton, { backgroundColor: useMultiModal ? '#00ff00' : '#ffaa00', marginBottom: 5 }]}
          >
            <Text style={styles.debugButtonText}>
              {useMultiModal ? 'Multi-Modal ON' : 'Legacy Mode'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setUseManualDetection(!useManualDetection)}
            style={[styles.debugButton, { backgroundColor: useManualDetection ? '#00ff00' : '#ff3b30' }]}
          >
            <Text style={styles.debugButtonText}>
              {useManualDetection ? 'Manual ON' : 'Manual OFF'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ViewShot>
  );
}

const styles = StyleSheet.create({
  // Permission states
  permissionContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 20,
  },
  permissionDescription: {
    color: '#B3B3B3',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
  },
  cancelButtonText: {
    color: '#B3B3B3',
    fontSize: 16,
  },
  
  // Header overlay
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    zIndex: 100,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
    opacity: 0.9,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  challengeCode: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  closeButton: {
    padding: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  
  // Footer overlay
  footerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingTop: 30,
    paddingBottom: 50,
    paddingHorizontal: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 30,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  
  // Shutter button
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  shutterButtonDisabled: {
    opacity: 0.6,
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
  },
  
  privacyText: {
    color: '#B3B3B3',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  aggressiveText: {
    color: '#ff3b30',
    fontWeight: '600',
    opacity: 1,
  },
  ultraAggressiveText: {
    color: '#ff00ff',
    fontWeight: '700',
    fontSize: 15,
    opacity: 1,
    textShadowColor: 'rgba(255, 0, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  privacyToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Success state
  successContainer: {
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    marginBottom: 20,
  },
  successText: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: '600',
  },
  
  // Debug overlay (development only)
  debugOverlay: {
    position: 'absolute',
    bottom: 200,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 8,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  debugButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 5,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
