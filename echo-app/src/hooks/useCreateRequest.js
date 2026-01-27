/**
 * useCreateRequest - Hook to create a new photo request
 * 
 * Creates a new request in the requests table.
 * In the future, this will integrate with Stripe for payment.
 */

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const useCreateRequest = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Create a new photo request
     * @param {Object} params
     * @param {number} params.latitude - Latitude of the location
     * @param {number} params.longitude - Longitude of the location
     * @param {string} params.locationName - Name/address of the location
     * @param {string} params.description - Description of what photo is needed
     * @param {number} params.priceCents - Price in cents (e.g., 150 = €1.50)
     * @param {string} params.category - Category (e.g., 'landmark', 'traffic', 'event')
     */
    const createRequest = useCallback(async ({
        latitude,
        longitude,
        locationName,
        description,
        priceCents = 50, // Default €0.50
        category = 'general',
    }) => {
        if (!user?.id) {
            return { error: new Error('Not authenticated') };
        }

        if (!latitude || !longitude) {
            return { error: new Error('Location is required') };
        }

        try {
            setLoading(true);
            setError(null);

            console.log('');
            console.log('╔══════════════════════════════════════════════════════════╗');
            console.log('║  🔧 useCreateRequest - CALLING RPC                       ║');
            console.log('╚══════════════════════════════════════════════════════════╝');
            console.log(`🔧 Creating request at: (${latitude}, ${longitude})`);
            console.log('🔧 User ID:', user.id);
            console.log('🔧 Location name:', locationName);
            console.log('🔧 Description:', description);
            console.log('🔧 Price cents:', priceCents);
            console.log('🔧 Category:', category);

            // Use the RPC function that properly handles PostGIS geography
            const rpcParams = {
                p_creator_id: user.id,
                p_latitude: latitude,
                p_longitude: longitude,
                p_location_name: locationName || null,
                p_description: description || null,
                p_price_cents: priceCents,
                p_category: category,
            };
            console.log('🔧 RPC params:', JSON.stringify(rpcParams, null, 2));

            const { data: requestId, error: rpcError } = await supabase.rpc('create_request', rpcParams);

            console.log('🔧 RPC response - requestId:', requestId);
            console.log('🔧 RPC response - error:', rpcError);

            if (rpcError) {
                console.error('❌ RPC Error creating request:', rpcError);
                console.error('❌ Error code:', rpcError.code);
                console.error('❌ Error message:', rpcError.message);
                console.error('❌ Error details:', rpcError.details);
                setError(rpcError);
                return { error: rpcError };
            }

            console.log('✅ RPC SUCCESS! Request ID:', requestId);

            // Fetch the created request to return full data
            const { data, error: fetchError } = await supabase
                .from('requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (fetchError) {
                console.warn('⚠️ Request created but fetch failed:', fetchError);
                return { data: { id: requestId } };
            }

            console.log('✅ Request data:', data.id, 'at', data.latitude, data.longitude, 'status:', data.status);
            return { data };
        } catch (err) {
            console.error('Unexpected error creating request:', err);
            setError(err);
            return { error: err };
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    return {
        createRequest,
        loading,
        error,
    };
};

export default useCreateRequest;

