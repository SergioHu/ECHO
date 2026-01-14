/**
 * useViewSession - Hook to manage photo viewing session
 * 
 * Creates a temporary viewing session for a photo with the 3-minute
 * expiration rule enforced by the backend.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const SESSION_DURATION_MS = 3 * 60 * 1000; // 3 minutes

export const useViewSession = (photoId) => {
    const { user } = useAuth();
    const [session, setSession] = useState(null);
    const [photoUrl, setPhotoUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null); // null = not loaded yet, 0 = expired
    const intervalRef = useRef(null);

    // Start a view session
    const startSession = useCallback(async () => {
        if (!user?.id || !photoId) {
            return { error: new Error('User and photo ID required') };
        }

        try {
            setLoading(true);
            setError(null);

            console.log('📸 Starting view session for photo:', photoId);

            // Call the start_view_session RPC function
            // Returns: { photo_id, storage_path, expires_at, already_expired }
            const { data, error: rpcError } = await supabase.rpc('start_view_session', {
                p_photo_id: photoId,
            });

            if (rpcError) {
                console.error('❌ Error starting view session:', rpcError);
                setError(rpcError);
                return { error: rpcError };
            }

            console.log('📸 RPC response:', data);

            // RPC returns an array with one row
            const sessionData = Array.isArray(data) ? data[0] : data;

            if (!sessionData) {
                const err = new Error('No session data returned');
                setError(err);
                return { error: err };
            }

            // Check if already expired
            if (sessionData.already_expired) {
                console.log('⏰ Photo session already expired');
                setTimeRemaining(0);
                return { success: false, expired: true };
            }

            // Get signed URL using storage_path from RPC response
            const { data: urlData, error: urlError } = await supabase.storage
                .from('echo-photos')
                .createSignedUrl(sessionData.storage_path, SESSION_DURATION_MS / 1000);

            if (urlError) {
                console.error('❌ Error getting signed URL:', urlError);
                setError(urlError);
                return { error: urlError };
            }

            const expiresAt = new Date(sessionData.expires_at);
            const remaining = Math.max(0, expiresAt.getTime() - Date.now());

            console.log('✅ Session started, expires in:', Math.ceil(remaining / 1000), 'seconds');

            setSession({
                photoId,
                expiresAt,
                storagePath: sessionData.storage_path,
            });
            setPhotoUrl(urlData.signedUrl);
            setTimeRemaining(remaining);

            return {
                success: true,
                photoUrl: urlData.signedUrl,
                expiresAt,
            };
        } catch (err) {
            console.error('❌ Unexpected error starting session:', err);
            setError(err);
            return { error: err };
        } finally {
            setLoading(false);
        }
    }, [user?.id, photoId]);

    // Countdown timer
    useEffect(() => {
        if (!session?.expiresAt) return;

        intervalRef.current = setInterval(() => {
            const remaining = Math.max(0, session.expiresAt.getTime() - Date.now());
            setTimeRemaining(remaining);

            if (remaining <= 0) {
                // Session expired
                setPhotoUrl(null);
                setSession(null);
                clearInterval(intervalRef.current);
            }
        }, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [session?.expiresAt]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return {
        startSession,
        session,
        photoUrl,
        timeRemaining,
        timeRemainingSeconds: Math.ceil(timeRemaining / 1000),
        isExpired: session ? timeRemaining <= 0 : false,
        loading,
        error,
    };
};

export default useViewSession;

