import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// ============================================
// GLOBAL LAYOUT GRID SYSTEM - DO NOT MODIFY
// ============================================
const GRID = {
    LOGO_SECTION_TOP: 0,
    SPACE_LOGO_TO_TAGLINE: 40,
    SPACE_TAGLINE_TO_PROGRESS: 80,
    PROGRESS_WIDTH: '80%',
    PROGRESS_MAX_WIDTH: 320,
    VERSION_BOTTOM: 50,
};

// Premium Color Palette - DO NOT MODIFY
const PREMIUM = {
    neonAqua: '#00E6FF',
    neonGlow: 'rgba(0, 230, 255, 0.35)',
    neonGlowStrong: 'rgba(0, 230, 255, 0.55)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(0, 230, 255, 0.75)',
    textTertiary: 'rgba(0, 230, 255, 0.55)',
    background: '#000000',
    surface: 'rgba(255, 255, 255, 0.04)',
    border: 'rgba(0, 230, 255, 0.35)',
};

const LOADING_MESSAGES = [
    "Initializing systems...",
    "Connecting to network...",
    "Calibrating radar...",
    "Loading your profile...",
    "Almost ready...",
    "Welcome to ECHO"
];

const SplashScreen = ({ navigation }) => {
    const [progress, setProgress] = useState(0);
    const [messageIndex, setMessageIndex] = useState(0);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0.2)).current;
    const ring1Anim = useRef(new Animated.Value(0)).current;
    const ring2Anim = useRef(new Animated.Value(0)).current;
    const ring3Anim = useRef(new Animated.Value(0)).current;
    const progressWidth = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const taglineFade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Initial fade in with scale
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(logoScale, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();

        // Delayed tagline fade
        setTimeout(() => {
            Animated.timing(taglineFade, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();
        }, 400);

        // Premium pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Glow animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 0.6,
                    duration: 2500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0.2,
                    duration: 2500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Ring animations - staggered radar effect
        const startRingAnimation = (anim, delay) => {
            setTimeout(() => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, {
                            toValue: 1,
                            duration: 2500,
                            easing: Easing.out(Easing.ease),
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim, {
                            toValue: 0,
                            duration: 0,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            }, delay);
        };

        startRingAnimation(ring1Anim, 0);
        startRingAnimation(ring2Anim, 800);
        startRingAnimation(ring3Anim, 1600);

        // Shimmer effect
        Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: 1200,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // Progress animation (3 seconds)
        const duration = 3000;
        const startTime = Date.now();

        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / duration) * 100, 100);
            setProgress(Math.round(newProgress));

            const newMessageIndex = Math.min(
                Math.floor(newProgress / 18),
                LOADING_MESSAGES.length - 1
            );
            setMessageIndex(newMessageIndex);

            Animated.timing(progressWidth, {
                toValue: newProgress,
                duration: 80,
                useNativeDriver: false,
            }).start();

            if (newProgress >= 100) {
                clearInterval(progressInterval);
                checkFirstLaunch();
            }
        }, 40);

        return () => clearInterval(progressInterval);
    }, []);

    const checkFirstLaunch = () => {
        // Always go to onboarding on every app launch
        // Flow: Splash → Onboarding → Auth → MainTabs
        setTimeout(() => {
            navigation.replace('Onboarding');
        }, 500);
    };

    const ringScale1 = ring1Anim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 3],
    });

    const ringScale2 = ring2Anim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 2.5],
    });

    const ringScale3 = ring3Anim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 2],
    });

    const shimmerTranslate = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-100, width + 100],
    });

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Radial Gradient Background */}
                <View style={styles.gradientContainer}>
                    <LinearGradient
                        colors={['rgba(0, 230, 255, 0.12)', 'rgba(0, 230, 255, 0.04)', 'transparent']}
                        style={styles.radialGradient}
                        start={{ x: 0.5, y: 0.5 }}
                        end={{ x: 1, y: 1 }}
                    />
                </View>

                {/* Animated Rings (Radar Effect) */}
                <View style={styles.ringsContainer}>
                    <Animated.View
                        style={[
                            styles.ring,
                            {
                                opacity: ring1Anim.interpolate({
                                    inputRange: [0, 0.8, 1],
                                    outputRange: [0.5, 0.2, 0],
                                }),
                                transform: [{ scale: ringScale1 }]
                            }
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.ring,
                            {
                                opacity: ring2Anim.interpolate({
                                    inputRange: [0, 0.8, 1],
                                    outputRange: [0.4, 0.15, 0],
                                }),
                                transform: [{ scale: ringScale2 }]
                            }
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.ring,
                            {
                                opacity: ring3Anim.interpolate({
                                    inputRange: [0, 0.8, 1],
                                    outputRange: [0.3, 0.1, 0],
                                }),
                                transform: [{ scale: ringScale3 }]
                            }
                        ]}
                    />
                </View>

                {/* Main Content - Centered */}
                <View style={styles.contentContainer}>
                    {/* Logo Container */}
                    <Animated.View
                        style={[
                            styles.logoContainer,
                            {
                                opacity: fadeAnim,
                                transform: [{ scale: logoScale }]
                            }
                        ]}
                    >
                        {/* Outer Glow */}
                        <Animated.View
                            style={[
                                styles.logoGlow,
                                { opacity: glowAnim }
                            ]}
                        />

                        {/* Premium Logo Box */}
                        <Animated.View
                            style={[
                                styles.logoBorder,
                                { transform: [{ scale: pulseAnim }] }
                            ]}
                        >
                            <View style={styles.logoInner}>
                                <Text style={styles.logoText}>ECHO</Text>
                            </View>
                        </Animated.View>
                    </Animated.View>

                    {/* Premium Tagline */}
                    <Animated.View style={[styles.taglineContainer, { opacity: taglineFade }]}>
                        <Text style={styles.tagline}>See the world through</Text>
                        <Text style={styles.taglineHighlight}>someone else's eyes</Text>
                    </Animated.View>
                </View>

                {/* Progress Section - Fixed at bottom */}
                <Animated.View style={[styles.progressSection, { opacity: fadeAnim }]}>
                    {/* Progress Bar Container */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                            <Animated.View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: progressWidth.interpolate({
                                            inputRange: [0, 100],
                                            outputRange: ['0%', '100%'],
                                        })
                                    }
                                ]}
                            >
                                {/* Shimmer Effect */}
                                <Animated.View
                                    style={[
                                        styles.shimmer,
                                        { transform: [{ translateX: shimmerTranslate }] }
                                    ]}
                                />
                            </Animated.View>
                        </View>

                        {/* Progress Percentage */}
                        <Text style={styles.progressText}>{progress}%</Text>
                    </View>

                    {/* Loading Message */}
                    <Text style={styles.loadingMessage}>
                        {LOADING_MESSAGES[messageIndex]}
                    </Text>
                </Animated.View>

                {/* Version - Fixed at bottom */}
                <Animated.Text style={[styles.version, { opacity: fadeAnim }]}>
                    v1.0.0
                </Animated.Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    // ============================================
    // GLOBAL GRID LAYOUT - 100% CONSISTENT
    // ============================================
    safeArea: {
        flex: 1,
        backgroundColor: PREMIUM.background,
    },
    container: {
        flex: 1,
        backgroundColor: PREMIUM.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gradientContainer: {
        position: 'absolute',
        width: width * 2,
        height: width * 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radialGradient: {
        width: width * 1.5,
        height: width * 1.5,
        borderRadius: width,
    },
    ringsContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ring: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 1.5,
        borderColor: PREMIUM.neonAqua,
    },

    // CONTENT - Centered vertically
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: GRID.SPACE_LOGO_TO_TAGLINE,
    },
    logoGlow: {
        position: 'absolute',
        width: 260,
        height: 130,
        borderRadius: 65,
        backgroundColor: PREMIUM.neonAqua,
    },
    logoBorder: {
        borderWidth: 2,
        borderColor: PREMIUM.neonAqua,
        borderRadius: 20,
        padding: 5,
        backgroundColor: PREMIUM.background,
        shadowColor: PREMIUM.neonAqua,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 25,
        elevation: 25,
    },
    logoInner: {
        paddingHorizontal: 40,
        paddingVertical: 20,
        borderRadius: 15,
        backgroundColor: PREMIUM.surface,
        borderWidth: 1,
        borderColor: PREMIUM.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: 56,
        color: PREMIUM.neonAqua,
        fontWeight: '700',
        letterSpacing: 14,
        textAlign: 'center',
        textShadowColor: PREMIUM.neonAqua,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
    },
    taglineContainer: {
        alignItems: 'center',
        marginBottom: GRID.SPACE_TAGLINE_TO_PROGRESS,
    },
    tagline: {
        fontSize: 18,
        color: PREMIUM.textSecondary,
        textAlign: 'center',
        fontWeight: '400',
        letterSpacing: 0.5,
        lineHeight: 24,
    },
    taglineHighlight: {
        fontSize: 22,
        color: PREMIUM.neonAqua,
        textAlign: 'center',
        marginTop: 6,
        fontWeight: '600',
        letterSpacing: 0.3,
        lineHeight: 28,
        textShadowColor: PREMIUM.neonGlow,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },

    // PROGRESS SECTION - Consistent width
    progressSection: {
        position: 'absolute',
        bottom: 120,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    progressContainer: {
        width: GRID.PROGRESS_WIDTH,
        maxWidth: GRID.PROGRESS_MAX_WIDTH,
        alignItems: 'center',
        marginBottom: 20,
    },
    progressTrack: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 230, 255, 0.2)',
    },
    progressFill: {
        height: '100%',
        backgroundColor: PREMIUM.neonAqua,
        borderRadius: 3,
        overflow: 'hidden',
        shadowColor: PREMIUM.neonAqua,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        transform: [{ skewX: '-20deg' }],
    },
    progressText: {
        fontSize: 18,
        color: PREMIUM.neonAqua,
        fontWeight: '700',
        letterSpacing: 1,
        textAlign: 'center',
        textShadowColor: PREMIUM.neonGlow,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 6,
    },
    loadingMessage: {
        fontSize: 14,
        color: PREMIUM.textSecondary,
        textAlign: 'center',
        fontWeight: '500',
        letterSpacing: 0.3,
        lineHeight: 20,
    },

    // VERSION - Fixed at bottom
    version: {
        position: 'absolute',
        bottom: GRID.VERSION_BOTTOM,
        fontSize: 12,
        color: PREMIUM.textTertiary,
        fontWeight: '400',
        letterSpacing: 1,
        textAlign: 'center',
    },
});

export default SplashScreen;
