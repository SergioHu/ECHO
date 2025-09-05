export default {
  expo: {
    name: 'LocalSight',
    slug: 'localsight',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      config: {
        googleMapsApiKey: 'AIzaSyBvWnoXd8SmqKGrXP8yL7wag_13sVnUPcM'
      }
    },
    android: {
      config: {
        googleMaps: {
          apiKey: 'AIzaSyBvWnoXd8SmqKGrXP8yL7wag_13sVnUPcM'
        }
      }
    },
    plugins: [
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'This app uses location to show nearby questions and help you ask location-specific questions.'
        }
      ]
    ]
  }
};