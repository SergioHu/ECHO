import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

const ScreenWrapper = ({ children, style }) => {
    return (
        <SafeAreaView style={[styles.container, style]} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
            <View style={styles.content}>
                {children}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
    },
});

export default ScreenWrapper;
