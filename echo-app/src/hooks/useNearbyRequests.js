/**
 * useNearbyRequests - Hook to fetch nearby requests from Supabase
 *
 * Uses the get_nearby_requests RPC function to fetch requests
 * within a specified radius of the user's location.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const DEFAULT_RADIUS_METERS = 5000; // 5km default

export const useNearbyRequests = (latitude, longitude, radiusMeters = DEFAULT_RADIUS_METERS) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();
    const currentUserId = user?.id;

    // Track previous coords to avoid redundant fetches when the value hasn't changed
    const prevCoordsRef = useRef({ latitude: null, longitude: null });

    // Store refs for values needed in subscription callbacks
    const userIdRef = useRef(currentUserId);

    useEffect(() => {
        userIdRef.current = currentUserId;
    }, [currentUserId]);

    const fetchRequests = useCallback(async () => {
        if (!latitude || !longitude) {
            setLoading(false);
            return;
        }

        // Skip fetch if coordinates haven't meaningfully changed (> 1 meter threshold)
        const prev = prevCoordsRef.current;
        if (
            prev.latitude !== null &&
            Math.abs(prev.latitude - latitude) < 0.00001 &&
            Math.abs(prev.longitude - longitude) < 0.00001 &&
            prev.radius === radiusMeters
        ) {
            return;
        }
        prevCoordsRef.current = { latitude, longitude, radius: radiusMeters };

        try {
            setLoading(true);
            setError(null);

            const { data, error: rpcError } = await supabase.rpc('get_nearby_requests', {
                p_latitude: latitude,
                p_longitude: longitude,
                p_radius_meters: radiusMeters,
            });

            if (rpcError) {
                console.error('[useNearbyRequests] RPC error:', rpcError.message);

                // Fallback: direct table query without expires_at filter (RPC handles that)
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('requests')
                    .select('id, latitude, longitude, location_name, description, category, price_cents, status, created_at, expires_at, creator_id')
                    .eq('status', 'open')
                    .gt('expires_at', new Date().toISOString());

                if (fallbackError) {
                    console.error('[useNearbyRequests] Fallback query failed:', fallbackError.message);
                    setError(rpcError);
                    return;
                }

                const transformedFallback = (fallbackData || []).map(req => ({
                    id: req.id,
                    supabaseId: req.id,
                    lat: parseFloat(req.latitude),
                    lng: parseFloat(req.longitude),
                    price: req.price_cents / 100,
                    title: req.location_name || req.description || 'Photo Request',
                    description: req.description || '',
                    urgent: req.category === 'urgent' || req.price_cents >= 200,
                    distance: null,
                    createdAt: req.created_at,
                    creatorId: req.creator_id,
                    status: req.status,
                    isOwn: req.creator_id === currentUserId,
                }));
                setRequests(transformedFallback);
                return;
            }

            const transformedData = (data || []).map(req => ({
                id: req.id,
                supabaseId: req.id,
                lat: parseFloat(req.latitude),
                lng: parseFloat(req.longitude),
                price: req.price_cents / 100,
                title: req.location_name || req.description || 'Photo Request',
                description: req.description || '',
                urgent: req.category === 'urgent' || req.price_cents >= 200,
                distance: req.distance_meters,
                createdAt: req.created_at,
                creatorId: req.creator_id,
                status: req.status,
                isOwn: req.is_own || false,
            }));

            setRequests(transformedData);
        } catch (err) {
            console.error('[useNearbyRequests] Unexpected error:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [latitude, longitude, radiusMeters, currentUserId]);

    // Refetch when location changes
    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // Silent background refetch — does not set loading state
    const silentRefetch = useCallback(async () => {
        if (!latitude || !longitude) return;

        try {
            const { data, error: rpcError } = await supabase.rpc('get_nearby_requests', {
                p_latitude: latitude,
                p_longitude: longitude,
                p_radius_meters: radiusMeters,
            });

            if (!rpcError && data) {
                const transformedData = data.map(req => ({
                    id: req.id,
                    supabaseId: req.id,
                    lat: parseFloat(req.latitude),
                    lng: parseFloat(req.longitude),
                    price: req.price_cents / 100,
                    title: req.location_name || req.description || 'Photo Request',
                    description: req.description || '',
                    urgent: req.category === 'urgent' || req.price_cents >= 200,
                    distance: req.distance_meters,
                    createdAt: req.created_at,
                    creatorId: req.creator_id,
                    status: req.status,
                    isOwn: req.is_own || false,
                }));
                setRequests(transformedData);
            }
        } catch (err) {
            console.error('[useNearbyRequests] Silent refetch error:', err);
        }
    }, [latitude, longitude, radiusMeters]);

    // Real-time subscription — created once on mount
    useEffect(() => {
        const channelName = `nearby-requests-${Date.now()}`;

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'requests',
                },
                (payload) => {
                    if (payload.eventType === 'INSERT' && payload.new?.status === 'open') {
                        const newReq = payload.new;
                        const isOwn = userIdRef.current
                            ? newReq.creator_id === userIdRef.current
                            : false;

                        const optimisticRequest = {
                            id: newReq.id,
                            supabaseId: newReq.id,
                            lat: parseFloat(newReq.latitude),
                            lng: parseFloat(newReq.longitude),
                            price: newReq.price_cents / 100,
                            title: newReq.location_name || newReq.description || 'Photo Request',
                            description: newReq.description || '',
                            urgent: newReq.category === 'urgent' || newReq.price_cents >= 200,
                            createdAt: newReq.created_at,
                            creatorId: newReq.creator_id,
                            status: newReq.status,
                            isOwn,
                            distance: null,
                        };

                        setRequests(prev => {
                            const exists = prev.some(r => r.id === newReq.id);
                            if (exists) return prev;
                            return [...prev, optimisticRequest];
                        });

                    } else if (payload.eventType === 'UPDATE' && payload.new) {
                        const updatedReq = payload.new;

                        setRequests(prev => {
                            if (updatedReq.status !== 'open') {
                                return prev.filter(req => req.id !== updatedReq.id);
                            }
                            // Job returned to 'open' (e.g. unlocked after agent backed out)
                            // If it's no longer in the list, add it back
                            const exists = prev.some(r => r.id === updatedReq.id);
                            if (!exists) {
                                return [...prev, {
                                    id: updatedReq.id,
                                    supabaseId: updatedReq.id,
                                    lat: parseFloat(updatedReq.latitude),
                                    lng: parseFloat(updatedReq.longitude),
                                    price: updatedReq.price_cents / 100,
                                    title: updatedReq.location_name || updatedReq.description || 'Photo Request',
                                    description: updatedReq.description || '',
                                    urgent: updatedReq.category === 'urgent' || updatedReq.price_cents >= 200,
                                    createdAt: updatedReq.created_at,
                                    creatorId: updatedReq.creator_id,
                                    status: updatedReq.status,
                                    isOwn: updatedReq.creator_id === userIdRef.current,
                                    distance: null,
                                }];
                            }
                            return prev.map(req =>
                                req.id === updatedReq.id
                                    ? { ...req, status: updatedReq.status }
                                    : req
                            );
                        });

                    } else if (payload.eventType === 'DELETE' && payload.old?.id) {
                        setRequests(prev => prev.filter(req => req.id !== payload.old.id));
                    }
                }
            )
            .subscribe((status, err) => {
                if (err) {
                    console.error('[useNearbyRequests] Subscription error:', err);
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error('[useNearbyRequests] Channel error — real-time unavailable');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []); // Empty deps — subscribe once on mount

    return {
        requests,
        loading,
        error,
        refetch: fetchRequests,
        silentRefetch, // bypass coord dedup — use for useFocusEffect
    };
};

export default useNearbyRequests;
