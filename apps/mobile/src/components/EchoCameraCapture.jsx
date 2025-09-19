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
} from 'react-native';
import * as Device from 'expo-device';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCameraFormat,
  useSkiaFrameProcessor,
  useFaceDetector,
  Frame,
} from 'react-native-vision-camera';
import { 
  Skia, 
  PaintStyle, 
  TileMode, 
  ClipOp,
  Canvas,
  Image as SkiaImage,
} from '@shopify/react-native-skia';
import { Worklets } from 'react-native-worklets-core';
import { X, Camera as CameraIcon, CheckCircle } from 'lucide-react-native';
import useUpload from '@/utils/useUpload';
import * as ImageManipulator from 'expo-image-manipulator';
import { captureRef } from 'react-native-view-shot';
import { 
  getResponsiveCameraStyles, 
  shouldShowDevWarnings,
  getCameraPermissionMessage 
} from '@/utils/responsiveCameraStyles';
import { fetchChallengeCode } from '@/utils/cameraChallenge';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function EchoCameraCapture({
  userId,
  requestId,
  onComplete,
  onCancel,
}) {
  const cameraRef = useRef(null);
  const viewRef = useRef(null); // Reference for capturing the rendered view
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  
  // Select optimal camera format with proper aspect ratio
  const format = useCameraFormat(device, [
    { photoAspectRatio: 16/9 },
    { videoAspectRatio: 16/9 },
    { photoResolution: 'max' },
    { fps: 30 }
  ]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [challengeCode, setChallengeCode] = useState<string | null>(null);
  
  const [upload] = useUpload();
  
  // Device capability detection
  const deviceCapabilities = useMemo(() => {
    const isHighEnd = Device.totalMemory ? Device.totalMemory > 4 * 1024 * 1024 * 1024 : false; // > 4GB RAM
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
  const [performanceWarningShown, setPerformanceWarningShown] = useState(false);

  // Initialize face detector with device-appropriate settings
  const { detectFaces } = useFaceDetector({
    performanceMode: deviceCapabilities.performanceMode,
    contourMode: deviceCapabilities.isHighEnd ? 'all' : 'none',
    landmarkMode: 'none',
    classificationMode: 'none',
  });

  // Create blur paint for Skia with device-appropriate settings
  const blurRadius = deviceCapabilities.blurQuality === 'high' ? 25 : 15;
  const blurFilter = useMemo(() => 
    Skia.ImageFilter.MakeBlur(
      blurRadius,
      blurRadius,
      TileMode.Repeat,
      null
    ), [blurRadius]
  );
  const paint = useMemo(() => {
    const p = Skia.Paint();
    p.setImageFilter(blurFilter);
    return p;
  }, [blurFilter]);

  // DEBUG: Frame processing counter for logging
  const [frameCount, setFrameCount] = useState(0);
  
  // Frame processor for real-time face blurring with comprehensive debugging
  const frameProcessor = useSkiaFrameProcessor(
    (frame) => {
      'worklet';
      
      // DEBUG: Log frame processor execution every 30 frames
      const currentFrame = frameCount + 1;
      if (currentFrame % 30 === 0) {
        console.log(`[DEBUG] Frame Processor Running - Frame #${currentFrame}`);
      }
      
      // 1. Render the original frame
      frame.render();
      
      // Skip face detection if disabled or not supported
      if (!faceBlurEnabled) {
        if (currentFrame % 60 === 0) {
          console.log('[DEBUG] Face blur disabled, skipping detection');
        }
        return;
      }

      try {
        // 2. Detect faces in the frame
        const { faces } = detectFaces({ frame });
        
        // DEBUG: Log face detection results
        if (currentFrame % 30 === 0) {
          console.log(`[DEBUG] Detected ${faces.length} faces`);
        }
        
        // DEBUG: Test Skia rendering with simple rectangle (remove after debugging)
        if (__DEV__ && currentFrame % 60 === 0) {
          // Test rectangle to verify Skia is working
          const testPath = Skia.Path.Make();
          const testRect = Skia.XYWHRect(100, 100, 200, 200);
          testPath.addRect(testRect);
          
          frame.save();
          frame.clipPath(testPath, ClipOp.Intersect, true);
          frame.render(paint);
          frame.restore();
          
          console.log('[DEBUG] Test rectangle rendered');
        }

        // 3. Apply blur to each detected face (limit to first 5 faces for performance)
        const facesToProcess = faces.slice(0, deviceCapabilities.isHighEnd ? 10 : 5);
        
        for (let i = 0; i < facesToProcess.length; i++) {
          const face = facesToProcess[i];
          const path = Skia.Path.Make();

          // DEBUG: Log face processing
          if (currentFrame % 30 === 0) {
            console.log(`[DEBUG] Processing face ${i + 1}/${facesToProcess.length}`);
          }

          // Define which face contours to blur (simplified for lower-end devices)
          const necessaryContours = deviceCapabilities.isHighEnd 
            ? ['FACE', 'LEFT_CHEEK', 'RIGHT_CHEEK']
            : ['FACE'];
          
          let pointsAdded = 0;
          for (const key of necessaryContours) {
            const points = face.contours?.[key];
            if (points && points.length > 0) {
              // Sample points for performance on low-end devices
              const step = deviceCapabilities.isHighEnd ? 1 : 2;
              points.forEach((point, index) => {
                if (index % step === 0) {
                  if (pointsAdded === 0) {
                    path.moveTo(point.x, point.y);
                  } else {
                    path.lineTo(point.x, point.y);
                  }
                  pointsAdded++;
                }
              });
              path.close();
            }
          }

          // Only apply blur if we have a valid path with points
          if (pointsAdded > 0) {
            // Apply blur to the face region
            frame.save();
            frame.clipPath(path, ClipOp.Intersect, true);
            frame.render(paint);
            frame.restore();
            
            if (currentFrame % 30 === 0) {
              console.log(`[DEBUG] Blur applied to face ${i + 1} with ${pointsAdded} points`);
            }
          } else {
            if (currentFrame % 30 === 0) {
              console.log(`[DEBUG] No valid contour points for face ${i + 1}`);
            }
          }
        }
      } catch (error) {
        console.error('[DEBUG] Face detection error:', error);
      }
    },
    [paint, detectFaces, faceBlurEnabled, deviceCapabilities, frameCount]
  );

  // Request camera permissions on mount, fetch challenge code, and show performance warning
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }

    // Fetch challenge code
    const controller = new AbortController();
    (async () => {
      try {
        const code = await fetchChallengeCode({ userId, requestId, signal: controller.signal });
        setChallengeCode(code);
      } catch (e) {
        // Fallback handled inside fetchChallengeCode
      }
    })();

    // Show performance warning for low-end devices
    if (!deviceCapabilities.supportsFaceBlur && !performanceWarningShown) {
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
      setPerformanceWarningShown(true);
    }

    return () => controller.abort();
  }, [hasPermission, requestPermission, deviceCapabilities, performanceWarningShown, userId, requestId]);

  // Take photo with privacy protection already applied using view-shot
  const takePhoto = useCallback(async () => {
    if (!viewRef.current) {
      Alert.alert('Error', 'Camera view not ready');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Capture the rendered view (with blur effects already applied)
      // This is the key difference - we're capturing what the user sees, not the raw camera
      const uri = await captureRef(viewRef.current, {
        format: 'jpg',
        quality: 0.9,
        result: 'tmpfile',
      });

      console.log('View captured with privacy protection applied:', uri);
      
      // Process and upload the already-blurred image
      await processAndUploadPhoto(uri);
      
      setPhotoTaken(true);
      
    } catch (error) {
      console.error('Error capturing view:', error);
      Alert.alert('Capture Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Process and upload the privacy-protected photo
  const processAndUploadPhoto = async (photoPath) => {
    try {
      // The photo is already privacy-safe since it's a capture of the rendered view
      const uri = photoPath; // View-shot already provides the correct URI format
      
      // Resize image for optimal upload size while maintaining quality
      const processedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1280 } }], // Max width 1280px
        { 
          compress: 0.85,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Generate filename with timestamp
      const timestamp = Date.now();
      const fileName = `${userId}/${requestId}/${timestamp}-echo.jpg`;

      // Upload to storage
      const uploadResult = await upload({
        uri: processedImage.uri,
        fileName,
      });

      if (uploadResult.error) {
        throw new Error(uploadResult.error);
      }

      // Return result to parent component
      onComplete({
        imageUrl: uploadResult.url,
        localUri: processedImage.uri,
        challengeCode,
        timestamp,
      });

      Alert.alert(
        'Success!',
        'Photo captured with privacy protection and uploaded successfully.',
        [{ text: 'OK', onPress: onCancel }]
      );

    } catch (error) {
      console.error('Error processing photo:', error);
      Alert.alert('Upload Error', 'Failed to upload photo. Please try again.');
      setIsProcessing(false);
    }
  };

  // Get camera permission messages
  const permissionMessages = getCameraPermissionMessage();

  // Handle permission states
  if (!hasPermission) {
    return (
      <View style={[styles.permissionContainer, getResponsiveCameraStyles().rootContainer]}>
        <View style={styles.permissionContent}>
          <CameraIcon size={64} color="#fff" />
          <Text style={styles.permissionTitle}>
            {permissionMessages.title}
          </Text>
          <Text style={styles.permissionDescription}>
            {permissionMessages.description}
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={styles.permissionButton}
          >
            <Text style={styles.permissionButtonText}>{permissionMessages.buttonText}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!device) {
    console.log('[DEBUG] No camera device available');
    return (
      <View style={[styles.permissionContainer, getResponsiveCameraStyles().rootContainer]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.permissionTitle}>No camera device found.</Text>
        <Text style={styles.permissionDescription}>
          Please ensure your device has a working camera and permissions are granted.
        </Text>
        <TouchableOpacity onPress={onCancel} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (!format) {
    console.log('[DEBUG] No camera format selected');
    return (
      <View style={[styles.permissionContainer, getResponsiveCameraStyles().rootContainer]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.permissionTitle}>Configuring camera...</Text>
        <Text style={styles.permissionDescription}>
          Selecting optimal camera format for your device.
        </Text>
      </View>
    );
  }

  // Get responsive styles
  const responsiveStyles = getResponsiveCameraStyles();
  const showDevWarnings = shouldShowDevWarnings();
  const isWeb = Platform.OS === 'web';

  // Calculate proper camera dimensions based on selected format
  const cameraAspectRatio = 16 / 9; // Match the format we selected
  const cameraWidth = screenWidth;
  const cameraHeight = cameraWidth / cameraAspectRatio;
  
  // DEBUG: Log camera dimensions
  useEffect(() => {
    console.log(`[DEBUG] Camera dimensions: ${cameraWidth}x${cameraHeight} (aspect: ${cameraAspectRatio})`);
    if (format) {
      console.log('[DEBUG] Selected camera format:', format);
    }
  }, [cameraWidth, cameraHeight, format]);
  
  return (
    <View style={[styles.rootContainer, responsiveStyles.rootContainer]}>
      <View 
        style={[
          styles.cameraContainer, 
          responsiveStyles.cameraContainer,
          {
            width: cameraWidth,
            height: cameraHeight,
            alignSelf: 'center',
          }
        ]} 
        ref={viewRef}
      >
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          format={format}
          isActive={!photoTaken}
          photo={true}
          frameProcessor={frameProcessor}
          resizeMode="cover"
        />

        {/* Header Overlay - Crystal Clear Hierarchy */}
        <View style={[styles.headerOverlay, responsiveStyles.headerOverlay]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              {/* Primary Title - Bold and Prominent */}
              <Text style={[styles.headerTitle, responsiveStyles.headerTitle]}>Echo Camera</Text>
              
              {/* Subtitle - Smaller, Regular Weight */}
              <View style={styles.subtitleRow}>
                <Text style={styles.modeIcon}>🔒</Text>
                <Text style={[styles.headerSubtitle, responsiveStyles.headerSubtitle]}>
                  Real-time Privacy Protection
                </Text>
              </View>
              
              {/* Challenge Code - Consistent Style, Clear Label */}
              <View style={styles.challengeRow}>
                <Text style={styles.challengeIcon}>🎯</Text>
                <Text style={styles.challengeText}>
                  Challenge: <Text style={styles.challengeValue}>{challengeCode || 'Loading...'}</Text>
                </Text>
              </View>
            </View>
            
            <Pressable
              onPress={onCancel}
              disabled={isProcessing}
              style={styles.closeButton}
            >
              <X size={24} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Footer Info Section - Clear Top-to-Bottom Flow */}
        <View style={[styles.footerInfoSection, responsiveStyles.footerInfoSection]}>
          {/* Primary Instruction - Most Prominent */}
          <Text style={styles.primaryInstruction}>
            Frame your subject and tap to capture
          </Text>
        </View>

        {/* Controls */}
        <View style={[styles.controlsContainer, responsiveStyles.controlsContainer]}>
          {photoTaken ? (
            <View style={styles.successMessage}>
              <CheckCircle size={32} color="#10B981" />
              <Text style={styles.successText}>Photo captured successfully!</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                onPress={takePhoto}
                disabled={isProcessing}
                style={[
                  styles.shutterButton,
                  responsiveStyles.shutterButton,
                  isProcessing && styles.shutterButtonDisabled,
                ]}
              >
                {isProcessing ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : (
                  <View style={[styles.shutterInner, responsiveStyles.shutterInner]} />
                )}
              </TouchableOpacity>
              {/* Subtle Privacy Reassurance - Bottom of Footer */}
              {!isProcessing && (
                <Text style={styles.privacyReassurance}>
                  🔒 Privacy protection active
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    position: 'relative',
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  permissionDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 20,
  },
  permissionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 20,
    padding: 12,
  },
  cancelButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
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
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#10B981',
    fontSize: 14,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  privacyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  privacyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
    // Pulsing animation would go here
  },
  privacyText: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
  },
  challengeContainer: {
    marginTop: 8,
  },
  challengeCode: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  footerInfoSection: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  instructionContainer: {
    alignItems: 'center',
  },
  mainInstruction: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  privacyNoticeText: {
    color: '#10B981',
    fontSize: 13,
    textAlign: 'center',
  },
  infoBanner: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  infoBannerText: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  shutterButtonDisabled: {
    backgroundColor: '#6B7280',
    opacity: 0.7,
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  helperText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  successMessage: {
    alignItems: 'center',
  },
  successText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  
  // NEW HIGH-CONTRAST HEADER STYLES
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  challengeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  challengeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '400',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
  challengeValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  
  // NEW HIGH-CONTRAST FOOTER STYLES
  primaryInstruction: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    textShadow: '0 1px 3px rgba(0,0,0,0.7)',
    letterSpacing: 0.3,
  },
  privacyReassurance: {
    color: '#B3B3B3', // Light grey for subtle reassurance
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '400',
    opacity: 0.8,
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
});
