const { withInfoPlist, withEntitlementsPlist } = require('@expo/config-plugins');

/**
 * Expo config plugin to configure react-native-vision-camera for iOS
 */
const withVisionCamera = (config) => {
  // Add camera usage description to Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults.NSCameraUsageDescription = 
      config.modResults.NSCameraUsageDescription || 
      'Echo needs camera access to capture privacy-protected photos with real-time face blurring.';
    
    // Add microphone usage for video recording (required by vision-camera)
    config.modResults.NSMicrophoneUsageDescription = 
      config.modResults.NSMicrophoneUsageDescription || 
      'Echo needs microphone access for video features.';
    
    // Add photo library usage for saving photos
    config.modResults.NSPhotoLibraryUsageDescription = 
      config.modResults.NSPhotoLibraryUsageDescription || 
      'Echo needs photo library access to save captured photos.';
    
    config.modResults.NSPhotoLibraryAddUsageDescription = 
      config.modResults.NSPhotoLibraryAddUsageDescription || 
      'Echo needs permission to save photos to your library.';
    
    return config;
  });

  // Enable required capabilities
  config = withEntitlementsPlist(config, (config) => {
    // Enable camera access
    config.modResults['com.apple.security.device.camera'] = true;
    
    return config;
  });

  return config;
};

module.exports = withVisionCamera;
