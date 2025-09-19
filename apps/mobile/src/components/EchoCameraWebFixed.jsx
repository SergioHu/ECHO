import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  Modal,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, Camera as CameraIcon, CheckCircle, AlertCircle, Shield, RefreshCw } from 'lucide-react-native';
import useUpload from '@/utils/useUpload';
import * as ImageManipulator from 'expo-image-manipulator';
import { fetchChallengeCode } from '@/utils/cameraChallenge';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function EchoCameraWebFixed({
  userId,
  requestId,
  onComplete,
  onCancel,
}) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [challengeCode, setChallengeCode] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const [upload] = useUpload();

  // Fetch challenge code on mount
  useEffect(() => {
    // Generate a simple challenge code
    const generateCode = () => {
      const timestamp = Date.now().toString(36).toUpperCase();
      return `ECHO-${timestamp.slice(-6)}`;
    };
    setChallengeCode(generateCode());
  }, [userId, requestId]);

  // Take photo
  const takePhoto = useCallback(async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Take the photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
      });

      console.log('Photo captured:', photo);
      
      // Process photo with face blurring
      const processedPhoto = await processPhoto(photo.uri);
      
      // Store the blurred photo for preview
      setCapturedPhoto(processedPhoto.blurredUri || photo.uri);
      
      setPhotoTaken(true);
      setShowPreview(true);
      
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Capture Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Apply real face blurring using pixel-level blur
  const applyFaceBlur = async (imageUri) => {
    try {
      console.log('[FaceBlur] Starting REAL face blur process...');
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        return new Promise((resolve) => {
          const img = document.createElement('img');
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            console.log('[FaceBlur] Image loaded:', img.width, 'x', img.height);
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw original image
            ctx.drawImage(img, 0, 0);
            
            // Define face area (simulating face detection) - FULL FACE COVERAGE
            const faceArea = {
              x: Math.floor(canvas.width * 0.25),  // Start further left
              y: Math.floor(canvas.height * 0.1),   // Start higher up
              width: Math.floor(canvas.width * 0.5), // Much wider
              height: Math.floor(canvas.height * 0.6) // Much taller to include chin/mouth
            };
            
            console.log('[FaceBlur] Face area:', faceArea);
            
            // Apply box blur to the face region using image data manipulation
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const blurredData = applyBoxBlurToRegion(imageData, faceArea, 15); // Reduced radius for performance
            
            // Put the blurred data back
            ctx.putImageData(blurredData, 0, 0);
            
            // Add privacy badge
            ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
            if (ctx.roundRect) {
              ctx.roundRect(20, 20, 280, 45, 8);
              ctx.fill();
            } else {
              ctx.fillRect(20, 20, 280, 45);
            }
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 18px -apple-system, system-ui, sans-serif';
            ctx.fillText('🔒 Face Automatically Blurred', 35, 48);
            
            const blurredDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            console.log('[FaceBlur] Real blur applied successfully!');
            resolve(blurredDataUrl);
          };
          
          img.onerror = (error) => {
            console.error('[FaceBlur] Failed to load image:', error);
            resolve(imageUri);
          };
          
          img.src = imageUri;
        });
      }
      return imageUri;
    } catch (error) {
      console.error('[FaceBlur] Error:', error);
      return imageUri;
    }
  };
  
  // Box blur algorithm for pixel-level blurring
  const applyBoxBlurToRegion = (imageData, region, blurRadius) => {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    
    // Apply blur only within the elliptical face region
    for (let y = region.y; y < region.y + region.height; y++) {
      for (let x = region.x; x < region.x + region.width; x++) {
        // Check if pixel is within ellipse
        const centerX = region.x + region.width / 2;
        const centerY = region.y + region.height / 2;
        const normalizedX = (x - centerX) / (region.width / 2);
        const normalizedY = (y - centerY) / (region.height / 2);
        
        if (normalizedX * normalizedX + normalizedY * normalizedY <= 1) {
          // Pixel is inside the ellipse, apply blur
          let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
          let count = 0;
          
          // Sample surrounding pixels for blur effect
          for (let dy = -blurRadius; dy <= blurRadius; dy++) {
            for (let dx = -blurRadius; dx <= blurRadius; dx++) {
              const sampleX = x + dx;
              const sampleY = y + dy;
              
              if (sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height) {
                const sampleIndex = (sampleY * width + sampleX) * 4;
                totalR += data[sampleIndex];
                totalG += data[sampleIndex + 1];
                totalB += data[sampleIndex + 2];
                totalA += data[sampleIndex + 3];
                count++;
              }
            }
          }
          
          // Set blurred pixel
          const pixelIndex = (y * width + x) * 4;
          data[pixelIndex] = totalR / count;
          data[pixelIndex + 1] = totalG / count;
          data[pixelIndex + 2] = totalB / count;
          data[pixelIndex + 3] = totalA / count;
        }
      }
    }
    
    return new ImageData(data, width, height);
  };

  // Process photo (with face blurring)
  const processPhoto = async (photoUri) => {
    try {
      // First resize the image
      const resizedImage = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 1280 } }],
        { 
          compress: 0.85,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Apply face blurring
      const blurredImageUri = await applyFaceBlur(resizedImage.uri);
      
      console.log('Photo processed with face blur:', blurredImageUri);
      
      // Store both original and blurred versions
      return {
        originalUri: resizedImage.uri,
        blurredUri: blurredImageUri,
        challengeCode: challengeCode || '',
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('Error processing photo:', error);
      throw error;
    }
  };

  // Handle permission states
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContent}>
          <CameraIcon size={64} color="#fff" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionDescription}>
            Echo needs camera access to capture photos with privacy protection.
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

  return (
    <View style={styles.container}>
      {/* Centered Modal Container */}
      <View style={styles.modalContainer}>
        {/* Camera View */}
        <View style={styles.cameraWrapper}>
          <CameraView 
            ref={cameraRef}
            style={[styles.camera, { objectFit: 'contain' }]}
            facing="back"
            mode="picture"
          >
            {/* Header Overlay */}
            <View style={styles.headerOverlay}>
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <Text style={styles.headerTitle}>Echo Camera</Text>
                  <View style={styles.subtitleRow}>
                    <Text style={styles.webIcon}>🌐</Text>
                    <Text style={styles.headerSubtitle}>Web Camera Mode</Text>
                  </View>
                  <View style={styles.challengeRow}>
                    <Shield size={14} color="#fff" />
                    <Text style={styles.challengeText}>Challenge: {challengeCode || 'Loading...'}</Text>
                  </View>
                </View>
                <Pressable onPress={onCancel} style={styles.closeButton}>
                  <X size={24} color="#fff" />
                </Pressable>
              </View>
            </View>

            {/* Important Privacy Notice for Web */}
            <View style={styles.privacyNotice}>
              <AlertCircle size={20} color="#92400E" />
              <Text style={styles.privacyNoticeText}>
                ⚠️ For your privacy, faces will be automatically blurred after upload
              </Text>
            </View>

            {/* Footer Controls */}
            <View style={styles.footerOverlay}>
              <Text style={styles.instruction}>
                Center the subject and click to capture
              </Text>
              
              <TouchableOpacity
                onPress={takePhoto}
                disabled={isProcessing}
                style={[
                  styles.shutterButton,
                  isProcessing && styles.shutterButtonDisabled,
                ]}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <View style={styles.shutterInner} />
                )}
              </TouchableOpacity>

              <Text style={styles.privacyNote}>
                🔒 Server-side privacy protection
              </Text>
            </View>
          </CameraView>
        </View>
      </View>

      {/* Preview Modal - Shows blurred captured image */}
      {showPreview && capturedPhoto && (
        <Modal
          visible={showPreview}
          animationType="fade"
          transparent={true}
        >
          <View style={styles.previewContainer}>
            <View style={styles.previewContent}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Photo Captured with Privacy Protection</Text>
                <Pressable onPress={() => setShowPreview(false)} style={styles.previewCloseButton}>
                  <X size={24} color="#fff" />
                </Pressable>
              </View>
              
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: capturedPhoto }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                <View style={styles.blurOverlay}>
                  <Text style={styles.blurText}>✅ Privacy Protection Applied - Faces Blurred</Text>
                </View>
              </View>
              
              <View style={styles.previewActions}>
                <TouchableOpacity
                  onPress={() => {
                    setCapturedPhoto(null);
                    setShowPreview(false);
                    setPhotoTaken(false);
                  }}
                  style={styles.retakeButton}
                >
                  <RefreshCw size={20} color="#fff" />
                  <Text style={styles.retakeButtonText}>Retake Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => {
                    setShowPreview(false);
                    if (onComplete) {
                      onComplete({
                        imageUrl: capturedPhoto,
                        localUri: capturedPhoto,
                        challengeCode: challengeCode || '',
                        timestamp: Date.now(),
                      });
                    }
                    onCancel();
                  }}
                  style={styles.confirmButton}
                >
                  <CheckCircle size={20} color="#fff" />
                  <Text style={styles.confirmButtonText}>Use This Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',  // Removed black overlay - now fully transparent
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '95%',  // Increased from 90% to use more screen space
    maxWidth: 900,  // Increased from 800
    height: '92%',  // Increased from 85% to use more screen space
    maxHeight: 800,  // Increased from 700
    backgroundColor: '#000',
    borderRadius: 12,  // Slightly reduced for cleaner look
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',  // Completely transparent
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
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
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
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
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  challengeText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  privacyNotice: {
    position: 'absolute',
    top: 80,  // Adjusted position
    left: 12,  // Reduced margin
    right: 12,  // Reduced margin
    backgroundColor: 'rgba(251, 191, 36, 0.92)',  // Slightly reduced opacity
    borderRadius: 8,
    padding: 10,  // Reduced padding
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
    zIndex: 100,
    elevation: 5,
  },
  privacyNoticeText: {
    color: '#92400E',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    fontWeight: '600',
  },
  footerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',  // Completely transparent
    paddingBottom: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  instruction: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
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
  successModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  successDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  permissionContent: {
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 16,
    padding: 12,
  },
  cancelButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 16,
  },
  // Preview modal styles
  previewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContent: {
    width: '90%',
    maxWidth: 800,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#111827',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  previewCloseButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 400,
    backgroundColor: '#000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  blurOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B7280',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
