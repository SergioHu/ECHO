/**
 * useLockRequest - Hook to lock/accept a photo request
 * 
 * Uses the lock_request RPC function to atomically lock a request
 * for the current user (agent).
 */

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const useLockRequest = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Lock/accept a request
     * @param {string} requestId - UUID of the request to lock
     * @returns {Object} { success, error }
     */
    const lockRequest = useCallback(async (requestId) => {
        if (!user?.id) {
            return { success: false, error: new Error('Not authenticated') };
        }

        if (!requestId) {
            return { success: false, error: new Error('Request ID is required') };
        }

        try {
            setLoading(true);
            setError(null);

            // Call the lock_request RPC function from migration 008
            const { data, error: rpcError } = await supabase.rpc('lock_request', {
                p_request_id: requestId,
            });

            if (rpcError) {
                console.error('Error locking request:', rpcError);
                setError(rpcError);
                return { success: false, error: rpcError };
            }

            // The function returns true if successful, false if already locked
            if (!data) {
                const alreadyLockedError = new Error('Request is no longer available');
                setError(alreadyLockedError);
                return { success: false, error: alreadyLockedError };
            }

            console.log('Request locked successfully:', requestId);
            return { success: true };
        } catch (err) {
            console.error('Unexpected error locking request:', err);
            setError(err);
            return { success: false, error: err };
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    /**
     * Unlock/cancel a locked request (before submitting photo)
     * @param {string} requestId - UUID of the request to unlock
     */
    const unlockRequest = useCallback(async (requestId) => {
        if (!user?.id) {
            return { success: false, error: new Error('Not authenticated') };
        }

        try {
            setLoading(true);
            setError(null);

            // Update the request back to 'open'
            const { error: updateError } = await supabase
                .from('requests')
                .update({
                    status: 'open',
                    agent_id: null,
                    locked_at: null,
                })
                .eq('id', requestId)
                .eq('agent_id', user.id); // Only unlock if you're the agent

            if (updateError) {
                console.error('Error unlocking request:', updateError);
                setError(updateError);
                return { success: false, error: updateError };
            }

            console.log('Request unlocked:', requestId);
            return { success: true };
        } catch (err) {
            console.error('Unexpected error unlocking request:', err);
            setError(err);
            return { success: false, error: err };
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    return {
        lockRequest,
        unlockRequest,
        loading,
        error,
    };
};

export default useLockRequest;

