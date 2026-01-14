import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Hook for fetching analytics data from Supabase
 * @param {string} period - 'today' | 'week' | 'month' | 'all'
 * @returns {Object} { analytics, topPhotographers, loading, error, refetch, isAdmin }
 */
export const useAdminAnalytics = (period = 'week') => {
    const { user, profile } = useAuth();
    const [analytics, setAnalytics] = useState(null);
    const [topPhotographers, setTopPhotographers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isAdmin = profile?.role === 'admin' || profile?.role === 'reviewer';

    const fetchAnalytics = useCallback(async () => {
        if (!user || !isAdmin) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Map period to RPC parameter
            const periodMap = {
                'Today': 'today',
                'This Week': 'week',
                'This Month': 'month',
                'All Time': 'all'
            };
            const p = periodMap[period] || 'week';

            // Fetch analytics data
            const { data: analyticsData, error: analyticsError } = await supabase
                .rpc('get_admin_analytics', { p_period: p });

            if (analyticsError) throw analyticsError;

            // Fetch top photographers
            const { data: photographersData, error: photographersError } = await supabase
                .rpc('get_top_photographers', { p_limit: 5 });

            if (photographersError) {
                console.warn('Error fetching top photographers:', photographersError);
            }

            setAnalytics(analyticsData);
            setTopPhotographers(photographersData || []);
        } catch (err) {
            console.error('Error fetching admin analytics:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [user, isAdmin, period]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    return {
        analytics,
        topPhotographers,
        loading,
        error,
        refetch: fetchAnalytics,
        isAdmin
    };
};

export default useAdminAnalytics;

