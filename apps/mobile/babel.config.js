module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for react-native-worklets-core (frame processors)
      'react-native-worklets-core/plugin',
      // Required for react-native-reanimated
      'react-native-reanimated/plugin',
    ],
  };
};
