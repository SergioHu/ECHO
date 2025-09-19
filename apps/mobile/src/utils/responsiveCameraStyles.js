import { Platform, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Detect if we're on a desktop/tablet sized screen
export const isDesktopSize = () => {
  if (Platform.OS === 'web') {
    return screenWidth > 768; // Standard tablet breakpoint
  }
  return false;
};

// Get responsive container dimensions for camera
export const getCameraContainerDimensions = () => {
  if (!isDesktopSize()) {
    // Mobile: full screen
    return {
      width: screenWidth,
      height: screenHeight,
      maxWidth: null,
      maxHeight: null,
    };
  }

  // Desktop/Web: constrained container
  const maxWidth = Math.min(800, screenWidth * 0.9);
  const maxHeight = Math.min(600, screenHeight * 0.8);
  
  // Maintain 4:3 aspect ratio for camera
  const aspectRatio = 4 / 3;
  let width = maxWidth;
  let height = width / aspectRatio;
  
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  
  return {
    width,
    height,
    maxWidth: width,
    maxHeight: height,
  };
};

// Get responsive styles for camera components
export const getResponsiveCameraStyles = () => {
  const isWeb = Platform.OS === 'web';
  const isDesktop = isDesktopSize();
  const dimensions = getCameraContainerDimensions();
  
  return {
    // Root container for entire camera view
    rootContainer: {
      flex: 1,
      backgroundColor: isDesktop ? 'rgba(0, 0, 0, 0.9)' : '#000',
      ...(isDesktop && {
        justifyContent: 'center',
        alignItems: 'center',
      }),
    },
    
    // Camera container (constrained on web)
    cameraContainer: {
      ...(isDesktop ? {
        width: dimensions.width,
        height: dimensions.height,
        maxWidth: dimensions.maxWidth,
        maxHeight: dimensions.maxHeight,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
        // Add shadow for desktop
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 20,
      } : {
        flex: 1,
        width: screenWidth,
        height: screenHeight,
      }),
    },
    
    // Header styles
    headerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      paddingTop: isDesktop ? 20 : 50,
      paddingHorizontal: 20,
      paddingBottom: 16,
      zIndex: 100,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.1)',
      ...(isDesktop && {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
      }),
    },
    
    // Controls container at bottom
    controlsContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
      paddingTop: isDesktop ? 20 : 24,
      paddingBottom: isDesktop ? 30 : 40,
      paddingHorizontal: 20,
      alignItems: 'center',
      ...(isDesktop && {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
      }),
    },
    
    // Shutter button styles - STRONGER CTA DESIGN
    shutterButton: {
      width: isDesktop ? 68 : 76,
      height: isDesktop ? 68 : 76,
      borderRadius: isDesktop ? 34 : 38,
      backgroundColor: '#FFFFFF', // Solid white for maximum contrast
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: isDesktop ? 4 : 4,
      borderColor: '#3B82F6', // Blue outer ring for brand accent
      marginBottom: isDesktop ? 12 : 16,
      // Enhanced shadows for depth and prominence
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      ...(Platform.select({
        web: {
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          ':hover': {
            transform: 'scale(1.05)',
            backgroundColor: '#2563EB',
          },
        },
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 12,
        },
      })),
    },
    
    shutterInner: {
      width: isDesktop ? 52 : 60,
      height: isDesktop ? 52 : 60,
      borderRadius: isDesktop ? 26 : 30,
      backgroundColor: '#3B82F6', // Blue inner circle for clear action indicator
    },
    
    // Footer info section positioning
    footerInfoSection: {
      position: 'absolute',
      bottom: isDesktop ? 100 : 140,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      paddingVertical: isDesktop ? 12 : 16,
      paddingHorizontal: 20,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.1)',
      ...(isDesktop && {
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        borderRight: '1px solid rgba(255,255,255,0.1)',
      }),
    },
    
    // Legacy info banner (kept for compatibility)
    infoBanner: {
      position: 'absolute',
      bottom: isDesktop ? 120 : 180,
      left: 20,
      right: 20,
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: '#10B981',
      ...(isDesktop && {
        maxWidth: 400,
        alignSelf: 'center',
        left: '50%',
        transform: [{ translateX: -200 }],
      }),
    },
    
    // Development warning styles
    devWarning: {
      backgroundColor: 'rgba(245, 158, 11, 0.2)',
      borderColor: '#F59E0B',
      borderWidth: 1,
      borderRadius: 6,
      padding: 8,
      marginTop: 8,
      ...(isDesktop && {
        maxWidth: 300,
      }),
    },
    
    // Desktop-specific button styles
    desktopButton: isDesktop ? {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: '#3B82F6',
      ...(Platform.OS === 'web' && {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }),
    } : {},
    
    // Text adjustments for desktop - HIGH CONTRAST REDESIGN
    headerTitle: {
      color: '#FFFFFF',
      fontSize: isDesktop ? 22 : 24,
      fontWeight: '700',
      marginBottom: 6,
      letterSpacing: 0.5,
      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
    },
    
    headerSubtitle: {
      color: '#FFFFFF', // Changed from green to white for contrast
      fontSize: isDesktop ? 14 : 15,
      fontWeight: '400', // Reduced weight to create hierarchy
      opacity: 0.9,
      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    },
    
    helperText: {
      color: '#FFFFFF', // Changed to pure white for maximum contrast
      fontSize: isDesktop ? 14 : 15,
      textAlign: 'center',
      fontWeight: '600',
      letterSpacing: 0.3,
      textShadow: '0 1px 3px rgba(0,0,0,0.7)',
    },
  };
};

// Check if development warnings should be shown
export const shouldShowDevWarnings = () => {
  // Only show in development mode and never on web production
  if (Platform.OS === 'web' && process.env.NODE_ENV === 'production') {
    return false;
  }
  return __DEV__;
};

// Get platform-specific camera permission messages
export const getCameraPermissionMessage = () => {
  if (Platform.OS === 'web') {
    return {
      title: 'Browser Camera Access Required',
      description: 'Please allow camera access in your browser settings to continue.',
      buttonText: 'Check Browser Settings',
      errorMessage: 'No camera found. Please check your browser settings and ensure a camera is connected.',
    };
  }
  
  return {
    title: 'Camera access required for taking photos',
    description: 'We need access to your camera to capture photos.',
    buttonText: 'Grant Permission',
    errorMessage: 'Camera permission denied. Please enable it in your device settings.',
  };
};