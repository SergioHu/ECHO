/**
 * useAdminUsers - Hook to fetch and manage users for admin
 * 
 * Returns all users with profile details.
 * Only accessible by admin role (not reviewer).
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const useAdminUsers = (searchQuery = null) => {
    const { user, profile } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isAdmin = profile?.role === 'admin';

    const fetchUsers = useCallback(async () => {
        if (!user?.id || !isAdmin) {
            setUsers([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: rpcError } = await supabase.rpc('get_admin_users', {
                p_search: searchQuery || null,
            });

            if (rpcError) {
                console.error('Error fetching users:', rpcError);
                setError(rpcError);
                return;
            }

            setUsers(data || []);
        } catch (err) {
            console.error('Users fetch error:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [user?.id, isAdmin, searchQuery]);

    const updateUserRole = useCallback(async (userId, newRole) => {
        if (!isAdmin) {
            return { success: false, error: 'Unauthorized' };
        }

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (updateError) {
                console.error('Error updating user role:', updateError);
                return { success: false, error: updateError };
            }

            // Refetch users
            await fetchUsers();

            return { success: true };
        } catch (err) {
            console.error('Update user role error:', err);
            return { success: false, error: err };
        }
    }, [isAdmin, fetchUsers]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    return {
        users,
        loading,
        error,
        refetch: fetchUsers,
        updateUserRole,
        isAdmin,
    };
};

