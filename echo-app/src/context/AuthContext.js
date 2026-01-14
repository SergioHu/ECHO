/**
 * AuthContext - Supabase Authentication
 * 
 * Provides authentication state and methods throughout the app.
 * Handles login, signup, logout, and session management.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({
    user: null,
    session: null,
    loading: true,
    signIn: async () => {},
    signUp: async () => {},
    signOut: async () => {},
    profile: null,
});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch user profile from profiles table
    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                return null;
            }
            return data;
        } catch (err) {
            console.error('Profile fetch error:', err);
            return null;
        }
    };

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
                const userProfile = await fetchProfile(session.user.id);
                setProfile(userProfile);
            }
            
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth event:', event);
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    const userProfile = await fetchProfile(session.user.id);
                    setProfile(userProfile);
                } else {
                    setProfile(null);
                }

                setLoading(false);
            }
        );

        // Cleanup subscription on unmount
        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    // Sign in with email and password
    const signIn = async (email, password) => {
        try {
            setLoading(true);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error('Sign in error:', error);
                return { error };
            }

            return { data };
        } finally {
            setLoading(false);
        }
    };

    // Sign up with email and password
    const signUp = async (email, password, metadata = {}) => {
        try {
            setLoading(true);
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata,
                },
            });

            if (error) {
                console.error('Sign up error:', error);
                return { error };
            }

            return { data };
        } finally {
            setLoading(false);
        }
    };

    // Sign out
    const signOut = async () => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                console.error('Sign out error:', error);
                return { error };
            }

            setUser(null);
            setSession(null);
            setProfile(null);
            return {};
        } finally {
            setLoading(false);
        }
    };

    const value = {
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        profile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

