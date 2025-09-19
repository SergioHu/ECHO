export default {
  expo: {
    name: 'Echo',
    slug: 'echo',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    assetBundlePatterns: ['**/*'],
    icon: './assets/images/icon.png',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: 'Echo needs camera access to capture privacy-protected photos with real-time face blurring.',
        NSMicrophoneUsageDescription: 'Echo needs microphone access for video features.',
        NSPhotoLibraryUsageDescription: 'Echo needs photo library access to save captured photos.',
        NSPhotoLibraryAddUsageDescription: 'Echo needs permission to save photos to your library.'
      }
    },
    android: {
      package: 'com.anonymous.echo',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      permissions: [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_EXTERNAL_STORAGE'
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    },
    plugins: [
      [
        'expo-router',
        {
          sitemap: false
        }
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'This app uses location to show nearby questions and help you ask location-specific questions.'
        }
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'This app uses the camera to capture privacy-protected photos for answering location-based questions.'
        }
      ],
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static'
          },
          android: {
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            minSdkVersion: 26
          }
        }
      ],
      './plugins/withVisionCamera'
    ],
    web: {
      bundler: 'metro',
      favicon: './assets/images/favicon.png'
    },
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {
        origin: false
      }
    },
    runtimeVersion: {
      policy: 'appVersion'
    }
  }
};
