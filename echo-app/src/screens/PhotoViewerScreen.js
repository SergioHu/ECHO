import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Text, BackHandler, AppState, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenCapture from 'expo-screen-capture';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import EchoButton from '../components/EchoButton';
import ViewTimer from '../components/ViewTimer';
import { useToast } from '../context/ToastContext';
import { usePhotoTimer } from '../context/PhotoTimerContext';
import { useViewSession, useReportPhoto, DISPUTE_REASONS, DISPUTE_REASON_LABELS } from '../hooks';

const PhotoViewerScreen = ({ route, navigation }) => {
    const { showToast } = useToast();
    const { startTimer, getExpiry } = usePhotoTimer();
    const insets = useSafeAreaInsets();
    const { photoUri, jobId, supabasePhotoId } = route.params;

    // Supabase view session hook (only used when viewing Supabase photos)
    const {
        startSession,
        photoUrl: supabasePhotoUrl,
        timeRemaining: supabaseTimeRemaining,
        loading: sessionLoading,
        error: sessionError,
    } = useViewSession(supabasePhotoId);

    // Report photo hook
    const { reportPhoto, loading: reportLoading } = useReportPhoto();

    const [timeLeft, setTimeLeft] = useState(null);
    const [isProtected, setIsProtected] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(true);
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [selectedReason, setSelectedReason] = useState(null);
    const [reportDescription, setReportDescription] = useState('');
    const [isCompromised, setIsCompromised] = useState(false);
    const [hasExpired, setHasExpired] = useState(false);
    const appState = useRef(AppState.currentState);

    // Track if we've started the Supabase session
    const [sessionExpiry, setSessionExpiry] = useState(null);
    const sessionStartedRef = useRef(false);

    // 1a. Start Supabase session when photo ID is provided
    useEffect(() => {
        // Reset when photoId changes
        if (supabasePhotoId) {
            sessionStartedRef.current = false;
        }
    }, [supabasePhotoId]);

    useEffect(() => {
        if (supabasePhotoId && !sessionStartedRef.current) {
            console.log('🔐 Starting Supabase view session for:', supabasePhotoId);
            sessionStartedRef.current = true;

            startSession().then(result => {
                if (result.error) {
                    console.error('❌ Failed to start view session:', result.error);
                    showToast('Failed to load photo', 'error');
                } else if (result.expired) {
                    console.log('⏰ Photo already expired');
                    handleExpiration();
                } else {
                    console.log('✅ View session started, expires at:', result.expiresAt);
                    // Store expiry for local countdown
                    setSessionExpiry(result.expiresAt);
                    // Also start local timer for ViewTimer component sync
                    // Use supabasePhotoId as key so each new photo gets its own timer
                    // Force reset to ensure fresh timer from backend expiry
                    const secondsRemaining = Math.max(0, Math.ceil((result.expiresAt.getTime() - Date.now()) / 1000));
                    console.log('⏱️ Timer starting with', secondsRemaining, 'seconds for photoId:', supabasePhotoId);
                    const newExpiry = startTimer(supabasePhotoId, secondsRemaining, true);
                    console.log('⏱️ Timer started, new expiry:', new Date(newExpiry).toISOString());

                    // Verify the timer was stored
                    setTimeout(() => {
                        const storedExpiry = getExpiry(supabasePhotoId);
                        console.log('⏱️ Verification - stored expiry:', storedExpiry ? new Date(storedExpiry).toISOString() : 'NULL');
                    }, 100);
                }
            });
        }
    }, [supabasePhotoId, startSession]);

    // 1b. Initialize Timer (keyed by jobId, NOT photoUri)
    // IMPORTANT: This is the ONLY place where timer starts.
    // ViewTimer component is display-only and does not start timers.
    useEffect(() => {
        // For Supabase photos, use the session expiry we stored
        if (supabasePhotoId) {
            if (!sessionExpiry) {
                return; // Still loading
            }

            const updateTimer = () => {
                const now = Date.now();
                const remaining = Math.max(0, Math.ceil((sessionExpiry.getTime() - now) / 1000));
                setTimeLeft(remaining);

                if (remaining === 30) {
                    showToast('30 seconds remaining!', 'warning');
                }

                if (remaining <= 0) {
                    handleExpiration();
                }
            };

            // Initial update
            updateTimer();

            // Interval for countdown
            const timerId = setInterval(updateTimer, 1000);

            return () => clearInterval(timerId);
        }

        // For local/mock photos, use local timer
        if (!jobId) return;

        let expiry = getExpiry(jobId);

        if (!expiry) {
            // Start new timer ONLY here (3 minutes = 180 seconds)
            expiry = startTimer(jobId, 180);
        }

        const updateTimer = () => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((expiry - now) / 1000));
            setTimeLeft(remaining);

            if (remaining === 30) {
                showToast('30 seconds remaining!', 'warning');
            }

            if (remaining <= 0) {
                handleExpiration();
            }
        };

        // Initial update
        updateTimer();

        // Interval
        const timerId = setInterval(updateTimer, 1000);

        return () => clearInterval(timerId);
    }, [jobId, supabasePhotoId, sessionExpiry]);

    // 2. Prevent Screen Capture (Android) & Detect (iOS)
    useEffect(() => {
        const activateProtection = async () => {
            try {
                // Race between protection and a 2-second timeout
                await Promise.race([
                    ScreenCapture.preventScreenCaptureAsync(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000))
                ]);
                setIsProtected(true);
            } catch (error) {
                console.log("Screen capture protection issue:", error);
                // Fallback: Show image anyway after timeout/error so user isn't stuck
                setIsProtected(true);
            }
        };

        const deactivateProtection = async () => {
            await ScreenCapture.allowScreenCaptureAsync();
        };

        activateProtection();

        // Handle App State (Blur/Focus)
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                activateProtection();
            }
            appState.current = nextAppState;
        });

        // iOS Fallback: Detect Screenshot & Lockout
        const screenshotSubscription = ScreenCapture.addScreenshotListener(() => {
            setIsCompromised(true);
            showToast('Screenshots are NOT allowed!', 'error');
        });

        return () => {
            deactivateProtection();
            subscription.remove();
            screenshotSubscription.remove();
        };
    }, []);

    // 3. Back Button Logic (Only block if compromised or reporting)
    useEffect(() => {
        const backAction = () => {
            if (isCompromised) {
                return true; // Block back button if compromised
            }
            if (reportModalVisible) {
                setReportModalVisible(false);
                return true;
            }
            if (hasExpired) {
                return true; // Block back button if expired (waiting for auto-close)
            }
            // Allow normal back navigation!
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            backAction
        );

        return () => backHandler.remove();
    }, [reportModalVisible, isCompromised, hasExpired]);

    // 4. Auto-Close on Expiration
    useEffect(() => {
        if (hasExpired) {
            const timer = setTimeout(() => {
                navigation.navigate('MainTabs', { screen: 'Radar' });
            }, 3000); // 3 seconds delay
            return () => clearTimeout(timer);
        }
    }, [hasExpired]);

    const handleExpiration = () => {
        setReportModalVisible(false);
        setHasExpired(true);
    };

    const handleReportPress = () => {
        setSelectedReason(null);
        setReportDescription('');
        setReportModalVisible(true);
    };

    const submitReport = async () => {
        if (!selectedReason) {
            showToast('Please select a reason for reporting', 'error');
            return;
        }

        // For Supabase photos, call the RPC
        if (supabasePhotoId) {
            const result = await reportPhoto(
                supabasePhotoId,
                selectedReason,
                reportDescription.trim() || null
            );

            if (result.success) {
                setReportModalVisible(false);
                showToast('Photo reported. We\'ll review it shortly.', 'success');
                navigation.navigate('MainTabs', { screen: 'Activity' });
            } else {
                showToast(result.error || 'Failed to report photo', 'error');
            }
        } else {
            // For local/mock photos, just show success
            setReportModalVisible(false);
            showToast('Photo Reported. Thank you!', 'success');
            navigation.navigate('MainTabs', { screen: 'Radar' });
        }
    };

    if (timeLeft === null) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (hasExpired) {
        return (
            <View style={styles.expiredContainer}>
                <MaterialCommunityIcons name="file-remove-outline" size={80} color={COLORS.error} />
                <Text style={styles.expiredTitle}>PHOTO DESTROYED</Text>
                <Text style={styles.expiredSubtitle}>The 3-minute viewing window has ended.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Security Lockout Overlay */}
            {isCompromised && (
                <View style={styles.securityOverlay}>
                    <MaterialIcons name="security" size={64} color="white" style={styles.securityIcon} />
                    <Text style={styles.securityTitle}>SECURITY ALERT</Text>
                    <Text style={styles.securityMessage}>
                        Screenshots are forbidden. This incident has been logged.
                    </Text>
                    <EchoButton
                        title="I UNDERSTAND"
                        variant="outline"
                        onPress={() => setIsCompromised(false)}
                        style={styles.securityButton}
                    />
                </View>
            )}

            {/* Timer Header - IDENTICAL component as Activity screen */}
            <View style={[styles.header, { top: insets.top + 16 }]}>
                <ViewTimer
                    jobId={supabasePhotoId || jobId}
                    expiryTimestamp={sessionExpiry ? sessionExpiry.getTime() : null}
                />
            </View>

            {/* Image - Only rendered when protection is active */}
            <View style={styles.imageContainer}>
                {isProtected ? (
                    <>
                        {(isImageLoading || sessionLoading) && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                            </View>
                        )}
                        <Image
                            source={{ uri: supabasePhotoUrl || photoUri }}
                            style={styles.image}
                            onLoadStart={() => setIsImageLoading(true)}
                            onLoadEnd={() => setIsImageLoading(false)}
                            onError={(e) => {
                                setIsImageLoading(false);
                                showToast('Failed to load image', 'error');
                                console.error("Image load error:", e.nativeEvent.error);
                            }}
                        />
                    </>
                ) : (
                    <View style={styles.loadingContainer}>
                        <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.primary} />
                        <Text style={styles.loadingText}>Securing...</Text>
                    </View>
                )}
            </View>

            {/* Report Button - Subtle premium pill (Option B) with SafeArea */}
            <TouchableOpacity
                style={[styles.reportPill, { bottom: Math.max(insets.bottom, 16) + 16 }]}
                onPress={handleReportPress}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons name="flag-outline" size={14} color="rgba(255, 80, 80, 0.9)" />
                <Text style={styles.reportPillText}>Report</Text>
            </TouchableOpacity>

            {/* Report Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={reportModalVisible}
                onRequestClose={() => setReportModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.keyboardView}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Report Photo</Text>
                                <Text style={styles.modalSubtitle}>Select a reason:</Text>

                                {/* Reason selector buttons */}
                                <View style={styles.reasonsContainer}>
                                    {Object.entries(DISPUTE_REASON_LABELS).map(([key, label]) => (
                                        <TouchableOpacity
                                            key={key}
                                            style={[
                                                styles.reasonButton,
                                                selectedReason === key && styles.reasonButtonSelected
                                            ]}
                                            onPress={() => setSelectedReason(key)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons
                                                name={selectedReason === key ? 'radio-button-on' : 'radio-button-off'}
                                                size={20}
                                                color={selectedReason === key ? COLORS.error : COLORS.textSecondary}
                                            />
                                            <Text style={[
                                                styles.reasonText,
                                                selectedReason === key && styles.reasonTextSelected
                                            ]}>
                                                {label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TextInput
                                    style={styles.input}
                                    placeholder="Additional details (optional)..."
                                    placeholderTextColor={COLORS.textSecondary}
                                    value={reportDescription}
                                    onChangeText={setReportDescription}
                                    multiline
                                    maxLength={250}
                                />

                                <View style={styles.modalButtons}>
                                    <EchoButton
                                        title="CANCEL"
                                        variant="outline"
                                        onPress={() => setReportModalVisible(false)}
                                        style={styles.modalButton}
                                        disabled={reportLoading}
                                    />
                                    <EchoButton
                                        title={reportLoading ? "REPORTING..." : "REPORT"}
                                        variant="danger"
                                        onPress={submitReport}
                                        style={styles.modalButton}
                                        disabled={reportLoading || !selectedReason}
                                    />
                                </View>
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
        backgroundColor: 'black',
    },
    expiredContainer: {
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    expiredTitle: {
        color: COLORS.error,
        fontSize: 24,
        ...FONTS.bold,
        marginTop: SPACING.l,
        marginBottom: SPACING.s,
        textAlign: 'center',
    },
    expiredSubtitle: {
        color: COLORS.textSecondary,
        fontSize: 16,
        textAlign: 'center',
    },
    securityOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.error, // Or 'black' if preferred, using error red for impact
        zIndex: 9999,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    securityIcon: {
        marginBottom: SPACING.l,
    },
    securityTitle: {
        color: 'white',
        fontSize: 24,
        ...FONTS.bold,
        marginBottom: SPACING.m,
        textAlign: 'center',
    },
    securityMessage: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        opacity: 0.9,
    },
    securityButton: {
        width: '100%',
        borderColor: 'white',
        borderWidth: 2,
    },
    header: {
        position: 'absolute',
        right: 20,
        zIndex: 10,
    },
    imageContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        flex: 1,
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
    },
    loadingContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
    },
    loadingText: {
        color: COLORS.primary,
        fontSize: 16,
        marginTop: SPACING.m,
        ...FONTS.medium,
    },
    reportPill: {
        position: 'absolute',
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 80, 80, 0.4)',
        // Subtle glow effect
        shadowColor: 'rgba(255, 46, 46, 0.5)',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 3,
        minWidth: 44,
        minHeight: 44,
        justifyContent: 'center',
    },
    reportPillText: {
        color: 'rgba(255, 80, 80, 0.9)',
        fontSize: 13,
        ...FONTS.medium,
        letterSpacing: 0.3,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        width: '100%',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: SPACING.l,
        paddingBottom: SPACING.xl,
    },
    modalTitle: {
        color: COLORS.textPrimary,
        fontSize: 20,
        ...FONTS.bold,
        marginBottom: SPACING.xs,
    },
    modalSubtitle: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: SPACING.m,
    },
    reasonsContainer: {
        marginBottom: SPACING.m,
    },
    reasonButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.s,
        paddingHorizontal: SPACING.m,
        borderRadius: 8,
        marginBottom: 4,
    },
    reasonButtonSelected: {
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
    },
    reasonText: {
        color: COLORS.textSecondary,
        fontSize: 15,
        marginLeft: SPACING.s,
    },
    reasonTextSelected: {
        color: COLORS.error,
        fontWeight: '600',
    },
    input: {
        backgroundColor: '#333333',
        color: COLORS.textPrimary,
        padding: SPACING.m,
        borderRadius: 12,
        fontSize: 16,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: SPACING.l,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: SPACING.m,
    },
    modalButton: {
        flex: 1,
    },
});

export default PhotoViewerScreen;
