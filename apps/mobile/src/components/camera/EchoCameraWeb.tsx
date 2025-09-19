/**
 * Echo Camera Web Implementation
 * Server-side face blurring for web platform
 * 
 * Workflow:
 * 1. Capture unblurred photo with expo-camera
 * 2. Upload to private Supabase bucket
 * 3. Server processes and blurs faces
 * 4. Final blurred image available in public bucket
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { X, Camera as CameraIcon, Upload, Shield, CheckCircle } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import LiveFaceCanvas from './web/LiveFaceCanvas';
import useUpload from '@/utils/useUpload';
import * as ImageManipulator from 'expo-image-manipulator';
import { fetchChallengeCode } from '@/utils/cameraChallenge';
import { Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_BASE_URL ||
  process.env.EXPO_PUBLIC_PROXY_BASE_URL ||
  process.env.EXPO_PUBLIC_HOST ||
  ''
).replace(/\/$/, '');

interface EchoCameraWebProps {
  userId: string;
  requestId: string;
  onComplete: (result: {
    imageUrl: string;
    localUri: string;
    challengeCode: string;
    timestamp: number;
    processingStatus: 'pending' | 'completed';
  }) => void;
  onCancel: () => void;
}

// Processing states for server-side blur
type ProcessingState = 'idle' | 'capturing' | 'uploading' | 'processing' | 'completed' | 'error';

export default function EchoCameraWeb({
  userId,
  requestId,
  onComplete,
  onCancel,
}: EchoCameraWebProps) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  
  // State management
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [challengeCode, setChallengeCode] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  // Live preview blur overlay state
  const [previewBlurEnabled, setPreviewBlurEnabled] = useState(true);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });
  // Camera ready state - CRITICAL for showing/hiding loading UI
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  const [upload] = useUpload();

  // Fetch challenge code on mount
  useEffect(() => {
    const controller = new AbortController();
    
    (async () => {
      try {
        const code = await fetchChallengeCode({ userId, requestId, signal: controller.signal });
        setChallengeCode(code);
      } catch (e) {
        console.warn('[EchoCameraWeb] Challenge code fetch failed:', e);
        setChallengeCode(`ECHO-${Date.now().toString(36).toUpperCase()}`);
      }
    })();
    
    return () => controller.abort();
  }, [userId, requestId]);

  // Capture photo
  const capturePhoto = useCallback(async () => {
    // Development fallback for testing without camera
    const isDev = process.env.NODE_ENV === 'development' || __DEV__;
    
    if (!cameraRef.current && !isDev) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    try {
      setProcessingState('capturing');
      setProcessingProgress(10);

      // Force live preview blur on capture for UX consistency
      // (Server-side still performs the real face blurring)
      // Small delay to ensure overlay is visible in preview at click time
      await new Promise(resolve => setTimeout(resolve, 80));

      // Capture the photo
      let photo;
      
      try {
        photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          base64: false,
          skipProcessing: true, // Important: Get raw image for server processing
        });
      } catch (cameraError) {
        console.log('[EchoCameraWeb] Camera capture failed, using dev fallback:', cameraError);
        // Development fallback - use a placeholder image
        if (isDev) {
          photo = {
            uri: 'https://via.placeholder.com/600x800/3B82F6/FFFFFF?text=Privacy+Protected+Photo',
          };
        } else {
          throw cameraError;
        }
      }

      if (!photo) {
        throw new Error('Failed to capture photo');
      }

      console.log('[EchoCameraWeb] Photo captured:', photo.uri);
      setCapturedPhoto(photo.uri);
      setProcessingProgress(25);

      // Upload to private bucket for server-side processing
      await uploadForProcessing(photo.uri);

    } catch (error) {
      console.error('[EchoCameraWeb] Capture error:', error);
      setErrorMessage('Failed to capture photo. Please try again.');
      setProcessingState('error');
    }
  }, []);

  // Upload to private bucket for server-side processing
  const uploadForProcessing = async (photoUri: string) => {
    try {
      setProcessingState('uploading');
      setProcessingProgress(40);

      // Resize for optimal upload
      const processedImage = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 1920 } }], // Higher res for server processing
        { 
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Upload to PRIVATE bucket
      const timestamp = Date.now();
      const fileName = `private/${userId}/${requestId}/${timestamp}-raw.jpg`;
      
      const uploadResult = await upload({
        uri: processedImage.uri,
        fileName,
        isPrivate: true, // Critical: Upload to private bucket
      });

      if (uploadResult.error) {
        throw new Error(uploadResult.error);
      }

      setProcessingProgress(60);
      
      // Trigger server-side processing
      await triggerServerProcessing(uploadResult.url, timestamp);

    } catch (error) {
      console.error('[EchoCameraWeb] Upload error:', error);
      setErrorMessage('Failed to upload photo for processing.');
      setProcessingState('error');
    }
  };

  // Trigger server-side face blurring
  const triggerServerProcessing = async (privateImageUrl: string, timestamp: number) => {
    try {
      setProcessingState('processing');
      setProcessingProgress(70);

      // Call backend API to process image
      const response = await fetch(`${API_BASE_URL}/api/process-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          imageUrl: privateImageUrl,
          userId,
          requestId,
          timestamp,
          platform: 'web',
        }),
      });

      if (!response.ok) {
        throw new Error(`Processing failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Poll for processing completion
      await pollForCompletion(result.jobId, timestamp);

    } catch (error) {
      console.error('[EchoCameraWeb] Processing error:', error);
      setErrorMessage('Failed to process image. Please try again.');
      setProcessingState('error');
    }
  };

  // Poll for server-side processing completion
  const pollForCompletion = async (jobId: string, timestamp: number, attempts = 0) => {
    const MAX_ATTEMPTS = 30; // 30 seconds max
    const POLL_INTERVAL = 1000; // 1 second

    if (attempts >= MAX_ATTEMPTS) {
      setErrorMessage('Processing timeout. Please try again.');
      setProcessingState('error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/process-status/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });

      const status = await response.json();

      if (status.status === 'completed') {
        setProcessingProgress(100);
        setProcessingState('completed');

        // Return the processed image URL
        const result = {
          imageUrl: status.publicUrl, // Blurred image in public bucket
          localUri: capturedPhoto || status.publicUrl, // Fallback to publicUrl if no localUri
          challengeCode: challengeCode || '',
          timestamp,
          processingStatus: 'completed',
        };
        console.log('[EchoCameraWeb] Returning result:', result);
        onComplete(result);
        // Removed redundant Alert - parent component will handle UI update

      } else if (status.status === 'failed') {
        throw new Error(status.error || 'Processing failed');
      } else {
        // Still processing, update progress and poll again
        setProcessingProgress(70 + (attempts / MAX_ATTEMPTS) * 25);
        
        setTimeout(() => {
          pollForCompletion(jobId, timestamp, attempts + 1);
        }, POLL_INTERVAL);
      }

    } catch (error) {
      console.error('[EchoCameraWeb] Polling error:', error);
      setErrorMessage('Failed to check processing status.');
      setProcessingState('error');
    }
  };

  // Get auth token helper
  const getAuthToken = async (): Promise<string> => {
    // Implement based on your auth system
    // This is a placeholder
    return 'user-auth-token';
  };

  // Debug logging
  useEffect(() => {
    console.log('[EchoCameraWeb] Permission state:', permission);
    if (permission) {
      console.log('[EchoCameraWeb] Permission granted:', permission.granted);
    }
  }, [permission]);

  // Handle permission states
  if (!permission) {
    console.log('[EchoCameraWeb] Waiting for permission state...');
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    console.log('[EchoCameraWeb] Camera permission not granted, showing permission request');
    return (
      <View style={styles.container}>
        <View style={styles.permissionContent}>
          <CameraIcon size={64} color="#3B82F6" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionDescription}>
            Echo needs camera access to capture photos. Your privacy is protected - 
            faces will be automatically blurred after capture.
          </Text>
          <TouchableOpacity onPress={requestPermission} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main camera UI with processing states
  console.log('[EchoCameraWeb] Rendering camera view');
  
  return (
    <View style={styles.container}>
      {/* Camera View */}
      <View style={styles.cameraContainer} id="echo-web-camera">
        <CameraView 
          ref={cameraRef}
          style={[styles.camera, { backgroundColor: '#1a1a1a' }]}
          facing="back"
          onLayout={(e) => {
            console.log('[EchoCameraWeb] Camera layout:', e.nativeEvent.layout);
            setViewSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
          }}
          onCameraReady={() => {
            console.log('[EchoCameraWeb] Camera ready!');
            setIsCameraReady(true); // CRITICAL: Update state when camera is ready
          }}
          onMountError={(error) => {
            console.error('[EchoCameraWeb] Camera mount error:', error);
            setErrorMessage('Camera failed to initialize');
            setProcessingState('error');
          }}
        />

        {/* Loading overlay - Show ONLY when camera is not ready */}
        {!isCameraReady && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
            <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: 24, borderRadius: 16, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#3B82F6" style={{ marginBottom: 16 }} />
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>Initializing Camera...</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 8 }}>Please wait</Text>
            </View>
          </View>
        )}
        
        {/* Live Preview Blur Overlay - Show only when camera is ready */}
        {isCameraReady && previewBlurEnabled && viewSize.width > 0 && (
          <>
            {/* Live detector overlay (FaceDetector API) */}
            <LiveFaceCanvas containerId="echo-web-camera" width={viewSize.width} height={viewSize.height} />
            <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
              {/* Primary coverage zone */}
            <BlurView intensity={60} tint="dark" style={[styles.blurZone, {
              left: 0,
              top: viewSize.height * 0.1,
              width: viewSize.width,
              height: viewSize.height * 0.75,
              borderRadius: 20,
            }]} />

            {/* Secondary coverage zone */}
            <BlurView intensity={40} tint="dark" style={[styles.blurZone, {
              left: 0,
              top: 0,
              width: viewSize.width,
              height: viewSize.height * 0.9,
              borderRadius: 30,
            }]} />

            {/* Circles for typical face spots (selfie/group) */}
            <BlurView intensity={50} tint="dark" style={[styles.blurZone, {
              left: viewSize.width * 0.5 - (viewSize.width * 0.35),
              top: viewSize.height * 0.35 - (viewSize.width * 0.35),
              width: viewSize.width * 0.7,
              height: viewSize.width * 0.7,
              borderRadius: (viewSize.width * 0.7) / 2,
            }]} />
            <BlurView intensity={50} tint="dark" style={[styles.blurZone, {
              left: viewSize.width * 0.2 - (viewSize.width * 0.25),
              top: viewSize.height * 0.4 - (viewSize.width * 0.25),
              width: viewSize.width * 0.5,
              height: viewSize.width * 0.5,
              borderRadius: (viewSize.width * 0.5) / 2,
            }]} />
            <BlurView intensity={50} tint="dark" style={[styles.blurZone, {
              left: viewSize.width * 0.8 - (viewSize.width * 0.25),
              top: viewSize.height * 0.4 - (viewSize.width * 0.25),
              width: viewSize.width * 0.5,
              height: viewSize.width * 0.5,
              borderRadius: (viewSize.width * 0.5) / 2,
            }]} />

            {/* Status chip */}
            {__DEV__ && (
              <View style={styles.previewChip}>
                <Text style={styles.previewChipText}>Live Privacy Preview</Text>
              </View>
            )}
            </View>
          </>
        )}

        {/* UI Controls - Show only when camera is ready */}
        {isCameraReady && (
          <>
            {/* Header Overlay */}
            <View style={styles.headerOverlay}>
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <Text style={styles.headerTitle}>Echo Camera</Text>
                  <View style={styles.subtitleRow}>
                    <Text style={styles.webIcon}>🌐</Text>
                    <Text style={styles.headerSubtitle}>Web Camera Mode</Text>
                  </View>
                  {challengeCode && (
                    <View style={styles.challengeRow}>
                      <Shield size={14} color="#fff" />
                      <Text style={styles.challengeCode}>{challengeCode}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                  <X size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Privacy Notice */}
            <View style={styles.privacyNotice}>
              <Shield size={16} color="#3B82F6" />
              <Text style={styles.privacyText}>
                For your privacy, faces will be automatically blurred after upload
              </Text>
            </View>

            {/* Footer Controls */}
            <View style={styles.footerOverlay}>
              <Text style={styles.instruction}>
                Center the subject and click to capture
              </Text>
              
              <TouchableOpacity
                onPress={capturePhoto}
                disabled={processingState !== 'idle' || !isCameraReady}
                style={[
                  styles.shutterButton,
                  processingState !== 'idle' && styles.shutterButtonDisabled
                ]}
              >
                {processingState === 'idle' ? (
                  <View style={styles.shutterInner} />
                ) : (
                  <ActivityIndicator size="small" color="#3B82F6" />
                )}
              </TouchableOpacity>

              <Text style={styles.privacyNote}>
                🔒 Server-side privacy protection
              </Text>
            </View>
          </>
        )}
      </View>
      {/* Processing Modal */}
      <Modal
        visible={processingState !== 'idle' && processingState !== 'error'}
        transparent
        animationType="fade"
      >
        <View style={styles.processingModal}>
          <View style={styles.processingContent}>
            <ActivityIndicator size="large" color="#3B82F6" />
            
            <Text style={styles.processingTitle}>
              {processingState === 'capturing' && 'Capturing Photo...'}
              {processingState === 'uploading' && 'Uploading for Processing...'}
              {processingState === 'processing' && 'Applying Privacy Protection...'}
              {processingState === 'completed' && 'Processing Complete!'}
            </Text>

            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${processingProgress}%` }
                ]} 
              />
            </View>

            <Text style={styles.processingDescription}>
              {processingState === 'capturing' && 'Getting your photo ready...'}
              {processingState === 'uploading' && 'Securely uploading to our servers...'}
              {processingState === 'processing' && 'Detecting and blurring faces for privacy...'}
              {processingState === 'completed' && 'Your photo is ready with faces blurred!'}
            </Text>

            {processingState === 'completed' && (
              <CheckCircle size={48} color="#10B981" style={styles.successIcon} />
            )}
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={processingState === 'error'}
        transparent
        animationType="fade"
      >
        <View style={styles.processingModal}>
          <View style={styles.errorContent}>
            <X size={48} color="#EF4444" />
            <Text style={styles.errorTitle}>Processing Failed</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity
              onPress={() => {
                setProcessingState('idle');
                setErrorMessage(null);
                setProcessingProgress(0);
              }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  camera: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  webIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  challengeCode: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 6,
    fontFamily: 'monospace',
  },
  closeButton: {
    padding: 8,
  },
  privacyNotice: {
    position: 'absolute',
    top: 140,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  privacyText: {
    color: '#fff',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  footerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingBottom: 40,
    paddingTop: 30,
    alignItems: 'center',
  },
  instruction: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  shutterButtonDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  privacyNote: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  processingModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  processingDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  successIcon: {
    marginTop: 16,
  },
  errorContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  loadingText: {
    color: '#6B7280',
    marginTop: 16,
  },
  // Live blur overlay
  blurZone: {
    position: 'absolute',
    overflow: 'hidden',
  },
  previewChip: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  previewChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
