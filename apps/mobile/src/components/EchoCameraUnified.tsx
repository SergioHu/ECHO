import React from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Import the web fallback component
import EchoCameraCaptureFallback from './EchoCameraCapture';

interface EchoCameraUnifiedProps {
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

/**
 * Unified Echo Camera Component
 * 
 * This component intelligently selects the appropriate camera implementation:
 * - Mobile (iOS/Android): Uses EchoCameraPro with VisionCamera + real-time face blurring
 * - Web: Uses EchoCameraCaptureFallback with expo-camera (graceful degradation)
 * - Expo Go: Uses fallback (VisionCamera not supported in Expo Go)
 */
export default function EchoCameraUnified(props: EchoCameraUnifiedProps) {
  const isExpoGo = Constants.appOwnership === 'expo';
  const isWeb = Platform.OS === 'web';
  
  // Development logging
  if (__DEV__) {
    console.log('[EchoCameraUnified] Platform detection:', {
      platform: Platform.OS,
      isExpoGo,
      isWeb,
      selectedImplementation: isWeb || isExpoGo ? 'Fallback (expo-camera)' : 'Pro (VisionCamera)'
    });
  }
  
  // Use fallback for web and Expo Go environments
  if (isWeb || isExpoGo) {
    return <EchoCameraCaptureFallback {...props} />;
  }
  
  // Use VisionCamera implementation for native mobile builds
  try {
    // Use dynamic require to avoid bundling VisionCamera on web
    const EchoCameraPro = Platform.OS === 'web' 
      ? require('./EchoCameraPro.web').default
      : require('./EchoCameraPro').default;
    return <EchoCameraPro {...props} />;
  } catch (error) {
    // Fallback if VisionCamera fails to initialize
    console.warn('[EchoCameraUnified] VisionCamera failed, using fallback:', error);
    return <EchoCameraCaptureFallback {...props} />;
  }
}