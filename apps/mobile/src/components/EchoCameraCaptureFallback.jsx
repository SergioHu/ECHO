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
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
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

// Fallback component for Expo Go - uses expo-camera instead of vision-camera
export default function EchoCameraCaptureFallback({
  userId,
  requestId,
  onComplete,
  onCancel,
}) {
  const cameraRef = useRef(null);
  const viewRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [challengeCode, setChallengeCode] = useState(null);
  
  const [upload] = useUpload();

  // Take photo using view-shot (consistent with VisionCamera approach)
  const takePhoto = useCallback(async () => {
    if (!viewRef.current) {
      Alert.alert('Error', 'Camera view not ready');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Capture the rendered view (consistent approach with VisionCamera version)
      const uri = await captureRef(viewRef.current, {
        format: 'jpg',
        quality: 0.9,
        result: 'tmpfile',
      });

      console.log('View captured (fallback mode):', uri);
      
      // Process and upload the photo
      await processAndUploadPhoto(uri);
      
      setPhotoTaken(true);
      
    } catch (error) {
      console.error('Error capturing view:', error);
      Alert.alert('Capture Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Process and upload the photo
  const processAndUploadPhoto = async (photoUri) => {
    try {
      // Resize image for optimal upload size while maintaining quality
      const processedImage = await ImageManipulator.manipulateAsync(
        photoUri,
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
        'Photo captured successfully.',
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

  // Fetch challenge code on mount
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const code = await fetchChallengeCode({ userId, requestId, signal: controller.signal });
        setChallengeCode(code);
      } catch (e) {
        // fallback handled in util
      }
    })();
    return () => controller.abort();
  }, [userId, requestId]);

  // Handle permission states
  if (!permission) {
    return (
      <View style={[styles.permissionContainer, getResponsiveCameraStyles().rootContainer]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.permissionTitle}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
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

  // Get responsive styles
  const responsiveStyles = getResponsiveCameraStyles();
  const showDevWarnings = shouldShowDevWarnings();
  const isWeb = Platform.OS === 'web';

  return (
    <View style={[styles.rootContainer, responsiveStyles.rootContainer]}>
      <View style={[styles.cameraContainer, responsiveStyles.cameraContainer]} ref={viewRef}>
        <CameraView 
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        >
          {/* Header Overlay - Crystal Clear Hierarchy */}
          <View style={[styles.headerOverlay, responsiveStyles.headerOverlay]}>
            <View style={styles.headerTopRow}>
              <View style={styles.headerTitleSection}>
                {/* Primary Title - Bold and Prominent */}
                <Text style={[styles.headerTitle, responsiveStyles.headerTitle]}>Echo Camera</Text>
                
                {/* Subtitle - Smaller, Regular Weight */}
                <View style={styles.subtitleRow}>
                  {isWeb && <Text style={styles.modeIcon}>🌐</Text>}
                  <Text style={[styles.headerSubtitle, responsiveStyles.headerSubtitle]}>
                    {isWeb ? 'Web Camera Mode' : 'Mobile Camera'}
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
              Center the subject and click to capture
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
        </CameraView>
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
  camera: {
    flex: 1,
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTitleSection: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  challengeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  challengeLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginRight: 6,
  },
  challengeCode: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
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
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    marginBottom: 12,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  helperText: {
    color: '#E5E7EB',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
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
