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
    const [updateKey, setUpdateKey] = useState(0); // Force re-render trigger for MapView markers
    const { user } = useAuth();
    const currentUserId = user?.id;

    // Track if initial fetch is done to avoid showing loading on real-time updates
    const initialFetchDone = useRef(false);

    // Store refs for values needed in subscription callbacks
    const latRef = useRef(latitude);
    const lngRef = useRef(longitude);
    const radiusRef = useRef(radiusMeters);
    const userIdRef = useRef(currentUserId);

    // Keep refs updated
    useEffect(() => {
        latRef.current = latitude;
        lngRef.current = longitude;
        radiusRef.current = radiusMeters;
        userIdRef.current = currentUserId;
    }, [latitude, longitude, radiusMeters, currentUserId]);

    const fetchRequests = useCallback(async () => {
        if (!latitude || !longitude) {
            console.log('🗺️ Nearby: Skipping fetch - no location yet');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            console.log(`🗺️ Nearby: Fetching requests at (${latitude.toFixed(5)}, ${longitude.toFixed(5)}) radius=${radiusMeters}m`);

            // Call the RPC function we created in migration 009
            // Parameter names must match the SQL function: p_latitude, p_longitude, p_radius_meters
            const { data, error: rpcError } = await supabase.rpc('get_nearby_requests', {
                p_latitude: latitude,
                p_longitude: longitude,
                p_radius_meters: radiusMeters,
            });

            if (rpcError) {
                console.error('❌ Nearby: RPC Error:', rpcError.message, rpcError.code, rpcError.details);
                console.error('❌ Full error:', JSON.stringify(rpcError, null, 2));

                // IMPORTANT: The RPC error likely means migration 00025 hasn't been applied
                // The get_nearby_requests function needs to return: status TEXT and is_own BOOLEAN
                console.log('⚠️ RPC failed - this usually means the SQL migration needs to be applied!');
                console.log('⚠️ Please run migration: 00025_fix_get_nearby_requests.sql');

                // Fallback: try direct query if RPC fails
                console.log('🔄 Trying fallback direct query...');
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('requests')
                    .select('id, latitude, longitude, location_name, description, category, price_cents, status, created_at, expires_at, creator_id')
                    .eq('status', 'open');

                if (fallbackError) {
                    console.error('❌ Fallback query also failed:', fallbackError);
                    setError(rpcError);
                    return;
                }

                console.log(`✅ Fallback: Found ${fallbackData?.length || 0} open requests`);
                if (fallbackData?.length > 0) {
                    fallbackData.forEach((req, i) => {
                        console.log(`📍 Fallback ${i + 1}: id=${req.id?.slice(0, 8)}... status=${req.status} expires=${req.expires_at} isOwn=${req.creator_id === currentUserId}`);
                    });

                    // Transform fallback data
                    const transformedFallback = fallbackData.map(req => ({
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
                    setUpdateKey(k => k + 1);
                    initialFetchDone.current = true;
                    return;
                }

                setError(rpcError);
                return;
            }

            console.log(`✅ Nearby: Found ${data?.length || 0} requests from Supabase`);
            if (data?.length > 0) {
                console.log('📍 First request:', data[0].id, 'at', data[0].latitude, data[0].longitude, 'distance:', data[0].distance_meters, 'm', 'is_own:', data[0].is_own);
                // Log all requests for debugging
                data.forEach((req, i) => {
                    console.log(`📍 Request ${i + 1}: id=${req.id?.slice(0, 8)}... lat=${req.latitude} lng=${req.longitude} is_own=${req.is_own} status=${req.status}`);
                });
            } else {
                console.log('⚠️ Nearby: RPC returned empty. Checking raw requests table...');

                // Debug: Check what's in the requests table
                const { data: debugData, error: debugError } = await supabase
                    .from('requests')
                    .select('id, status, expires_at, creator_id')
                    .eq('status', 'open')
                    .limit(10);

                if (debugData?.length > 0) {
                    console.log(`📊 Debug: Found ${debugData.length} open requests in table:`);
                    debugData.forEach((req, i) => {
                        const isExpired = req.expires_at && new Date(req.expires_at) < new Date();
                        console.log(`   ${i + 1}. id=${req.id?.slice(0, 8)}... expires=${req.expires_at} expired=${isExpired} isOwn=${req.creator_id === currentUserId}`);
                    });
                } else {
                    console.log('⚠️ Debug: No open requests found in table');
                }
            }

            // Transform data to match the format expected by RadarScreen
            const transformedData = (data || []).map(req => ({
                id: req.id,
                supabaseId: req.id, // UUID for Supabase operations
                lat: parseFloat(req.latitude), // Ensure numeric
                lng: parseFloat(req.longitude), // Ensure numeric
                price: req.price_cents / 100, // Convert cents to euros
                title: req.location_name || req.description || 'Photo Request',
                description: req.description || '',
                urgent: req.category === 'urgent' || req.price_cents >= 200, // 2+ EUR is "urgent"
                distance: req.distance_meters,
                createdAt: req.created_at,
                creatorId: req.creator_id,
                status: req.status,
                isOwn: req.is_own || false, // Flag for own requests (show different marker)
            }));

            setRequests(transformedData);
            setUpdateKey(k => k + 1);
            initialFetchDone.current = true;
        } catch (err) {
            console.error('❌ Nearby: Unexpected error:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [latitude, longitude, radiusMeters]);

    // Refetch when location changes
    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // Background refetch (silent - doesn't set loading state)
    const silentRefetch = useCallback(async () => {
        if (!latitude || !longitude) return;

        try {
            const { data, error: rpcError } = await supabase.rpc('get_nearby_requests', {
                p_latitude: latitude,
                p_longitude: longitude,
                p_radius_meters: radiusMeters,
            });

            if (!rpcError && data) {
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
                setUpdateKey(k => k + 1);
            }
        } catch (err) {
            console.error('❌ Nearby: Silent refetch error:', err);
        }
    }, [latitude, longitude, radiusMeters]);

    // Track if subscription is already set up
    const subscriptionRef = useRef(null);
    const hasLocationRef = useRef(false);

    // Real-time subscription - STABLE, only set up once when we have location
    useEffect(() => {
        // Only set up subscription once we have location
        if (!latitude || !longitude) return;

        // Already have subscription? Don't recreate
        if (hasLocationRef.current && subscriptionRef.current) {
            return;
        }

        hasLocationRef.current = true;
        console.log('🔔 Setting up STABLE real-time subscription for requests...');

        // Use a stable channel name (not Date.now())
        const channelName = `nearby-requests-${userIdRef.current || 'anon'}`;

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',  // Listen to all events (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'requests',
                },
                (payload) => {
                    const eventType = payload.eventType;
                    console.log(`📍 Real-time ${eventType} received:`, payload.new?.id || payload.old?.id);

                    if (eventType === 'INSERT' && payload.new?.status === 'open') {
                        const newReq = payload.new;
                        const isOwn = userIdRef.current && newReq.creator_id === userIdRef.current;

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
                            isOwn: isOwn,
                            distance: isOwn ? 0 : null,
                        };

                        setRequests(prev => {
                            if (prev.some(r => r.id === newReq.id)) return prev;
                            console.log('📍 Adding new request to map (optimistic):', newReq.id);
                            return [...prev, optimisticRequest];
                        });
                        // Force MapView marker re-render
                        setUpdateKey(k => k + 1);
                    } else if (eventType === 'UPDATE' && payload.new) {
                        const updatedReq = payload.new;
                        setRequests(prev => {
                            if (updatedReq.status !== 'open') {
                                console.log('📍 Removing from map (status changed):', updatedReq.id);
                                return prev.filter(req => req.id !== updatedReq.id);
                            }
                            return prev.map(req =>
                                req.id === updatedReq.id
                                    ? { ...req, status: updatedReq.status }
                                    : req
                            );
                        });
                        // Force MapView marker re-render
                        setUpdateKey(k => k + 1);
                    } else if (eventType === 'DELETE' && payload.old?.id) {
                        console.log('📍 Removing from map (deleted):', payload.old.id);
                        setRequests(prev => prev.filter(req => req.id !== payload.old.id));
                        // Force MapView marker re-render
                        setUpdateKey(k => k + 1);
                    }
                }
            )
            .subscribe((status, err) => {
                console.log('🔔 Subscription status:', status);
                if (err) {
                    console.error('🔔 Subscription error:', err);
                }
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Real-time subscription ACTIVE for requests table');
                    subscriptionRef.current = channel;
                }
            });

        return () => {
            console.log('🔕 Cleaning up nearby requests subscription...');
            supabase.removeChannel(channel);
            subscriptionRef.current = null;
            hasLocationRef.current = false;
        };
    }, [!!latitude && !!longitude]); // Only depends on HAVING location, not exact values

    return {
        requests,
        loading,
        error,
        refetch: fetchRequests,
        updateKey, // Used to force MapView marker re-renders
    };
};

export default useNearbyRequests;

