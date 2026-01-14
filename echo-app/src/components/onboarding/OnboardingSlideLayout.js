import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import OnboardingIcon from './OnboardingIcon';

// ============================================
// ONBOARDING SLIDE LAYOUT - UNIFIED GRID SYSTEM
// ============================================
// ALL vertical spacing is defined here
// NO slide can use custom margins
// This ensures pixel-perfect alignment across all slides

const { width } = Dimensions.get('window');

// LOCKED CONSTANTS - DO NOT MODIFY PER SLIDE
const MAX_W = 360;
const H_PADDING = 28;
const ICON_BOX = 148;
const TITLE_GAP = 18;
const BODY_GAP = 14;
const CONTENT_TOP = 90;

const PREMIUM = {
    neonAqua: '#00E6FF',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.75)',
    background: '#000000',
};

// LOCKED TYPOGRAPHY - NO OVERRIDES ALLOWED
const TYPOGRAPHY = {
    title: {
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: -0.5,
        textAlign: 'center',
        color: PREMIUM.textPrimary,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
        lineHeight: 22,
        textAlign: 'center',
        color: PREMIUM.textSecondary,
        opacity: 0.75,
        maxWidth: 320,
    },
    bullet: {
        fontSize: 15,
        fontWeight: '500',
        lineHeight: 22,
        color: PREMIUM.textSecondary,
    },
};

const OnboardingSlideLayout = ({
    iconName,
    title,
    subtitle,
    bullets,
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        // Reset animations when slide changes
        fadeAnim.setValue(0);
        slideAnim.setValue(20);

        // Content fade in with slide
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                delay: 100,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                delay: 100,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    }, [title]);

    return (
        <View style={styles.container}>
            {/* Content Container - Fixed grid positioning */}
            <View style={styles.contentContainer}>
                {/* Icon Block - Fixed height */}
                <View style={styles.iconBlock}>
                    <OnboardingIcon name={iconName} />
                </View>

                {/* Title Block - Fixed spacing */}
                <Animated.View
                    style={[
                        styles.titleBlock,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <Text style={styles.title}>{title}</Text>
                </Animated.View>

                {/* Body Block - Fixed spacing */}
                <Animated.View
                    style={[
                        styles.bodyBlock,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {bullets && bullets.length > 0 ? (
                        <View style={styles.bulletList}>
                            {bullets.map((bullet, index) => (
                                <View key={index} style={styles.bulletRow}>
                                    <View style={styles.bulletDotArea}>
                                        <View style={styles.bulletDot} />
                                    </View>
                                    <Text style={styles.bulletText}>{bullet}</Text>
                                </View>
                            ))}
                        </View>
                    ) : subtitle ? (
                        <Text style={styles.subtitle}>{subtitle}</Text>
                    ) : null}
                </Animated.View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: width,
        flex: 1,
        backgroundColor: PREMIUM.background,
    },
    contentContainer: {
        flex: 1,
        marginTop: CONTENT_TOP,
        paddingHorizontal: H_PADDING,
        alignItems: 'center',
        width: '100%',
        maxWidth: MAX_W,
        alignSelf: 'center',
    },

    // ICON BLOCK - Fixed height, no custom margins
    iconBlock: {
        height: ICON_BOX,
        width: ICON_BOX,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: TITLE_GAP,
    },

    // TITLE BLOCK - Fixed spacing
    titleBlock: {
        width: '100%',
        alignItems: 'center',
        marginBottom: BODY_GAP,
    },
    title: {
        ...TYPOGRAPHY.title,
    },

    // BODY BLOCK - Fixed spacing
    bodyBlock: {
        width: '100%',
        alignItems: 'center',
    },
    subtitle: {
        ...TYPOGRAPHY.subtitle,
    },

    // BULLET LIST - Clean, no glow box
    bulletList: {
        width: '100%',
        maxWidth: MAX_W,
        alignSelf: 'center',
        paddingHorizontal: 6,
        marginTop: 4,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    bulletDotArea: {
        width: 16,
        paddingTop: 8,
    },
    bulletDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: PREMIUM.neonAqua,
    },
    bulletText: {
        flex: 1,
        ...TYPOGRAPHY.bullet,
    },
});

export default OnboardingSlideLayout;
