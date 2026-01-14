/**
 * useReportPhoto - Hook to report a photo and create a dispute
 *
 * Calls the report_photo RPC function which:
 * - Creates an entry in the disputes table
 * - Updates the photo's is_reported flag
 * - Changes the request status to 'disputed'
 */

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Valid dispute reasons (must match dispute_reason enum in database)
export const DISPUTE_REASONS = {
    WRONG_LOCATION: 'wrong_location',
    POOR_QUALITY: 'poor_quality',
    WRONG_SUBJECT: 'wrong_subject',
    INAPPROPRIATE: 'inappropriate',
    OTHER: 'other',
};

// Human-readable labels for dispute reasons
export const DISPUTE_REASON_LABELS = {
    wrong_location: 'Wrong Location',
    poor_quality: 'Poor Quality',
    wrong_subject: 'Wrong Subject',
    inappropriate: 'Inappropriate Content',
    other: 'Other',
};

export const useReportPhoto = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Report a photo
     * @param {string} photoId - UUID of the photo to report
     * @param {string} reason - One of DISPUTE_REASONS values
     * @param {string} description - Optional detailed description
     * @returns {Promise<{success: boolean, disputeId?: string, error?: string}>}
     */
    const reportPhoto = useCallback(async (photoId, reason, description = null) => {
        if (!user?.id) {
            const err = 'Not authenticated';
            setError(err);
            return { success: false, error: err };
        }

        if (!photoId) {
            const err = 'Photo ID is required';
            setError(err);
            return { success: false, error: err };
        }

        if (!reason || !Object.values(DISPUTE_REASONS).includes(reason)) {
            const err = 'Valid reason is required';
            setError(err);
            return { success: false, error: err };
        }

        try {
            setLoading(true);
            setError(null);

            console.log('🚨 Reporting photo:', { photoId, reason, description });

            const { data, error: rpcError } = await supabase.rpc('report_photo', {
                p_photo_id: photoId,
                p_reason: reason,
                p_description: description,
            });

            if (rpcError) {
                console.error('❌ Report photo RPC error:', rpcError);
                setError(rpcError.message);
                return { success: false, error: rpcError.message };
            }

            console.log('📥 Report photo response:', data);

            if (!data?.success) {
                const errMsg = data?.error || 'Failed to report photo';
                setError(errMsg);
                return { success: false, error: errMsg };
            }

            return {
                success: true,
                disputeId: data.dispute_id,
                message: data.message,
            };
        } catch (err) {
            console.error('❌ Unexpected error reporting photo:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    return {
        reportPhoto,
        loading,
        error,
        DISPUTE_REASONS,
        DISPUTE_REASON_LABELS,
    };
};

export default useReportPhoto;

