import React from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Import the fallback camera that works in Expo Go
import EchoCameraCaptureFallback from './EchoCameraCaptureFallback';

// Determine if we're running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Component wrapper that selects the appropriate camera implementation
export default function EchoCameraWrapper(props) {
  // Always use fallback in Expo Go or if VisionCamera is not available
  if (isExpoGo || Platform.OS === 'web') {
    console.log('Using Expo Camera fallback (Expo Go or Web environment)');
    return <EchoCameraCaptureFallback {...props} />;
  }

  // Try to use VisionCamera in development/production builds
  try {
    const EchoCameraCapture = require('./EchoCameraCapture').default;
    console.log('Using VisionCamera with real-time face blurring');
    return <EchoCameraCapture {...props} />;
  } catch (error) {
    console.log('VisionCamera not available, falling back to Expo Camera:', error.message);
    return <EchoCameraCaptureFallback {...props} />;
  }
}
