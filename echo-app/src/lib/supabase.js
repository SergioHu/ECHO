/**
 * Supabase Client Configuration
 *
 * This file initializes the Supabase client for the Echo app.
 * Uses environment variables for configuration.
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration - Expo reads EXPO_PUBLIC_* from .env automatically
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dyywmbrxvypnpvuygqub.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Log configuration status (only in dev)
if (__DEV__) {
    console.log('Supabase URL:', SUPABASE_URL);
    console.log('Supabase Key configured:', !!SUPABASE_ANON_KEY);
}

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Required for React Native
    },
});

// Export configuration for debugging
export const supabaseConfig = {
    url: SUPABASE_URL,
    isConfigured: !!SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 10,
};

