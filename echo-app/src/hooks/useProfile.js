/**
 * useProfile - Hook to fetch and manage user profile
 * 
 * Fetches the user's profile from the profiles table
 * and provides methods to update it.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const useProfile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProfile = useCallback(async () => {
        if (!user?.id) {
            setProfile(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (fetchError) {
                console.error('Error fetching profile:', fetchError);
                setError(fetchError);
                return;
            }

            // Transform to a more friendly format
            setProfile({
                id: data.id,
                displayName: data.display_name,
                avatarUrl: data.avatar_url,
                balance: data.balance_cents / 100, // Convert to euros
                balanceCents: data.balance_cents,
                totalEarned: data.total_earned_cents / 100,
                totalSpent: data.total_spent_cents / 100,
                reputationScore: parseFloat(data.reputation_score),
                completedJobs: data.completed_jobs,
                createdRequests: data.created_requests,
                isAgent: data.is_agent,
                agentVerifiedAt: data.agent_verified_at,
                createdAt: data.created_at,
                role: data.role || 'user', // user, agent, reviewer, admin
            });
        } catch (err) {
            console.error('Unexpected error fetching profile:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    // Update profile
    const updateProfile = useCallback(async (updates) => {
        if (!user?.id) return { error: new Error('Not authenticated') };

        try {
            const { data, error: updateError } = await supabase
                .from('profiles')
                .update({
                    display_name: updates.displayName,
                    avatar_url: updates.avatarUrl,
                })
                .eq('id', user.id)
                .select()
                .single();

            if (updateError) {
                console.error('Error updating profile:', updateError);
                return { error: updateError };
            }

            // Refresh the profile
            await fetchProfile();
            return { data };
        } catch (err) {
            console.error('Unexpected error updating profile:', err);
            return { error: err };
        }
    }, [user?.id, fetchProfile]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return {
        profile,
        loading,
        error,
        refetch: fetchProfile,
        updateProfile,
    };
};

export default useProfile;

