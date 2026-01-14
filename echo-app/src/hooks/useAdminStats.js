/**
 * useAdminStats - Hook to fetch admin dashboard statistics
 * 
 * Returns counts for pending photos, disputes, users, jobs, etc.
 * Only accessible by admin/reviewer roles.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const useAdminStats = () => {
    const { user, profile } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isAdmin = profile?.role === 'admin' || profile?.role === 'reviewer';

    const fetchStats = useCallback(async () => {
        if (!user?.id || !isAdmin) {
            setStats(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: rpcError } = await supabase.rpc('get_admin_stats');

            if (rpcError) {
                console.error('Error fetching admin stats:', rpcError);
                setError(rpcError);
                return;
            }

            setStats(data);
        } catch (err) {
            console.error('Admin stats fetch error:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [user?.id, isAdmin]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return {
        stats,
        loading,
        error,
        refetch: fetchStats,
        isAdmin,
    };
};

