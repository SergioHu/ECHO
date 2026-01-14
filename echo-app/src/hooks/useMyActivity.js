/**
 * useMyActivity - Hook to fetch user's requests and completed jobs
 *
 * Fetches:
 * - My Requests: Requests created by the user (for "Requested" tab)
 * - My Jobs: Jobs completed by the user as agent (for "Completed" tab)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Signed URL duration (5 minutes for thumbnail display)
const SIGNED_URL_DURATION = 300;

export const useMyActivity = () => {
    const { user } = useAuth();
    const [myRequests, setMyRequests] = useState([]);
    const [myJobs, setMyJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchActivity = useCallback(async () => {
        if (!user?.id) {
            setMyRequests([]);
            setMyJobs([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Fetch requests created by user (including dispute info for resolution notes)
            const { data: requestsData, error: requestsError } = await supabase
                .from('requests')
                .select(`
                    id,
                    latitude,
                    longitude,
                    location_name,
                    description,
                    price_cents,
                    status,
                    created_at,
                    agent_id,
                    locked_at,
                    photos (
                        id,
                        storage_path,
                        status,
                        created_at,
                        view_session_started_at,
                        view_session_expires_at
                    ),
                    disputes (
                        id,
                        status,
                        reason,
                        description,
                        resolution_notes,
                        resolved_at
                    )
                `)
                .eq('creator_id', user.id)
                .order('created_at', { ascending: false });

            if (requestsError) {
                console.error('Error fetching my requests:', requestsError);
                setError(requestsError);
            } else {
                // Transform to UI format with signed URLs for photos
                const transformedRequests = await Promise.all(
                    (requestsData || []).map(async (req) => {
                        // Get all photos for this request, sorted by created_at desc (newest first)
                        const allPhotos = (req.photos || []).sort((a, b) =>
                            new Date(b.created_at) - new Date(a.created_at)
                        );

                        // Find the latest non-rejected photo (for display)
                        // If all photos are rejected, show the latest rejected one
                        const latestActivePhoto = allPhotos.find(p => p.status !== 'rejected');
                        const latestRejectedPhoto = allPhotos.find(p => p.status === 'rejected');
                        const photo = latestActivePhoto || latestRejectedPhoto || null;

                        console.log(`📋 Request ${req.id}: ${allPhotos.length} photos, active: ${latestActivePhoto?.id || 'none'}, rejected: ${latestRejectedPhoto?.id || 'none'}`);

                        const dispute = req.disputes?.[0] || null;
                        let photoUrl = null;

                        // Generate signed URL for photo thumbnail if exists (and not rejected)
                        if (photo?.storage_path && photo?.status !== 'rejected') {
                            try {
                                console.log('📸 Getting signed URL for:', photo.storage_path);
                                const { data: urlData, error: urlError } = await supabase.storage
                                    .from('echo-photos')
                                    .createSignedUrl(photo.storage_path, SIGNED_URL_DURATION);
                                if (urlError) {
                                    console.error('❌ Signed URL error:', urlError);
                                } else {
                                    photoUrl = urlData?.signedUrl || null;
                                    console.log('✅ Got signed URL:', photoUrl ? 'success' : 'null');
                                }
                            } catch (err) {
                                console.error('Error getting signed URL:', err);
                            }
                        }

                        // Check if the current photo was rejected
                        const isPhotoRejected = photo?.status === 'rejected';

                        return {
                            id: req.id,
                            supabaseId: req.id,
                            title: req.location_name || req.description || 'Photo Request',
                            description: req.description,
                            price: req.price_cents / 100,
                            status: req.status,
                            createdAt: req.created_at,
                            lat: req.latitude,
                            lng: req.longitude,
                            hasPhoto: req.photos && req.photos.length > 0 && !isPhotoRejected,
                            photo: photo,
                            photoStatus: photo?.status || null, // 'pending', 'approved', 'rejected', 'validated'
                            photoUrl: isPhotoRejected ? null : photoUrl, // No thumbnail for rejected photos
                            photoId: photo?.id || null, // Photo ID for view session
                            isLocked: !!req.agent_id,
                            isPhotoRejected: isPhotoRejected,
                            // Session timing from backend - used for timer synchronization
                            // NULL means session not started yet (fresh 3 min available)
                            viewSessionStartedAt: photo?.view_session_started_at || null,
                            viewSessionExpiresAt: photo?.view_session_expires_at || null,
                            // Dispute info for displaying admin resolution notes
                            dispute: dispute ? {
                                id: dispute.id,
                                status: dispute.status,
                                reason: dispute.reason,
                                description: dispute.description,
                                resolutionNotes: dispute.resolution_notes,
                                resolvedAt: dispute.resolved_at,
                            } : null,
                        };
                    })
                );
                // Log requests with photos for debugging
                const requestsWithPhotos = transformedRequests.filter(r => r.hasPhoto);
                console.log(`📋 My Requests: ${transformedRequests.length} total, ${requestsWithPhotos.length} with photos`);
                requestsWithPhotos.forEach((r, i) => {
                    console.log(`📷 Request ${i + 1}: id=${r.id}, status=${r.status}, hasPhoto=${r.hasPhoto}, photoUrl=${r.photoUrl ? 'YES' : 'NO'}`);
                });

                setMyRequests(transformedRequests);
            }

            // Fetch jobs completed by user (as agent) - include photo status and disputes
            console.log('📷 Fetching photos where agent_id =', user.id);
            const { data: jobsData, error: jobsError } = await supabase
                .from('photos')
                .select(`
                    id,
                    storage_path,
                    created_at,
                    status,
                    request:requests (
                        id,
                        location_name,
                        description,
                        price_cents,
                        status,
                        creator_id
                    ),
                    disputes (
                        id,
                        status,
                        resolution_notes,
                        resolved_at
                    )
                `)
                .eq('agent_id', user.id)
                .order('created_at', { ascending: false });

            console.log('📷 Photos query result:', { count: jobsData?.length || 0, error: jobsError?.message });
            if (jobsData?.length > 0) {
                console.log('📷 First photo:', JSON.stringify(jobsData[0], null, 2));
            }

            if (jobsError) {
                console.error('Error fetching my jobs:', jobsError);
                setError(jobsError);
            } else {
                // Transform to UI format - include rejection feedback
                const transformedJobs = (jobsData || []).map(photo => {
                    // Find any resolved dispute with notes (check all dispute statuses that indicate resolution)
                    const resolvedDispute = photo.disputes?.find(d =>
                        d.resolution_notes && (
                            d.status === 'resolved_creator' ||
                            d.status === 'resolved_agent' ||
                            d.status?.includes('resolved')
                        )
                    );

                    // Debug logging for rejection feedback
                    if (photo.status === 'rejected') {
                        console.log('📋 Rejected photo found:', photo.id, 'disputes:', photo.disputes);
                        console.log('📋 Resolved dispute:', resolvedDispute);
                    }

                    // Determine display status
                    let displayStatus = photo.request?.status || 'completed';
                    if (photo.status === 'rejected') {
                        displayStatus = 'rejected';
                    }

                    return {
                        id: photo.id,
                        supabaseId: photo.id,
                        photoId: photo.id,
                        storagePath: photo.storage_path,
                        title: photo.request?.location_name || photo.request?.description || 'Completed Job',
                        price: (photo.request?.price_cents || 0) / 100,
                        status: displayStatus,
                        photoStatus: photo.status,
                        createdAt: photo.created_at,
                        requestId: photo.request?.id,
                        adminFeedback: resolvedDispute?.resolution_notes || null,
                        disputeStatus: resolvedDispute?.status || null,
                        isSupabase: true, // Mark as Supabase job for proper rendering
                    };
                });
                setMyJobs(transformedJobs);
            }
        } catch (err) {
            console.error('Unexpected error fetching activity:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchActivity();
    }, [fetchActivity]);

    // Real-time subscription for instant updates
    useEffect(() => {
        if (!user?.id) return;

        console.log('🔔 Setting up real-time subscription for activity...');

        // Subscribe to changes in requests table where user is creator
        const requestsChannel = supabase
            .channel('my-requests-changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'requests',
                    filter: `creator_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('📥 Request update received:', payload.eventType, payload.new?.id || payload.old?.id);
                    // Refetch to get updated data with signed URLs
                    fetchActivity();
                }
            )
            .subscribe();

        // Subscribe to photos table for this user's requests
        const photosChannel = supabase
            .channel('my-photos-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'photos',
                },
                (payload) => {
                    console.log('📸 New photo received:', payload.new?.id);
                    // Refetch to get the new photo with signed URL
                    fetchActivity();
                }
            )
            .subscribe();

        return () => {
            console.log('🔕 Cleaning up real-time subscriptions...');
            supabase.removeChannel(requestsChannel);
            supabase.removeChannel(photosChannel);
        };
    }, [user?.id, fetchActivity]);

    return {
        myRequests,
        myJobs,
        loading,
        error,
        refetch: fetchActivity,
    };
};

export default useMyActivity;

