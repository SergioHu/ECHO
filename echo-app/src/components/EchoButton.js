import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

const EchoButton = ({ title, onPress, variant = 'primary', loading = false, disabled = false, style }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
            speed: 20,
            bounciness: 10,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 10,
        }).start();
    };

    const getBackgroundColor = () => {
        if (disabled) return COLORS.surface;
        if (variant === 'primary') return COLORS.primary;
        if (variant === 'danger') return COLORS.error;
        return 'transparent';
    };

    const getTextColor = () => {
        if (disabled) return COLORS.textSecondary;
        if (variant === 'primary') return '#000000'; // Black text on Cyan
        if (variant === 'danger') return '#FFFFFF';
        return COLORS.primary; // Outline variant
    };

    const getBorder = () => {
        if (variant === 'outline') return { borderWidth: 1, borderColor: COLORS.primary };
        return {};
    };

    return (
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
            <TouchableOpacity
                style={[
                    styles.button,
                    { backgroundColor: getBackgroundColor() },
                    getBorder(),
                ]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
                activeOpacity={0.9} // Less opacity change since we have scale
            >
                {loading ? (
                    <ActivityIndicator color={getTextColor()} />
                ) : (
                    <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    button: {
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    text: {
        fontSize: 16,
        ...FONTS.bold,
    },
});

export default EchoButton;
