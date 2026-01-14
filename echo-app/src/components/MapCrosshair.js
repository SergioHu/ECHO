import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

const MapCrosshair = () => {
    return (
        <View style={styles.wrapper}>
            <MaterialCommunityIcons name="crosshairs-gps" size={32} color={COLORS.primary} />
            <View style={styles.centerDot} />
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerDot: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
    }
});

export default MapCrosshair;
