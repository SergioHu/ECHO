import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import { usePhotoTimer } from '../context/PhotoTimerContext';

// Format time as M:SS - consistent across ALL usages
const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Initial duration in seconds (3 minutes) - same as PhotoViewerScreen
const INITIAL_DURATION = 180;

/**
 * ViewTimer - UNIFIED timer display component (DISPLAY-ONLY)
 *
 * IDENTICAL UI in BOTH PhotoViewerScreen and ActivityScreen.
 * NO variants, NO style overrides - same component, same look everywhere.
 *
 * IMPORTANT: This component is READ-ONLY. It does NOT start timers.
 * Timer is started explicitly in PhotoViewerScreen when photo is opened.
 *
 * Props:
 * - jobId: Unique job identifier (used as key in timer state - NOT photoUri)
 * - onExpired: Optional callback when timer expires
 * - onTimerStateChange: Optional callback with timer state { isExpired, isActive, timeLeft }
 */
const ViewTimer = ({ jobId, expiryTimestamp, onExpired, onTimerStateChange }) => {
    // We observe 'timers' directly to re-render when timers change
    const { timers } = usePhotoTimer();
    const expiredNotified = React.useRef(false);
    const [tick, setTick] = useState(0); // Force re-render every second

    // Get the current expiry - prefer prop, then context
    const timerKey = jobId ? String(jobId) : null;
    const contextExpiry = timerKey ? timers[timerKey] : null;
    const currentExpiry = expiryTimestamp || contextExpiry; // Prop takes precedence

    // Calculate time left directly (not from state)
    const now = Date.now();
    const timeLeft = currentExpiry ? Math.max(0, Math.ceil((currentExpiry - now) / 1000)) : INITIAL_DURATION;
    const timerActive = !!currentExpiry;
    const hasExpired = timerActive && timeLeft <= 0;

    // Countdown interval - tick every second to force re-render
    useEffect(() => {
        if (!timerActive || hasExpired) return;

        const intervalId = setInterval(() => {
            setTick(t => t + 1); // Force re-render
        }, 1000);

        return () => clearInterval(intervalId);
    }, [timerActive, hasExpired]);

    // Handle expiration callback
    useEffect(() => {
        if (hasExpired && !expiredNotified.current) {
            expiredNotified.current = true;
            onExpired?.();
        }
    }, [hasExpired, onExpired]);

    // Notify state changes
    useEffect(() => {
        onTimerStateChange?.({
            isExpired: hasExpired,
            isActive: timerActive,
            timeLeft
        });
    }, [hasExpired, timerActive, timeLeft, onTimerStateChange]);

    // Determine warning states
    const isWarning = timerActive && timeLeft <= 30 && timeLeft > 10 && !hasExpired;
    const isCritical = timerActive && timeLeft <= 10 && !hasExpired;

    // Expired state
    if (hasExpired) {
        return (
            <View style={[styles.container, styles.expired]}>
                <Ionicons name="close-circle" size={14} color={COLORS.error} />
                <Text style={styles.expiredText}>EXPIRED</Text>
            </View>
        );
    }

    // Not started yet - show initial time with muted styling
    if (!timerActive) {
        return (
            <View style={[styles.container, styles.notStarted]}>
                <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.notStartedText}>{formatTime(INITIAL_DURATION)}</Text>
            </View>
        );
    }

    // Active countdown
    return (
        <View style={[
            styles.container,
            styles.active,
            isWarning && styles.warning,
            isCritical && styles.critical,
        ]}>
            <Ionicons
                name="time"
                size={14}
                color={isCritical ? COLORS.error : isWarning ? '#FFC13C' : COLORS.error}
            />
            <Text style={[
                styles.activeText,
                isWarning && styles.warningText,
                isCritical && styles.criticalText,
            ]}>
                {formatTime(timeLeft)}
            </Text>
        </View>
    );
};

// SINGLE style definition - used identically everywhere
const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 6,
        flexShrink: 0, // Never shrink in flex row
        minWidth: 70, // Ensure consistent width
    },

    // Not started state
    notStarted: {
        backgroundColor: 'rgba(170, 170, 170, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(170, 170, 170, 0.25)',
    },
    notStartedText: {
        color: COLORS.textSecondary,
        fontSize: 15,
        ...FONTS.bold,
        letterSpacing: 0.5,
    },

    // Active countdown state
    active: {
        backgroundColor: 'rgba(255, 46, 46, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 46, 46, 0.35)',
    },
    activeText: {
        color: COLORS.error,
        fontSize: 15,
        ...FONTS.bold,
        letterSpacing: 0.5,
    },

    // Warning state (< 30s)
    warning: {
        backgroundColor: 'rgba(255, 193, 60, 0.15)',
        borderColor: 'rgba(255, 193, 60, 0.35)',
    },
    warningText: {
        color: '#FFC13C',
    },

    // Critical state (< 10s)
    critical: {
        backgroundColor: 'rgba(255, 46, 46, 0.25)',
        borderColor: 'rgba(255, 46, 46, 0.5)',
    },
    criticalText: {
        color: COLORS.error,
    },

    // Expired state
    expired: {
        backgroundColor: 'rgba(255, 46, 46, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255, 46, 46, 0.25)',
    },
    expiredText: {
        color: COLORS.error,
        fontSize: 13,
        ...FONTS.bold,
        letterSpacing: 0.5,
    },
});

export default ViewTimer;
