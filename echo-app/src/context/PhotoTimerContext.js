import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PhotoTimerContext = createContext();

// Default duration: 3 minutes
const DEFAULT_DURATION = 180;

// Storage key for persisting timers
const TIMERS_STORAGE_KEY = '@echo_photo_timers';

export const PhotoTimerProvider = ({ children }) => {
    // Timers keyed by jobId (NOT photoUri)
    const [timers, setTimers] = useState({});
    const [isLoaded, setIsLoaded] = useState(false);
    const saveTimeoutRef = useRef(null);

    // Load timers from AsyncStorage on mount
    useEffect(() => {
        const loadTimers = async () => {
            try {
                const stored = await AsyncStorage.getItem(TIMERS_STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    // Clean up expired timers (older than 24 hours)
                    const now = Date.now();
                    const cleanedTimers = {};
                    Object.entries(parsed).forEach(([key, expiry]) => {
                        // Keep timers that expired within the last 24 hours (for display purposes)
                        if (expiry > now - 24 * 60 * 60 * 1000) {
                            cleanedTimers[key] = expiry;
                        }
                    });
                    setTimers(cleanedTimers);
                }
            } catch (error) {
                console.error('Failed to load photo timers:', error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadTimers();
    }, []);

    // Persist timers to AsyncStorage when they change (debounced)
    useEffect(() => {
        if (!isLoaded) return;

        // Debounce saves to avoid too many writes
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await AsyncStorage.setItem(TIMERS_STORAGE_KEY, JSON.stringify(timers));
            } catch (error) {
                console.error('Failed to save photo timers:', error);
            }
        }, 500);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [timers, isLoaded]);

    /**
     * Start a timer for a specific job
     * @param {string|number} jobId - Unique job identifier
     * @param {number} durationSeconds - Timer duration (default 180s)
     * @param {boolean} forceReset - Force reset timer even if it exists
     * @returns {number} Expiry timestamp
     */
    const startTimer = (jobId, durationSeconds = DEFAULT_DURATION, forceReset = false) => {
        const key = String(jobId);
        const existingExpiry = timers[key];

        // Start new timer if:
        // 1. No timer exists, OR
        // 2. forceReset is true, OR
        // 3. Existing timer has expired (allow restart)
        if (!existingExpiry || forceReset || Date.now() >= existingExpiry) {
            const expiry = Date.now() + durationSeconds * 1000;
            console.log('⏱️ PhotoTimerContext: Starting/resetting timer for', key, 'expires at', new Date(expiry).toISOString());
            setTimers(prev => ({
                ...prev,
                [key]: expiry
            }));
            return expiry;
        }

        console.log('⏱️ PhotoTimerContext: Timer already exists for', key, 'expires at', new Date(existingExpiry).toISOString());
        return existingExpiry;
    };

    /**
     * Get expiry timestamp for a job
     * @param {string|number} jobId - Unique job identifier
     * @returns {number|null} Expiry timestamp or null if not started
     */
    const getExpiry = (jobId) => {
        const key = String(jobId);
        return timers[key] || null;
    };

    /**
     * Check if a job's timer has expired
     * @param {string|number} jobId - Unique job identifier
     * @returns {boolean} True if timer exists and has expired
     */
    const isExpired = (jobId) => {
        const expiry = getExpiry(jobId);
        if (!expiry) return false;
        return Date.now() >= expiry;
    };

    /**
     * Clear timer for a job
     * @param {string|number} jobId - Unique job identifier
     */
    const clearTimer = (jobId) => {
        const key = String(jobId);
        setTimers(prev => {
            const newTimers = { ...prev };
            delete newTimers[key];
            return newTimers;
        });
    };

    return (
        <PhotoTimerContext.Provider value={{ startTimer, getExpiry, isExpired, clearTimer, timers, isLoaded }}>
            {children}
        </PhotoTimerContext.Provider>
    );
};

export const usePhotoTimer = () => useContext(PhotoTimerContext);
