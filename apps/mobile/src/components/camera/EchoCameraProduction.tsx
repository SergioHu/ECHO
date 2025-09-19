/**
 * Echo Camera Production Component
 * Platform-aware camera selection with proper separation of concerns
 * 
 * Mobile: Real-time on-device face blurring with VisionCamera
 * Web: Server-side face blurring with expo-camera
 */

import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Type definitions
export interface CameraResult {
  imageUrl: string;
  localUri: string;
  challengeCode: string;
  timestamp: number;
  processingStatus?: 'pending' | 'completed';
  platform: 'mobile' | 'web' | 'expo-go';
}

export interface EchoCameraProps {
  userId: string;
  requestId: string;
  onComplete: (result: CameraResult) => void;
  onCancel: () => void;
  testMode?: boolean; // For development testing
}

/**
 * Platform detection utility
 */
const getPlatformInfo = () => {
  const isExpoGo = Constants.appOwnership === 'expo';
  const isWeb = Platform.OS === 'web';
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  
  if (isWeb) {
    return {
      platform: 'web' as const,
      implementation: 'server-side',
      requiresDevBuild: false,
    };
  }
  
  if (isExpoGo) {
    return {
      platform: 'expo-go' as const,
      implementation: 'fallback',
      requiresDevBuild: false,
    };
  }
  
  if (isIOS || isAndroid) {
    return {
      platform: 'mobile' as const,
      implementation: 'on-device',
      requiresDevBuild: true,
    };
  }
  
  // Default fallback
  return {
    platform: 'web' as const,
    implementation: 'server-side',
    requiresDevBuild: false,
  };
};

/**
 * Main production camera component
 */
export default function EchoCameraProduction(props: EchoCameraProps) {
  const platformInfo = useMemo(() => getPlatformInfo(), []);
  
  // Log platform selection in development
  if (__DEV__) {
    console.log('[EchoCameraProduction] Platform detection:', {
      ...platformInfo,
      os: Platform.OS,
      expoConstants: {
        appOwnership: Constants.appOwnership,
        executionEnvironment: Constants.executionEnvironment,
      },
    });
  }
  
  // Platform-specific component selection
  const CameraComponent = useMemo(() => {
    switch (platformInfo.platform) {
      case 'web':
        // Web: Server-side processing
        return React.lazy(() => import('./EchoCameraWeb'));
        
      case 'expo-go':
        // Expo Go: Fallback with expo-camera (no real-time blur)
        return React.lazy(() => import('./EchoCameraExpoGo'));
        
      case 'mobile':
        // Mobile: On-device real-time blur
        if (platformInfo.requiresDevBuild && !props.testMode) {
          // Production mobile camera with VisionCamera
          return React.lazy(() => import('./EchoCameraMobile'));
        } else {
          // Test mode fallback
          return React.lazy(() => import('./EchoCameraExpoGo'));
        }
        
      default:
        // Default to web implementation
        return React.lazy(() => import('./EchoCameraWeb'));
    }
  }, [platformInfo, props.testMode]);
  
  // Wrap props with platform information
  const enhancedProps = useMemo(() => ({
    ...props,
    onComplete: (result: Omit<CameraResult, 'platform'>) => {
      props.onComplete({
        ...result,
        platform: platformInfo.platform,
      });
    },
  }), [props, platformInfo.platform]);
  
  return (
    <React.Suspense fallback={<CameraLoadingScreen />}>
      <CameraComponent {...enhancedProps} />
    </React.Suspense>
  );
}

/**
 * Loading screen component
 */
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

function CameraLoadingScreen() {
  return (
    <View style={loadingStyles.container}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={loadingStyles.text}>Loading camera...</Text>
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
});

/**
 * Export platform utilities for external use
 */
export { getPlatformInfo };

/**
 * Export camera implementations for direct use if needed
 */
export const CameraImplementations = {
  Mobile: React.lazy(() => import('./EchoCameraMobile')),
  Web: React.lazy(() => import('./EchoCameraWeb')),
  ExpoGo: React.lazy(() => import('./EchoCameraExpoGo')),
};