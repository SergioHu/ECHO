import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';

// ============================================
// ONBOARDING CONTROLS - FIXED POSITION SYSTEM
// ============================================
// Dots, Button, Skip are ALWAYS at same Y position
// No slide can move these elements

const BOTTOM_BUTTON_Y = 78;
const DOTS_Y = 155;
const SKIP_Y = 34;
const BUTTON_WIDTH = '85%';
const BUTTON_MAX_WIDTH = 360;
const BUTTON_HEIGHT = 56;
const BUTTON_RADIUS = 28;
const DOT_SIZE = 8;
const DOT_ACTIVE_WIDTH = 24;

const PREMIUM = {
    neonAqua: '#00E6FF',
    neonGlow: 'rgba(0, 230, 255, 0.35)',
    textTertiary: 'rgba(0, 230, 255, 0.55)',
    dotInactive: 'rgba(255, 255, 255, 0.25)',
};

const OnboardingControls = ({
    totalSlides,
    currentIndex,
    buttonLabel,
    onButtonPress,
    onSkipPress,
    showSkip = true,
}) => {
    const buttonScale = useRef(new Animated.Value(1)).current;
    const dotAnimations = useRef(
        Array.from({ length: totalSlides }, () => new Animated.Value(0))
    ).current;

    // Animate active dot
    useEffect(() => {
        dotAnimations.forEach((anim, index) => {
            Animated.timing(anim, {
                toValue: index === currentIndex ? 1 : 0,
                duration: 200,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }).start();
        });
    }, [currentIndex]);

    const handlePressIn = () => {
        Animated.spring(buttonScale, {
            toValue: 0.96,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(buttonScale, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };

    return (
        <>
            {/* Dots - Fixed absolute position */}
            <View style={styles.dotsContainer}>
                {dotAnimations.map((anim, index) => {
                    const dotWidth = anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [DOT_SIZE, DOT_ACTIVE_WIDTH],
                    });

                    const dotOpacity = anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1],
                    });

                    const dotColor = anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [PREMIUM.dotInactive, PREMIUM.neonAqua],
                    });

                    return (
                        <Animated.View
                            key={index}
                            style={[
                                styles.dot,
                                {
                                    width: dotWidth,
                                    opacity: dotOpacity,
                                    backgroundColor: dotColor,
                                },
                                currentIndex === index && styles.dotActiveGlow,
                            ]}
                        />
                    );
                })}
            </View>

            {/* Primary Button - Fixed absolute position */}
            <Animated.View
                style={[
                    styles.buttonWrapper,
                    { transform: [{ scale: buttonScale }] }
                ]}
            >
                <TouchableOpacity
                    style={styles.button}
                    onPress={onButtonPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    activeOpacity={1}
                >
                    <Text style={styles.buttonText}>{buttonLabel}</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Skip Button - Fixed absolute position */}
            {showSkip && (
                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={onSkipPress}
                    activeOpacity={0.7}
                >
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    // DOTS - Fixed absolute position
    dotsContainer: {
        position: 'absolute',
        bottom: DOTS_Y,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        marginHorizontal: 4,
    },
    dotActiveGlow: {
        shadowColor: PREMIUM.neonAqua,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 4,
    },

    // BUTTON - Fixed absolute position
    buttonWrapper: {
        position: 'absolute',
        bottom: BOTTOM_BUTTON_Y,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    button: {
        width: BUTTON_WIDTH,
        maxWidth: BUTTON_MAX_WIDTH,
        height: BUTTON_HEIGHT,
        backgroundColor: PREMIUM.neonAqua,
        borderRadius: BUTTON_RADIUS,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: PREMIUM.neonAqua,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    buttonText: {
        fontSize: 16,
        color: '#000000',
        fontWeight: '700',
        letterSpacing: 1.2,
        textAlign: 'center',
    },

    // SKIP - Fixed absolute position
    skipButton: {
        position: 'absolute',
        bottom: SKIP_Y,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    skipText: {
        fontSize: 14,
        color: PREMIUM.textTertiary,
        fontWeight: '500',
        letterSpacing: 0.3,
        textAlign: 'center',
    },
});

export default OnboardingControls;
