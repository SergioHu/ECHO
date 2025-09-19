// Web polyfill for react-native-worklets-core
// This prevents worklets-core from trying to access native modules on web

export const Worklets = {
  createRunOnJS: (fn: any) => fn,
  createRunInContext: (fn: any) => fn,
  createSharedValue: (value: any) => ({ value }),
  createContext: () => ({}),
  getCurrentThreadId: () => 'web-thread',
  runOnJS: (fn: any) => fn,
  runOnUI: (fn: any) => fn,
};

export const useWorklet = (fn: any) => fn;
export const useRunOnJS = (fn: any) => fn;
export const useSharedValue = (value: any) => ({ value });

// Mock NativeWorklets
export const NativeWorklets = {
  getEnforcing: () => false,
  install: () => {},
};

export default {
  Worklets,
  useWorklet,
  useRunOnJS,
  useSharedValue,
  NativeWorklets,
};