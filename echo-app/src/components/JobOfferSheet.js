import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../constants/theme';

const { height } = Dimensions.get('window');

const JobOfferSheet = ({ job, distance, onClose, onAccept, canAccept = true }) => {
    // FIX: Garantir que price é número e formatar correctamente
    const formatPrice = (price) => {
        if (price === null || price === undefined) return '€0.00';
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        if (isNaN(numPrice)) return '€0.00';
        return `€${numPrice.toFixed(2)}`;
    };

    return (
        <View style={styles.overlay}>
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
            <View style={styles.sheet}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Available Job</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Request Details */}
                {job.description && (
                    <View style={styles.detailsContainer}>
                        <Text style={styles.detailsLabel}>Request Details:</Text>
                        <Text style={styles.detailsText}>{job.description}</Text>
                    </View>
                )}

                {/* Distance */}
                <View style={styles.distanceContainer}>
                    <Ionicons name="walk-outline" size={20} color={COLORS.textSecondary} />
                    <Text style={styles.distanceText}>approx. {distance || 0}m away</Text>
                </View>

                {/* Price - FIX: Usar formatPrice() */}
                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>You'll earn:</Text>
                    <Text style={styles.priceValue}>{formatPrice(job.price)}</Text>
                </View>

                {/* Warning - Only show when NOT within 10m */}
                {!canAccept && (
                    <View style={styles.warningContainer}>
                        <Ionicons name="alert-circle-outline" size={16} color="#FF3B3B" />
                        <Text style={styles.warningText}>
                            You must be within 10m to submit the photo
                        </Text>
                    </View>
                )}

                {/* Action Button */}
                <Pressable
                    onPress={canAccept ? onAccept : null}
                    style={[styles.acceptButton, !canAccept && styles.acceptButtonDisabled]}
                >
                    <Text style={[styles.acceptButtonText, !canAccept && styles.acceptButtonTextDisabled]}>
                        ACCEPT JOB
                    </Text>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flex: 1,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: SPACING.l,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    headerTitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        ...FONTS.medium,
    },
    distanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    distanceText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginLeft: SPACING.s,
    },
    priceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    priceLabel: {
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    priceValue: {
        color: COLORS.secondary,
        fontSize: 32,
        ...FONTS.bold,
    },
    detailsContainer: {
        backgroundColor: 'rgba(0, 255, 255, 0.05)',
        padding: SPACING.m,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
        marginBottom: SPACING.m,
    },
    detailsLabel: {
        color: COLORS.primary,
        fontSize: 12,
        ...FONTS.bold,
        marginBottom: SPACING.s,
        textTransform: 'uppercase',
    },
    detailsText: {
        color: COLORS.textPrimary,
        fontSize: 14,
        lineHeight: 20,
    },
    warningContainer: {
        backgroundColor: 'rgba(255, 0, 0, 0.18)',
        borderColor: 'rgba(255, 0, 0, 0.35)',
        borderWidth: 1.4,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    warningText: {
        color: '#FF3B3B',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: SPACING.s,
        flex: 1,
    },
    acceptButton: {
        width: '100%',
        height: 56,
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: {
            width: 0,
            height: 3
        },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 6,
    },
    acceptButtonDisabled: {
        backgroundColor: 'rgba(0, 200, 255, 0.4)',
        opacity: 0.4,
        shadowOpacity: 0,
        elevation: 0,
    },
    acceptButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    acceptButtonTextDisabled: {
        color: '#D0D0D0',
    },
});

export default JobOfferSheet;