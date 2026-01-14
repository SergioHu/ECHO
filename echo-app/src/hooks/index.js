/**
 * Hooks Index
 *
 * Central export for all custom hooks.
 */

// Supabase hooks
export { useNearbyRequests } from './useNearbyRequests';
export { useProfile } from './useProfile';
export { useCreateRequest } from './useCreateRequest';
export { useLockRequest } from './useLockRequest';
export { useSubmitPhoto } from './useSubmitPhoto';
export { useViewSession } from './useViewSession';
export { useMyActivity } from './useMyActivity';
export { useReportPhoto, DISPUTE_REASONS, DISPUTE_REASON_LABELS } from './useReportPhoto';

// Admin hooks
export { useAdminStats } from './useAdminStats';
export { useAdminDisputes } from './useAdminDisputes';
export { useAdminUsers } from './useAdminUsers';
export { useAdminPhotos } from './useAdminPhotos';
export { useAdminAnalytics } from './useAdminAnalytics';

// UI hooks
export { useKeyboardFooterOffset } from './useKeyboardFooterOffset';

