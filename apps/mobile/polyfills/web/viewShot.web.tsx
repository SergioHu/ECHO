// Web polyfill for react-native-view-shot
// This provides a web-compatible implementation

export const captureRef = async (ref: any, options: any = {}) => {
  // For web, we'll return a dummy URI since we can't capture native views
  // The expo-camera on web will handle its own capture mechanism
  console.warn('[captureRef] View capture is not fully supported on web, using fallback');
  
  // Return a data URI placeholder
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
};

export const captureScreen = async (options: any = {}) => {
  console.warn('[captureScreen] Screen capture is not supported on web');
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
};

export const releaseCapture = (uri: string) => {
  // No-op on web
};

export default {
  captureRef,
  captureScreen,
  releaseCapture,
};