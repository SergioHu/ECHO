// Web polyfill for react-native-vision-camera
// This prevents VisionCamera from being bundled on web

export const Camera = () => {
  throw new Error('VisionCamera is not supported on web');
};

export const useCameraDevice = () => {
  throw new Error('VisionCamera is not supported on web');
};

export const useCameraPermission = () => {
  throw new Error('VisionCamera is not supported on web');
};

export const useCameraFormat = () => {
  throw new Error('VisionCamera is not supported on web');
};

export const useSkiaFrameProcessor = () => {
  throw new Error('VisionCamera is not supported on web');
};

export const useFaceDetector = () => {
  throw new Error('VisionCamera is not supported on web');
};

// Default export for compatibility
const VisionCamera = {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCameraFormat,
  useSkiaFrameProcessor,
  useFaceDetector,
};

export default VisionCamera;