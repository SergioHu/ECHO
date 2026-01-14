import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../constants/theme';

const EchoToast = ({
    message,
    type = 'info',
    visible,
    onHide
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-50)).current; // Slide from top

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(translateY, {
                    toValue: 0,
                    friction: 5,
                    useNativeDriver: true,
                })
            ]).start();

            const timer = setTimeout(() => {
                hideToast();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const hideToast = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: -50,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start(() => {
            if (onHide) onHide();
        });
    };

    const getColor = () => {
        switch (type) {
            case 'success': return COLORS.primary;
            case 'error': return COLORS.error;
            case 'warning': return '#FF8C00';
            default: return COLORS.secondary;
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return 'checkmark-circle';
            case 'error': return 'alert-circle';
            case 'warning': return 'time';
            default: return 'information-circle';
        }
    };

    if (!visible && fadeAnim._value === 0) return null;

    const isWarning = type === 'warning';

    return (
        <Animated.View
            style={[
                styles.containerWrapper,
                isWarning && styles.warningWrapper, // Only apply specific positioning for Hurry Up
                {
                    opacity: fadeAnim,
                    transform: [{ translateY }],
                }
            ]}
            pointerEvents="none"
        >
            <BlurView intensity={20} tint="dark" style={[styles.glassContainer, { borderColor: getColor() }]}>
                <View style={[styles.iconBox, { backgroundColor: getColor() }]}>
                    <Ionicons name={getIcon()} size={16} color="#FFF" />
                </View>
                <Text style={[styles.text, isWarning && styles.warningText]}>{message}</Text>
            </BlurView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    containerWrapper: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 75 : 60,
        alignSelf: 'center', // Back to center for normal toasts
        minWidth: 200,
        maxWidth: '85%',
        zIndex: 9999,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 10,
    },
    warningWrapper: {
        maxWidth: '70%', // Increased from 60% to give more room
        minWidth: 200,
    },
    warningText: {
        flex: 1,
        flexShrink: 1, // Ensure text shrinks to fit
        flexWrap: 'wrap', // Ensure text wraps
    },
    glassContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1,
        backgroundColor: 'rgba(20, 20, 20, 0.6)',
    },
    iconBox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    text: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 13,
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    warningText: {
        flex: 1,
    }
});

export default EchoToast;
