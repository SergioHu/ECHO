import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

const StatCard = ({ label, value, icon, color, onPress }) => {
    const CardComponent = onPress ? TouchableOpacity : View;

    return (
        <CardComponent
            style={[styles.container, color && { borderColor: color }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {icon && <Text style={styles.icon}>{icon}</Text>}
            <Text style={[styles.value, color && { color }]}>{value}</Text>
            <Text style={styles.label}>{label}</Text>
        </CardComponent>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.m,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        minWidth: 100,
        minHeight: 90,
    },
    icon: {
        fontSize: 20,
        marginBottom: 4,
    },
    value: {
        fontSize: 24,
        color: COLORS.primary,
        ...FONTS.bold,
        marginBottom: 4,
    },
    label: {
        fontSize: 11,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        ...FONTS.medium,
    },
});

export default StatCard;
