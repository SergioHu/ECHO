/**
 * useAdminDisputes - Hook to fetch and manage disputes for admin review
 * 
 * Returns all disputes with photo and request details.
 * Only accessible by admin/reviewer roles.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const useAdminDisputes = (filterStatus = null) => {
    const { user, profile } = useAuth();
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isAdmin = profile?.role === 'admin' || profile?.role === 'reviewer';

    const fetchDisputes = useCallback(async () => {
        if (!user?.id || !isAdmin) {
            setDisputes([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: rpcError } = await supabase.rpc('get_admin_disputes', {
                p_status: filterStatus,
            });

            if (rpcError) {
                console.error('Error fetching disputes:', rpcError);
                setError(rpcError);
                return;
            }

            // Generate signed URLs for photos and map dispute_id to id
            const disputesWithPhotos = await Promise.all(
                (data || []).map(async (dispute) => {
                    // Map dispute_id to id for backwards compatibility
                    const normalizedDispute = {
                        ...dispute,
                        id: dispute.dispute_id || dispute.id,
                    };

                    if (dispute.photo_url) {
                        try {
                            const { data: urlData, error: urlError } = await supabase.storage
                                .from('echo-photos')
                                .createSignedUrl(dispute.photo_url, 600); // 10 minutes

                            if (!urlError && urlData?.signedUrl) {
                                return { ...normalizedDispute, photoUri: urlData.signedUrl };
                            }
                        } catch (err) {
                            console.error('Error getting signed URL for dispute:', err);
                        }
                    }
                    return { ...normalizedDispute, photoUri: null };
                })
            );

            setDisputes(disputesWithPhotos);
        } catch (err) {
            console.error('Disputes fetch error:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [user?.id, isAdmin, filterStatus]);

    const resolveDispute = useCallback(async (disputeId, resolution, reject = false) => {
        if (!isAdmin) {
            return { success: false, error: 'Unauthorized' };
        }

        try {
            const { data, error: rpcError } = await supabase.rpc('resolve_dispute', {
                p_dispute_id: disputeId,
                p_resolution: resolution,
                p_reject: reject,
            });

            if (rpcError) {
                console.error('Error resolving dispute:', rpcError);
                return { success: false, error: rpcError };
            }

            // Refetch disputes after resolution
            await fetchDisputes();

            return { success: true, data };
        } catch (err) {
            console.error('Resolve dispute error:', err);
            return { success: false, error: err };
        }
    }, [isAdmin, fetchDisputes]);

    useEffect(() => {
        fetchDisputes();
    }, [fetchDisputes]);

    return {
        disputes,
        loading,
        error,
        refetch: fetchDisputes,
        resolveDispute,
        isAdmin,
    };
};

