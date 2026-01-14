import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';

export const EchoModal = ({
    visible,
    type = 'info',
    title,
    message,
    primaryActionText = "OK",
    onPrimaryAction,
    secondaryActionText,
    onSecondaryAction
}) => {

    const getColor = () => {
        switch (type) {
            case 'success': return COLORS.primary; // Your neon green
            case 'error': return COLORS.error;
            default: return COLORS.secondary;
        }
    };

    const getIcon = () => {
        const color = getColor();
        switch (type) {
            case 'success': return <Ionicons name="checkmark-circle" color={color} size={32} />;
            case 'error': return <Ionicons name="alert-circle" color={color} size={32} />;
            default: return <Ionicons name="information-circle" color={color} size={32} />;
        }
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={[styles.modalContainer, { borderColor: getColor() }]}>

                    <View style={styles.header}>
                        {getIcon()}
                        <Text style={styles.title}>{title.toUpperCase()}</Text>
                    </View>

                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.actions}>
                        {secondaryActionText && (
                            <TouchableOpacity
                                style={[styles.button, styles.secondaryButton]}
                                onPress={onSecondaryAction}
                            >
                                <Text style={styles.secondaryText}>{secondaryActionText}</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: getColor() }]}
                            onPress={onPrimaryAction}
                        >
                            <Text style={styles.primaryText}>{primaryActionText}</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#121212',
        borderWidth: 1,
        borderRadius: 16,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 1,
        ...FONTS.bold,
    },
    message: {
        color: '#A0A0A0',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 24,
        ...FONTS.regular,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#333',
    },
    primaryText: {
        color: '#121212',
        fontWeight: '900',
        fontSize: 14,
        ...FONTS.bold,
    },
    secondaryText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
        ...FONTS.medium,
    }
});
