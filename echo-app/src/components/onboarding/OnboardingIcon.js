import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ============================================
// ONBOARDING ICON - PURE CIRCULAR GEOMETRY
// ============================================
// NO pentagons, NO plates, NO polygons
// Pure circles only - calm, balanced, premium
// Comparable to Apple onboarding screens

// FIXED DIMENSIONS - SAME FOR ALL ICONS
const OUTER_GLOW = 148;      // Outer glow circle
const INNER_RING = 112;      // Inner subtle ring (low opacity)
const GLYPH_SIZE = 48;       // Icon glyph - same for all

const PREMIUM = {
    neonAqua: '#00E6FF',
    // Outer glow - very subtle
    outerGlow: 'rgba(0, 230, 255, 0.12)',
    // Inner ring - barely visible, just defines space
    innerRing: 'rgba(0, 230, 255, 0.06)',
    innerRingBorder: 'rgba(0, 230, 255, 0.15)',
};

// Icon name to Ionicons mapping - NO per-icon styling
const ICON_MAP = {
    'target': 'scan-outline',
    'camera': 'camera-outline',
    'map': 'map-outline',
    'legal': 'shield-checkmark-outline',
    'warning': 'warning-outline',
    'location': 'location-outline',
    'rocket': 'rocket-outline',
};

const OnboardingIcon = ({ name, color = PREMIUM.neonAqua }) => {
    const glowAnim = useRef(new Animated.Value(0.12)).current;

    useEffect(() => {
        // Very subtle glow breathing - calm and quiet
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 0.25,
                    duration: 3000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0.12,
                    duration: 3000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const resolvedIcon = ICON_MAP[name] || 'ellipse-outline';

    return (
        <View style={styles.container}>
            {/* Layer 1: Outer Glow Circle - diffuse, subtle */}
            <Animated.View style={[styles.outerGlow, { opacity: glowAnim }]} />

            {/* Layer 2: Inner Ring - barely visible, defines space */}
            <View style={styles.innerRing} />

            {/* Layer 3: Icon Glyph - mathematically centered */}
            <Ionicons
                name={resolvedIcon}
                size={GLYPH_SIZE}
                color={color}
                style={styles.glyph}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    // Container - perfect square, centered
    container: {
        width: OUTER_GLOW,
        height: OUTER_GLOW,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Layer 1: Outer glow - soft, diffuse circle
    outerGlow: {
        position: 'absolute',
        width: OUTER_GLOW,
        height: OUTER_GLOW,
        borderRadius: OUTER_GLOW / 2,
        backgroundColor: PREMIUM.neonAqua,
    },

    // Layer 2: Inner ring - subtle definition
    innerRing: {
        position: 'absolute',
        width: INNER_RING,
        height: INNER_RING,
        borderRadius: INNER_RING / 2,
        backgroundColor: PREMIUM.innerRing,
        borderWidth: 1,
        borderColor: PREMIUM.innerRingBorder,
    },

    // Layer 3: Glyph - centered, subtle glow
    glyph: {
        textShadowColor: PREMIUM.neonAqua,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
    },
});

export default OnboardingIcon;
