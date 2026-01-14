/**
 * useAdminPhotos - Hook to fetch and review pending photos
 * 
 * Returns pending photos for admin review.
 * Only accessible by admin/reviewer roles.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const useAdminPhotos = () => {
    const { user, profile } = useAuth();
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isAdmin = profile?.role === 'admin' || profile?.role === 'reviewer';

    const fetchPendingPhotos = useCallback(async () => {
        if (!user?.id || !isAdmin) {
            setPhotos([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Fetch pending photos with request details
            const { data, error: fetchError } = await supabase
                .from('photos')
                .select(`
                    id,
                    request_id,
                    agent_id,
                    storage_path,
                    status,
                    created_at,
                    location,
                    requests (
                        id,
                        title,
                        description,
                        price_cents,
                        location,
                        creator_id
                    )
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (fetchError) {
                console.error('Error fetching photos:', fetchError);
                setError(fetchError);
                return;
            }

            // Transform data and generate signed URLs
            const transformedPhotos = await Promise.all(
                (data || []).map(async (photo) => {
                    let signedUrl = null;

                    // Generate signed URL for photo
                    if (photo.storage_path) {
                        try {
                            const { data: urlData, error: urlError } = await supabase.storage
                                .from('echo-photos')
                                .createSignedUrl(photo.storage_path, 600); // 10 minutes
                            if (!urlError && urlData?.signedUrl) {
                                signedUrl = urlData.signedUrl;
                            }
                        } catch (err) {
                            console.error('Error getting signed URL:', err);
                        }
                    }

                    return {
                        id: photo.id,
                        requestId: photo.request_id,
                        agentId: photo.agent_id,
                        photoUrl: signedUrl, // Use signed URL instead of storage path
                        storagePath: photo.storage_path,
                        status: photo.status,
                        createdAt: photo.created_at,
                        photoLocation: photo.location,
                        request: photo.requests ? {
                            id: photo.requests.id,
                            title: photo.requests.title,
                            description: photo.requests.description,
                            price: photo.requests.price_cents / 100,
                            location: photo.requests.location,
                            creatorId: photo.requests.creator_id,
                        } : null,
                    };
                })
            );

            setPhotos(transformedPhotos);
        } catch (err) {
            console.error('Photos fetch error:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [user?.id, isAdmin]);

    const approvePhoto = useCallback(async (photoId) => {
        if (!isAdmin) {
            return { success: false, error: 'Unauthorized' };
        }

        try {
            // Use the admin_approve_photo RPC function
            // Parameter must match SQL: p_photo_id
            const { data, error: rpcError } = await supabase
                .rpc('admin_approve_photo', { p_photo_id: photoId });

            if (rpcError) {
                console.error('Error approving photo:', rpcError);
                return { success: false, error: rpcError };
            }

            if (!data) {
                console.error('Photo approval failed - function returned false');
                return { success: false, error: 'Approval failed' };
            }

            // Refetch photos
            await fetchPendingPhotos();

            return { success: true };
        } catch (err) {
            console.error('Approve photo error:', err);
            return { success: false, error: err };
        }
    }, [isAdmin, fetchPendingPhotos]);

    const rejectPhoto = useCallback(async (photoId, reason = '') => {
        if (!isAdmin) {
            return { success: false, error: 'Unauthorized' };
        }

        try {
            // Use the admin_reject_photo RPC function
            // Parameters must match SQL: p_photo_id, p_reason
            const { data, error: rpcError } = await supabase
                .rpc('admin_reject_photo', {
                    p_photo_id: photoId,
                    p_reason: reason || 'Rejected by reviewer'
                });

            if (rpcError) {
                console.error('Error rejecting photo:', rpcError);
                return { success: false, error: rpcError };
            }

            if (!data) {
                console.error('Photo rejection failed - function returned false');
                return { success: false, error: 'Rejection failed' };
            }

            // Refetch photos
            await fetchPendingPhotos();

            return { success: true };
        } catch (err) {
            console.error('Reject photo error:', err);
            return { success: false, error: err };
        }
    }, [isAdmin, fetchPendingPhotos]);

    useEffect(() => {
        fetchPendingPhotos();
    }, [fetchPendingPhotos]);

    return {
        photos,
        loading,
        error,
        refetch: fetchPendingPhotos,
        approvePhoto,
        rejectPhoto,
        isAdmin,
    };
};

