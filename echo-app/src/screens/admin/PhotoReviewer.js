import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Image,
    Alert,
    StatusBar,
    Platform,
    Dimensions,
    ActivityIndicator,
    RefreshControl,
    BackHandler,
    Modal,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenCapture from 'expo-screen-capture';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { getPendingPhotos, updatePhotoStatus, subscribe } from '../../store/jobStore';
import { useToast } from '../../context/ToastContext';
import { useAdminPhotos } from '../../hooks';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Predefined rejection reasons
const REJECTION_REASONS = [
    { id: 'blurry', label: 'Blurry or out of focus' },
    { id: 'wrong_location', label: 'Wrong location' },
    { id: 'wrong_subject', label: 'Wrong subject/content' },
    { id: 'poor_quality', label: 'Poor image quality' },
    { id: 'inappropriate', label: 'Inappropriate content' },
    { id: 'obstructed', label: 'View obstructed' },
    { id: 'other', label: 'Other reason' },
];

// 3 minutes = 180 seconds
const REVIEW_TIME_SECONDS = 180;

const PhotoReviewer = ({ navigation }) => {
    const { showToast } = useToast();
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(REVIEW_TIME_SECONDS);
    const [localPhotos, setLocalPhotos] = useState([]);
    const [isCompromised, setIsCompromised] = useState(false);
    // Track photos that have been processed (approved/rejected) to hide them immediately
    const [processedPhotoIds, setProcessedPhotoIds] = useState(new Set());

    // Rejection modal state
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedReason, setSelectedReason] = useState(null);
    const [customReason, setCustomReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);

    // Supabase hook for real photos
    const {
        photos: supabasePhotos,
        loading,
        refetch,
        approvePhoto: supabaseApprove,
        rejectPhoto: supabaseReject,
        isAdmin
    } = useAdminPhotos();

    // Handle Android hardware back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (selectedPhoto) {
                // If viewing a photo, go back to list
                setSelectedPhoto(null);
                setTimeRemaining(REVIEW_TIME_SECONDS);
                return true; // Prevent default back behavior
            }
            // Otherwise let default back behavior happen (go to Admin Dashboard)
            return false;
        });

        return () => backHandler.remove();
    }, [selectedPhoto]);

    // Load photos from local store and subscribe to changes
    useEffect(() => {
        setLocalPhotos(getPendingPhotos());

        const unsubscribe = subscribe(() => {
            setLocalPhotos(getPendingPhotos());
        });

        return () => unsubscribe();
    }, []);

    // Merge Supabase and local photos, filtering out already processed ones
    const photos = useMemo(() => {
        const supabaseItems = supabasePhotos.map(p => ({
            ...p,
            isSupabase: true,
            photoUri: p.photoUrl, // Map Supabase field
        }));
        const localItems = localPhotos.map(p => ({
            ...p,
            isLocal: true,
        }));
        // Filter out photos that have been processed during this session
        return [...supabaseItems, ...localItems].filter(p => !processedPhotoIds.has(p.id));
    }, [supabasePhotos, localPhotos, processedPhotoIds]);

    // Screenshot protection when viewing photo
    useEffect(() => {
        if (selectedPhoto) {
            const preventScreenCapture = async () => {
                await ScreenCapture.preventScreenCaptureAsync();
            };
            preventScreenCapture();

            // Screenshot detection listener
            const screenshotSubscription = ScreenCapture.addScreenshotListener(() => {
                setIsCompromised(true);
                showToast('Screenshots are NOT allowed!', 'error');
            });

            // Timer countdown - 3 minutes
            const timer = setInterval(() => {
                setTimeRemaining((prev) => {
                    // Show 30-second warning
                    if (prev === 31) {
                        showToast('30 seconds remaining!', 'warning');
                    }
                    if (prev <= 1) {
                        clearInterval(timer);
                        setSelectedPhoto(null);
                        setTimeRemaining(REVIEW_TIME_SECONDS);
                        return REVIEW_TIME_SECONDS;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => {
                clearInterval(timer);
                screenshotSubscription.remove();
                ScreenCapture.allowScreenCaptureAsync();
            };
        }
    }, [selectedPhoto]);

    // Format time as MM:SS
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleApprove = () => {
        Alert.alert(
            'Approve Photo',
            'Are you sure you want to approve this photo?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        // Store photo id before clearing
                        const photoId = selectedPhoto.id;
                        const isSupabase = selectedPhoto.isSupabase;

                        // Mark as processed immediately to hide from list
                        setProcessedPhotoIds(prev => new Set([...prev, photoId]));

                        // Clear selected photo
                        setSelectedPhoto(null);
                        setTimeRemaining(REVIEW_TIME_SECONDS);

                        try {
                            if (isSupabase) {
                                const result = await supabaseApprove(photoId);
                                if (!result?.success) throw new Error(result?.error || 'Failed to approve');
                            } else {
                                updatePhotoStatus(photoId, 'approved');
                            }
                            showToast('Photo approved!', 'success');
                            // Refresh list to get updated photos
                            refetch();
                        } catch (error) {
                            console.error('Approve error:', error);
                            showToast('Failed to approve photo', 'error');
                            // Remove from processed on error so it shows again
                            setProcessedPhotoIds(prev => {
                                const next = new Set(prev);
                                next.delete(photoId);
                                return next;
                            });
                        }
                    },
                },
            ]
        );
    };

    // Show rejection modal instead of alert
    const handleReject = () => {
        setSelectedReason(null);
        setCustomReason('');
        setShowRejectModal(true);
    };

    // Build rejection reason string from selection + custom text
    const buildRejectionReason = () => {
        const reasonObj = REJECTION_REASONS.find(r => r.id === selectedReason);
        const reasonLabel = reasonObj?.label || '';

        if (customReason.trim()) {
            return reasonLabel ? `${reasonLabel}: ${customReason.trim()}` : customReason.trim();
        }
        return reasonLabel || 'Rejected by reviewer';
    };

    // Confirm rejection with selected reason
    const confirmReject = async () => {
        if (!selectedReason) {
            showToast('Please select a rejection reason', 'warning');
            return;
        }

        setIsRejecting(true);
        const photoId = selectedPhoto.id;
        const isSupabase = selectedPhoto.isSupabase;
        const rejectionReason = buildRejectionReason();

        // Mark as processed immediately to hide from list
        setProcessedPhotoIds(prev => new Set([...prev, photoId]));

        // Close modal and clear photo
        setShowRejectModal(false);
        setSelectedPhoto(null);
        setTimeRemaining(REVIEW_TIME_SECONDS);

        try {
            if (isSupabase) {
                const result = await supabaseReject(photoId, rejectionReason);
                if (!result?.success) throw new Error(result?.error || 'Failed to reject');
            } else {
                updatePhotoStatus(photoId, 'rejected');
            }
            showToast('Photo rejected', 'warning');
            // Refresh list to get updated photos
            refetch();
        } catch (error) {
            console.error('Reject error:', error);
            showToast('Failed to reject photo', 'error');
            // Remove from processed on error so it shows again
            setProcessedPhotoIds(prev => {
                const next = new Set(prev);
                next.delete(photoId);
                return next;
            });
        } finally {
            setIsRejecting(false);
        }
    };

    const renderPhotoCard = (photo) => {
        // Support both local and Supabase data formats
        const takenDate = photo.takenAt || photo.created_at
            ? new Date(photo.takenAt || photo.created_at).toLocaleString()
            : 'Unknown';
        const jobId = photo.jobId || photo.request_id?.slice(0, 8) || 'N/A';
        const price = photo.price || (photo.price_cents ? photo.price_cents / 100 : 0);
        const photoUri = photo.photoUri || photo.photoUrl;
        const status = photo.status || 'pending';
        const sourceLabel = photo.isSupabase ? '☁️' : '📱';

        return (
            <TouchableOpacity
                key={photo.id}
                style={styles.photoCard}
                onPress={() => setSelectedPhoto(photo)}
                activeOpacity={0.7}
            >
                <View style={styles.cardContent}>
                    {/* Photo Thumbnail */}
                    <View style={styles.photoThumb}>
                        {photoUri ? (
                            <Image
                                source={{ uri: photoUri }}
                                style={styles.thumbImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <Ionicons name="image" size={24} color={COLORS.textSecondary} />
                        )}
                    </View>
                    <View style={styles.photoInfo}>
                        <Text style={styles.jobText}>{sourceLabel} Job #{jobId} - €{price.toFixed(2)}</Text>
                        <Text style={styles.timeText}>Taken: {takenDate}</Text>
                        <View style={styles.statusRow}>
                            <View style={[
                                styles.statusBadge,
                                status === 'pending' || status === 'submitted'
                                    ? styles.statusPending
                                    : styles.statusDisputed
                            ]}>
                                <Text style={styles.statusText}>
                                    {status === 'pending' || status === 'submitted' ? 'Pending Review' : 'Disputed'}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => setSelectedPhoto(photo)}
                    >
                        <Text style={styles.viewButtonText}>VIEW</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    // Photo Viewer Modal
    if (selectedPhoto) {
        const locationTaken = selectedPhoto.locationTaken;
        const locationRequested = selectedPhoto.locationRequested;

        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => {
                                setSelectedPhoto(null);
                                setTimeRemaining(REVIEW_TIME_SECONDS);
                            }}
                            style={styles.backButton}
                        >
                            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Photo Review</Text>
                        <View style={styles.timerContainer}>
                            <Ionicons name="time-outline" size={16} color={COLORS.error} />
                            <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {/* Photo */}
                        <View style={styles.photoContainer}>
                            <Image
                                source={{ uri: selectedPhoto.photoUri }}
                                style={styles.photo}
                                resizeMode="cover"
                            />
                            <View style={styles.screenshotWarning}>
                                <Ionicons name="shield-checkmark" size={14} color={COLORS.secondary} />
                                <Text style={styles.screenshotText}>Screenshot blocked</Text>
                            </View>
                        </View>

                        {/* Photo Info */}
                        <View style={styles.infoCard}>
                            <Text style={styles.infoTitle}>
                                Job #{selectedPhoto.jobId} | €{(selectedPhoto.price || 0).toFixed(2)}
                            </Text>
                            <Text style={styles.infoText}>
                                Photographer: user_{selectedPhoto.id?.slice(-4) || '0000'}
                            </Text>
                            {locationRequested && (
                                <Text style={styles.infoText}>
                                    Requested Location: {locationRequested.lat?.toFixed(4)}, {locationRequested.lng?.toFixed(4)}
                                </Text>
                            )}
                            {locationTaken && (
                                <Text style={styles.infoText}>
                                    Photo taken at: {locationTaken.latitude?.toFixed(4)}, {locationTaken.longitude?.toFixed(4)}
                                </Text>
                            )}
                            <Text style={[styles.infoText, { color: COLORS.secondary }]}>
                                Distance when taken: {selectedPhoto.distance || 0}m
                            </Text>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.approveButton}
                                onPress={handleApprove}
                            >
                                <Ionicons name="checkmark" size={20} color="#000" />
                                <Text style={styles.approveText}>APPROVE</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.rejectButton}
                                onPress={handleReject}
                            >
                                <Ionicons name="close" size={20} color="#FFF" />
                                <Text style={styles.rejectText}>REJECT</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>

                {/* Rejection Reason Modal */}
                <Modal
                    visible={showRejectModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowRejectModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select Rejection Reason</Text>

                            {/* Predefined reasons */}
                            <ScrollView style={styles.reasonsList}>
                                {REJECTION_REASONS.map(reason => (
                                    <TouchableOpacity
                                        key={reason.id}
                                        style={[
                                            styles.reasonItem,
                                            selectedReason === reason.id && styles.reasonItemSelected
                                        ]}
                                        onPress={() => setSelectedReason(reason.id)}
                                    >
                                        <View style={[
                                            styles.radioButton,
                                            selectedReason === reason.id && styles.radioButtonSelected
                                        ]}>
                                            {selectedReason === reason.id && (
                                                <View style={styles.radioButtonInner} />
                                            )}
                                        </View>
                                        <Text style={[
                                            styles.reasonText,
                                            selectedReason === reason.id && styles.reasonTextSelected
                                        ]}>
                                            {reason.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Custom reason input */}
                            <Text style={styles.customLabel}>Additional details (optional):</Text>
                            <TextInput
                                style={styles.customInput}
                                placeholder="Add more context..."
                                placeholderTextColor={COLORS.textSecondary}
                                value={customReason}
                                onChangeText={setCustomReason}
                                multiline
                                maxLength={200}
                            />

                            {/* Modal buttons */}
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setShowRejectModal(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.confirmRejectButton,
                                        !selectedReason && styles.confirmRejectButtonDisabled
                                    ]}
                                    onPress={confirmReject}
                                    disabled={!selectedReason || isRejecting}
                                >
                                    {isRejecting ? (
                                        <ActivityIndicator color="#FFF" size="small" />
                                    ) : (
                                        <Text style={styles.confirmRejectText}>Reject Photo</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        );
    }

    // Photos List
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('AdminDashboard')}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Photo Reviewer</Text>
                    <View style={{ width: 32 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={refetch}
                            tintColor={COLORS.primary}
                        />
                    }
                >
                    <Text style={styles.sectionLabel}>
                        {photos.length > 0
                            ? `${photos.length} photo(s) pending review:`
                            : 'No photos pending review'}
                    </Text>
                    <Text style={styles.timerNote}>
                        You have 3 minutes to review each photo
                    </Text>

                    {loading && photos.length === 0 ? (
                        <View style={styles.loadingState}>
                            <ActivityIndicator color={COLORS.primary} size="large" />
                            <Text style={styles.loadingText}>Loading photos...</Text>
                        </View>
                    ) : (
                        photos.map(renderPhotoCard)
                    )}

                    {!loading && photos.length === 0 && (
                        <View style={styles.emptyState}>
                            <Ionicons name="camera-outline" size={48} color={COLORS.textSecondary} />
                            <Text style={styles.emptyText}>No photos to review</Text>
                            <Text style={styles.emptySubtext}>
                                Take a photo from a test job to see it here
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>
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
        paddingVertical: SPACING.m,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + SPACING.m : SPACING.m,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        color: COLORS.textPrimary,
        ...FONTS.bold,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.error + '20',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    timerText: {
        color: COLORS.error,
        fontSize: 14,
        ...FONTS.bold,
    },
    scrollContent: {
        padding: SPACING.m,
    },
    sectionLabel: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: SPACING.xs,
        ...FONTS.medium,
    },
    timerNote: {
        color: COLORS.primary,
        fontSize: 12,
        marginBottom: SPACING.m,
        ...FONTS.regular,
    },
    photoCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    photoThumb: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
        overflow: 'hidden',
    },
    thumbImage: {
        width: '100%',
        height: '100%',
    },
    photoInfo: {
        flex: 1,
    },
    jobText: {
        color: COLORS.textPrimary,
        fontSize: 14,
        marginBottom: 2,
        ...FONTS.bold,
    },
    timeText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginBottom: 4,
        ...FONTS.regular,
    },
    statusRow: {
        flexDirection: 'row',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    statusPending: {
        backgroundColor: COLORS.primary + '30',
    },
    statusDisputed: {
        backgroundColor: COLORS.error + '30',
    },
    statusText: {
        fontSize: 10,
        color: COLORS.textPrimary,
        ...FONTS.medium,
    },
    viewButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderRadius: 20,
    },
    viewButtonText: {
        color: '#000',
        fontSize: 12,
        ...FONTS.bold,
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
        height: SCREEN_HEIGHT * 0.5,
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
    infoCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: SPACING.m,
        marginBottom: SPACING.l,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    infoTitle: {
        color: COLORS.textPrimary,
        fontSize: 16,
        marginBottom: SPACING.s,
        ...FONTS.bold,
    },
    infoText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginBottom: 4,
        ...FONTS.regular,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: SPACING.m,
    },
    approveButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.s,
        backgroundColor: COLORS.secondary,
        paddingVertical: SPACING.m,
        borderRadius: 30,
    },
    approveText: {
        color: '#000',
        fontSize: 14,
        ...FONTS.bold,
    },
    rejectButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.s,
        backgroundColor: COLORS.error,
        paddingVertical: SPACING.m,
        borderRadius: 30,
    },
    rejectText: {
        color: '#FFF',
        fontSize: 14,
        ...FONTS.bold,
    },
    loadingState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginTop: SPACING.m,
        ...FONTS.regular,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        color: COLORS.textPrimary,
        fontSize: 18,
        marginTop: SPACING.m,
        ...FONTS.bold,
    },
    emptySubtext: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginTop: SPACING.s,
        textAlign: 'center',
        ...FONTS.regular,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: SPACING.l,
        maxHeight: SCREEN_HEIGHT * 0.7,
    },
    modalTitle: {
        fontSize: 18,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: SPACING.l,
        ...FONTS.bold,
    },
    reasonsList: {
        maxHeight: 280,
        marginBottom: SPACING.m,
    },
    reasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.s,
        borderRadius: 12,
        marginBottom: SPACING.xs,
    },
    reasonItemSelected: {
        backgroundColor: COLORS.error + '20',
    },
    radioButton: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: COLORS.textSecondary,
        marginRight: SPACING.m,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioButtonSelected: {
        borderColor: COLORS.error,
    },
    radioButtonInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.error,
    },
    reasonText: {
        fontSize: 15,
        color: COLORS.textPrimary,
        flex: 1,
        ...FONTS.regular,
    },
    reasonTextSelected: {
        color: COLORS.error,
        ...FONTS.medium,
    },
    customLabel: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: SPACING.s,
        ...FONTS.medium,
    },
    customInput: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: SPACING.m,
        color: COLORS.textPrimary,
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: SPACING.l,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...FONTS.regular,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: SPACING.m,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: SPACING.m,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: COLORS.textPrimary,
        fontSize: 14,
        ...FONTS.medium,
    },
    confirmRejectButton: {
        flex: 1,
        paddingVertical: SPACING.m,
        borderRadius: 30,
        backgroundColor: COLORS.error,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmRejectButtonDisabled: {
        opacity: 0.5,
    },
    confirmRejectText: {
        color: '#FFF',
        fontSize: 14,
        ...FONTS.bold,
    },
});

export default PhotoReviewer;
