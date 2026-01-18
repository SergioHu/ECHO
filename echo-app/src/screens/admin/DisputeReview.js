import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
    StatusBar,
    KeyboardAvoidingView,
    BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenCapture from 'expo-screen-capture';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { useAdminDisputes } from '../../hooks';

const DisputeReview = ({ navigation, route }) => {
    const { dispute: rawDispute } = route.params;
    const [adminNotes, setAdminNotes] = useState('');
    const [isResolving, setIsResolving] = useState(false);

    // Supabase hook for resolving disputes
    const { resolveDispute, isAdmin } = useAdminDisputes();

    // Handle Android hardware back button - go to DisputesList
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            navigation.navigate('DisputesList');
            return true;
        });
        return () => backHandler.remove();
    }, [navigation]);

    // Normalize dispute data (handle both mock and Supabase formats)
    const dispute = {
        id: rawDispute.id,
        price: rawDispute.price ?? (rawDispute.request_price ? rawDispute.request_price / 100 : 0),
        photoUri: rawDispute.photoUri ?? rawDispute.photo_url ?? null,
        reason: rawDispute.reason ?? 'No reason provided',
        description: rawDispute.description ?? null, // Additional details from requester
        distance: rawDispute.distance ?? 0,
        locationRequested: rawDispute.locationRequested ?? {
            lat: rawDispute.request_latitude ?? 0,
            lng: rawDispute.request_longitude ?? 0,
        },
        locationTaken: rawDispute.locationTaken ?? {
            lat: rawDispute.photo_latitude ?? 0,
            lng: rawDispute.photo_longitude ?? 0,
        },
        requester: rawDispute.requester ?? {
            name: rawDispute.creator_id?.substring(0, 8) ?? 'Unknown',
        },
        photographer: rawDispute.photographer ?? {
            name: rawDispute.agent_id?.substring(0, 8) ?? 'Unknown',
            rating: rawDispute.agent_rating ?? 'N/A',
            jobs: rawDispute.agent_jobs ?? 'N/A',
        },
    };

    // Screenshot protection
    useEffect(() => {
        const preventScreenCapture = async () => {
            await ScreenCapture.preventScreenCaptureAsync();
        };
        preventScreenCapture();

        return () => {
            ScreenCapture.allowScreenCaptureAsync();
        };
    }, []);

    const handleApprove = () => {
        Alert.alert(
            'Approve Photo',
            'The photo meets quality standards.\n\n• Photographer will be paid\n• Requester can continue viewing (3 min restored)\n• Dispute marked as resolved',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        setIsResolving(true);
                        try {
                            if (isAdmin && dispute.id) {
                                const { success, error } = await resolveDispute(
                                    dispute.id,
                                    `approved${adminNotes ? ': ' + adminNotes : ''}`,
                                    false // p_reject = false = approve
                                );
                                if (!success) {
                                    Alert.alert('Error', error?.message || 'Failed to approve');
                                    return;
                                }
                            }
                            Alert.alert('Photo Approved', 'Photographer paid. Requester can view the photo.');
                            // Navigate back with refresh flag to update the list
                            navigation.navigate('DisputesList', { refresh: true, switchToResolved: true });
                        } catch (err) {
                            Alert.alert('Error', 'Failed to approve dispute');
                        } finally {
                            setIsResolving(false);
                        }
                    },
                },
            ]
        );
    };

    const handleReject = () => {
        Alert.alert(
            'Reject Photo',
            'The photo does not meet standards.\n\n• Photo will be deleted\n• Job returns to map for other photographers\n• No payment processed',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        setIsResolving(true);
                        try {
                            if (isAdmin && dispute.id) {
                                const { success, error } = await resolveDispute(
                                    dispute.id,
                                    `rejected${adminNotes ? ': ' + adminNotes : ''}`,
                                    true // p_reject = true = reject photo, return to map
                                );
                                if (!success) {
                                    Alert.alert('Error', error?.message || 'Failed to reject');
                                    return;
                                }
                            }
                            Alert.alert('Photo Rejected', 'Job returned to map. Awaiting new photographer.');
                            // Navigate back with refresh flag to update the list
                            navigation.navigate('DisputesList', { refresh: true, switchToResolved: true });
                        } catch (err) {
                            Alert.alert('Error', 'Failed to reject dispute');
                        } finally {
                            setIsResolving(false);
                        }
                    },
                },
            ]
        );
    };

    // Handle back navigation - always go to DisputesList
    const handleGoBack = () => {
        navigation.navigate('DisputesList');
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={handleGoBack}
                        style={styles.backButton}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                        <Ionicons name="arrow-back" size={28} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        Dispute #{typeof dispute.id === 'string' ? dispute.id.substring(0, 8).toUpperCase() : dispute.id}
                    </Text>
                    {/* Empty view for header balance */}
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Photo */}
                    <View style={styles.photoContainer}>
                        <Image
                            source={{ uri: dispute.photoUri }}
                            style={styles.photo}
                            resizeMode="cover"
                        />
                        <View style={styles.screenshotWarning}>
                            <Ionicons name="shield-checkmark" size={14} color={COLORS.secondary} />
                            <Text style={styles.screenshotText}>Screenshot blocked</Text>
                        </View>
                    </View>

                    {/* Job Details */}
                    <View style={styles.detailsSection}>
                        <Text style={styles.sectionTitle}>Job Details:</Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>• Price:</Text>
                            <Text style={styles.detailValue}>€{(dispute.price || 0).toFixed(2)}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>• Location requested:</Text>
                            <Text style={styles.detailValue}>
                                {(dispute.locationRequested?.lat || 0).toFixed(2)}, {(dispute.locationRequested?.lng || 0).toFixed(2)}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>• Location taken:</Text>
                            <Text style={styles.detailValue}>
                                {(dispute.locationTaken?.lat || 0).toFixed(2)}, {(dispute.locationTaken?.lng || 0).toFixed(2)}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>• Distance:</Text>
                            <Text style={[styles.detailValue, { color: COLORS.secondary }]}>
                                {dispute.distance || 'N/A'}m ✓
                            </Text>
                        </View>
                    </View>

                    {/* Requester Reason */}
                    <View style={styles.reasonSection}>
                        <Text style={styles.sectionTitle}>
                            Requester ({dispute.requester.name}):
                        </Text>
                        <Text style={styles.reasonText}>Reason: "{dispute.reason}"</Text>
                        {dispute.description && (
                            <Text style={styles.descriptionText}>
                                Details: "{dispute.description}"
                            </Text>
                        )}
                    </View>

                    {/* Photographer Info */}
                    <View style={styles.photographerSection}>
                        <Text style={styles.sectionTitle}>
                            Photographer ({dispute.photographer.name}):
                        </Text>
                        <Text style={styles.photographerStats}>
                            Rating: {dispute.photographer.rating} ⭐ | Jobs: {dispute.photographer.jobs}
                        </Text>
                    </View>

                    {/* Admin Notes */}
                    <Text style={styles.sectionTitle}>Admin Notes (optional):</Text>
                    <TextInput
                        style={styles.notesInput}
                        placeholder="Add notes about your decision..."
                        placeholderTextColor={COLORS.textSecondary}
                        value={adminNotes}
                        onChangeText={setAdminNotes}
                        multiline
                    />

                    {/* Decision Buttons */}
                    <Text style={styles.decisionTitle}>Decision:</Text>

                    <TouchableOpacity
                        style={[styles.approveButton, isResolving && styles.buttonDisabled]}
                        onPress={handleApprove}
                        activeOpacity={0.8}
                        disabled={isResolving}
                    >
                        <View style={styles.buttonContent}>
                            {isResolving ? (
                                <ActivityIndicator size="small" color={COLORS.secondary} />
                            ) : (
                                <Text style={styles.buttonIcon}>✓</Text>
                            )}
                            <View>
                                <Text style={styles.approveButtonText}>APPROVE PHOTO</Text>
                                <Text style={styles.buttonSubtext}>
                                    Photographer gets paid
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.rejectButton, isResolving && styles.buttonDisabled]}
                        onPress={handleReject}
                        activeOpacity={0.8}
                        disabled={isResolving}
                    >
                        <View style={styles.buttonContent}>
                            {isResolving ? (
                                <ActivityIndicator size="small" color={COLORS.error} />
                            ) : (
                                <Text style={styles.buttonIcon}>✗</Text>
                            )}
                            <View>
                                <Text style={styles.rejectButtonText}>REJECT PHOTO</Text>
                                <Text style={styles.buttonSubtext}>
                                    Refund to requester, strike to photographer
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.m,
        // Add extra top padding on Android for StatusBar
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + SPACING.l : SPACING.l,
        paddingBottom: SPACING.m,
        minHeight: Platform.OS === 'android' ? 80 : 64, // Taller on Android
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        padding: 12,
        marginRight: SPACING.s,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
    },
    headerTitle: {
        fontSize: 16,
        color: COLORS.textPrimary,
        flex: 1,
        textAlign: 'center',
        ...FONTS.bold,
    },
    scrollContent: {
        padding: SPACING.m,
    },
    photoContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    photo: {
        width: '100%',
        height: 250,
    },
    screenshotWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: COLORS.surface,
        paddingVertical: 8,
    },
    screenshotText: {
        color: COLORS.secondary,
        fontSize: 12,
        ...FONTS.medium,
    },
    detailsSection: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    sectionTitle: {
        color: COLORS.textPrimary,
        fontSize: 14,
        marginBottom: SPACING.s,
        ...FONTS.bold,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    detailLabel: {
        color: COLORS.textSecondary,
        fontSize: 13,
        ...FONTS.regular,
    },
    detailValue: {
        color: COLORS.textPrimary,
        fontSize: 13,
        ...FONTS.medium,
    },
    reasonSection: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    reasonText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontStyle: 'italic',
        ...FONTS.regular,
    },
    descriptionText: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontStyle: 'italic',
        marginTop: SPACING.s,
        ...FONTS.regular,
    },
    photographerSection: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    photographerStats: {
        color: COLORS.textSecondary,
        fontSize: 13,
        ...FONTS.regular,
    },
    notesInput: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: SPACING.m,
        marginBottom: SPACING.l,
        color: COLORS.textPrimary,
        fontSize: 14,
        minHeight: 80,
        borderWidth: 1,
        borderColor: COLORS.border,
        textAlignVertical: 'top',
        ...FONTS.regular,
    },
    decisionTitle: {
        color: COLORS.textPrimary,
        fontSize: 16,
        marginBottom: SPACING.m,
        ...FONTS.bold,
    },
    approveButton: {
        backgroundColor: COLORS.secondary + '20',
        borderRadius: 12,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.secondary,
    },
    rejectButton: {
        backgroundColor: COLORS.error + '20',
        borderRadius: 12,
        padding: SPACING.m,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.error,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.m,
    },
    buttonIcon: {
        fontSize: 24,
        color: COLORS.textPrimary,
    },
    approveButtonText: {
        color: COLORS.secondary,
        fontSize: 16,
        ...FONTS.bold,
    },
    rejectButtonText: {
        color: COLORS.error,
        fontSize: 16,
        ...FONTS.bold,
    },
    buttonSubtext: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginTop: 2,
        ...FONTS.regular,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});

export default DisputeReview;
