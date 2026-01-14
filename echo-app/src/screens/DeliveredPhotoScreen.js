import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    Platform,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
    Animated,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as ScreenCapture from 'expo-screen-capture';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { useToast } from '../context/ToastContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Premium Color Palette
const PREMIUM = {
    neonAqua: '#00E6FF',
    neonGlow: 'rgba(0, 230, 255, 0.35)',
    neonGlowStrong: 'rgba(0, 230, 255, 0.55)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textTertiary: 'rgba(255, 255, 255, 0.5)',
    background: '#000000',
    surface: '#1A1A1A',
    surfaceLight: '#2A2A2A',
    border: 'rgba(0, 230, 255, 0.25)',
    success: '#00D97E',
    error: '#FF4757',
    warning: '#FFC107',
};

const DeliveredPhotoScreen = ({ route, navigation }) => {
    const { showToast } = useToast();
    const { photoUri, jobDescription, jobDate, jobPrice } = route.params;

    const [isImageLoading, setIsImageLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    const [imageError, setImageError] = useState(false);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Optional: Prevent screenshots for premium security
        const enableProtection = async () => {
            try {
                await ScreenCapture.preventScreenCaptureAsync();
            } catch (e) {
                // Silent fail
            }
        };

        const disableProtection = async () => {
            try {
                await ScreenCapture.allowScreenCaptureAsync();
            } catch (e) {
                // Silent fail
            }
        };

        enableProtection();
        return () => disableProtection();
    }, []);

    const handleSaveToGallery = async () => {
        try {
            setIsSaving(true);

            // Request permissions
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please allow access to your photo library to save images.',
                    [{ text: 'OK' }]
                );
                setIsSaving(false);
                return;
            }

            // Download the image to local cache first if it's a remote URL
            let localUri = photoUri;
            if (photoUri.startsWith('http')) {
                const fileUri = FileSystem.cacheDirectory + 'echo_photo_' + Date.now() + '.jpg';
                const downloadResult = await FileSystem.downloadAsync(photoUri, fileUri);
                localUri = downloadResult.uri;
            }

            // Save to gallery
            const asset = await MediaLibrary.createAssetAsync(localUri);
            await MediaLibrary.createAlbumAsync('ECHO', asset, false);

            showToast('Photo saved to gallery', 'success');
        } catch (error) {
            console.error('Save error:', error);
            showToast('Failed to save photo', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDispute = () => {
        setShowDisputeModal(true);
    };

    const submitDispute = () => {
        if (!disputeReason.trim()) {
            showToast('Please describe the issue', 'error');
            return;
        }

        // In production, this would send to backend
        setShowDisputeModal(false);
        setDisputeReason('');
        showToast('Dispute submitted. We\'ll review it shortly.', 'success');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Recently';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            {/* Header */}
            <Animated.View
                style={[
                    styles.header,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <View style={styles.backButtonInner}>
                        <Ionicons name="chevron-back" size={24} color={PREMIUM.textPrimary} />
                    </View>
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Delivered Photo</Text>
                    <View style={styles.statusBadge}>
                        <Ionicons name="checkmark-circle" size={14} color={PREMIUM.success} />
                        <Text style={styles.statusText}>Completed</Text>
                    </View>
                </View>

                <View style={styles.headerRight} />
            </Animated.View>

            {/* Photo Container */}
            <View style={styles.photoContainer}>
                {isImageLoading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={PREMIUM.neonAqua} />
                        <Text style={styles.loadingText}>Loading photo...</Text>
                    </View>
                )}

                {imageError ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="image-outline" size={64} color={PREMIUM.textTertiary} />
                        <Text style={styles.errorText}>Failed to load image</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => {
                                setImageError(false);
                                setIsImageLoading(true);
                            }}
                        >
                            <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <Image
                        source={{ uri: photoUri }}
                        style={styles.photo}
                        resizeMode="contain"
                        onLoadStart={() => setIsImageLoading(true)}
                        onLoadEnd={() => setIsImageLoading(false)}
                        onError={() => {
                            setIsImageLoading(false);
                            setImageError(true);
                        }}
                    />
                )}
            </View>

            {/* Job Details Card */}
            <Animated.View
                style={[
                    styles.detailsCard,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: Animated.multiply(slideAnim, -1) }],
                    },
                ]}
            >
                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <Ionicons name="document-text-outline" size={18} color={PREMIUM.neonAqua} />
                        <Text style={styles.detailLabel}>Request</Text>
                        <Text style={styles.detailValue} numberOfLines={2}>
                            {jobDescription || 'Photo Request'}
                        </Text>
                    </View>

                    <View style={styles.detailDivider} />

                    <View style={styles.detailItem}>
                        <Ionicons name="calendar-outline" size={18} color={PREMIUM.neonAqua} />
                        <Text style={styles.detailLabel}>Delivered</Text>
                        <Text style={styles.detailValue}>{formatDate(jobDate)}</Text>
                    </View>

                    <View style={styles.detailDivider} />

                    <View style={styles.detailItem}>
                        <Ionicons name="wallet-outline" size={18} color={PREMIUM.neonAqua} />
                        <Text style={styles.detailLabel}>Paid</Text>
                        <Text style={styles.detailValueHighlight}>
                            {jobPrice ? `€${parseFloat(jobPrice).toFixed(2)}` : '€0.50'}
                        </Text>
                    </View>
                </View>
            </Animated.View>

            {/* Action Buttons */}
            <Animated.View
                style={[
                    styles.actionsContainer,
                    {
                        opacity: fadeAnim,
                    },
                ]}
            >
                {/* Save Button */}
                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleSaveToGallery}
                    disabled={isSaving}
                    activeOpacity={0.8}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color="#000000" />
                    ) : (
                        <>
                            <Ionicons name="download-outline" size={20} color="#000000" />
                            <Text style={styles.primaryButtonText}>SAVE TO GALLERY</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Dispute Button */}
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleDispute}
                    activeOpacity={0.7}
                >
                    <Ionicons name="flag-outline" size={18} color={PREMIUM.error} />
                    <Text style={styles.secondaryButtonText}>Report Issue</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Dispute Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showDisputeModal}
                onRequestClose={() => setShowDisputeModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardView}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.modalContent}>
                                {/* Modal Header */}
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Report an Issue</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowDisputeModal(false)}
                                        style={styles.modalClose}
                                    >
                                        <Ionicons name="close" size={24} color={PREMIUM.textPrimary} />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.modalSubtitle}>
                                    What's wrong with this photo?
                                </Text>

                                {/* Quick Options */}
                                <View style={styles.quickOptions}>
                                    {['Wrong location', 'Blurry/Low quality', 'Wrong subject', 'Other'].map((option) => (
                                        <TouchableOpacity
                                            key={option}
                                            style={[
                                                styles.quickOption,
                                                disputeReason === option && styles.quickOptionActive,
                                            ]}
                                            onPress={() => setDisputeReason(option)}
                                        >
                                            <Text
                                                style={[
                                                    styles.quickOptionText,
                                                    disputeReason === option && styles.quickOptionTextActive,
                                                ]}
                                            >
                                                {option}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Text Input */}
                                <TextInput
                                    style={styles.disputeInput}
                                    placeholder="Describe the issue in detail..."
                                    placeholderTextColor={PREMIUM.textTertiary}
                                    value={disputeReason}
                                    onChangeText={setDisputeReason}
                                    multiline
                                    maxLength={300}
                                />

                                {/* Submit Button */}
                                <TouchableOpacity
                                    style={[
                                        styles.submitButton,
                                        !disputeReason.trim() && styles.submitButtonDisabled,
                                    ]}
                                    onPress={submitDispute}
                                    disabled={!disputeReason.trim()}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.submitButtonText}>SUBMIT DISPUTE</Text>
                                </TouchableOpacity>

                                <Text style={styles.disclaimerText}>
                                    We'll review your dispute within 24 hours. If approved, you'll receive a full refund.
                                </Text>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PREMIUM.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 56,
        paddingBottom: 12,
        backgroundColor: PREMIUM.background,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonInner: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: PREMIUM.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: PREMIUM.border,
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: PREMIUM.textPrimary,
        letterSpacing: 0.3,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    statusText: {
        fontSize: 12,
        color: PREMIUM.success,
        fontWeight: '500',
    },
    headerRight: {
        width: 44,
    },
    photoContainer: {
        flex: 1,
        backgroundColor: '#0A0A0A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photo: {
        width: SCREEN_WIDTH,
        height: '100%',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: PREMIUM.background,
    },
    loadingText: {
        color: PREMIUM.textSecondary,
        fontSize: 14,
        marginTop: 12,
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorText: {
        color: PREMIUM.textSecondary,
        fontSize: 16,
        marginTop: 12,
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: PREMIUM.surfaceLight,
        borderWidth: 1,
        borderColor: PREMIUM.border,
    },
    retryText: {
        color: PREMIUM.neonAqua,
        fontSize: 14,
        fontWeight: '600',
    },
    detailsCard: {
        backgroundColor: PREMIUM.surface,
        marginHorizontal: 16,
        marginTop: -40,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: PREMIUM.border,
        shadowColor: PREMIUM.neonAqua,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailItem: {
        flex: 1,
        alignItems: 'center',
    },
    detailDivider: {
        width: 1,
        backgroundColor: PREMIUM.border,
        marginHorizontal: 8,
    },
    detailLabel: {
        fontSize: 11,
        color: PREMIUM.textTertiary,
        marginTop: 6,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    detailValue: {
        fontSize: 13,
        color: PREMIUM.textPrimary,
        marginTop: 4,
        textAlign: 'center',
        fontWeight: '500',
    },
    detailValueHighlight: {
        fontSize: 15,
        color: PREMIUM.neonAqua,
        marginTop: 4,
        fontWeight: '700',
    },
    actionsContainer: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        gap: 12,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: PREMIUM.neonAqua,
        height: 54,
        borderRadius: 27,
        gap: 10,
        shadowColor: PREMIUM.neonAqua,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    primaryButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#000000',
        letterSpacing: 1,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        gap: 8,
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: PREMIUM.error,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        width: '100%',
    },
    modalContent: {
        backgroundColor: PREMIUM.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: PREMIUM.textPrimary,
    },
    modalClose: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: PREMIUM.textSecondary,
        marginBottom: 20,
    },
    quickOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 16,
    },
    quickOption: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: PREMIUM.surfaceLight,
        borderWidth: 1,
        borderColor: PREMIUM.border,
    },
    quickOptionActive: {
        backgroundColor: 'rgba(0, 230, 255, 0.15)',
        borderColor: PREMIUM.neonAqua,
    },
    quickOptionText: {
        fontSize: 13,
        color: PREMIUM.textSecondary,
        fontWeight: '500',
    },
    quickOptionTextActive: {
        color: PREMIUM.neonAqua,
    },
    disputeInput: {
        backgroundColor: PREMIUM.surfaceLight,
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: PREMIUM.textPrimary,
        minHeight: 100,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: PREMIUM.border,
        marginBottom: 20,
    },
    submitButton: {
        backgroundColor: PREMIUM.error,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: PREMIUM.surfaceLight,
    },
    submitButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    disclaimerText: {
        fontSize: 12,
        color: PREMIUM.textTertiary,
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 18,
    },
});

export default DeliveredPhotoScreen;
