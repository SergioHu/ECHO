import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../components/ScreenWrapper';
import InfoCard from '../components/InfoCard';
import ViewTimer from '../components/ViewTimer';
import { COLORS, FONTS, SPACING } from '../constants/theme';
// Note: Mock data removed - using only Supabase data now
import { getTakenPhotos, getAllTestJobs, subscribe, getPhotoByJobId, initializeSampleData } from '../store/jobStore';
import { useMyActivity } from '../hooks';
import { usePhotoTimer } from '../context/PhotoTimerContext';

const ActivityScreen = () => {
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState('requested'); // 'requested' or 'completed'
    const [takenPhotos, setTakenPhotos] = useState([]);
    const [requestedJobs, setRequestedJobs] = useState([]);

    // Get photo timer context to check for expired timers (persisted to AsyncStorage)
    const { isExpired: isTimerExpiredFromContext, getExpiry, clearTimer } = usePhotoTimer();

    // Track expired jobs - used to hide VIEW PHOTO button after expiration (session-only)
    const [expiredJobs, setExpiredJobs] = useState(new Set());

    // Callback when a timer expires during this session
    const handleTimerExpired = useCallback((jobId) => {
        setExpiredJobs(prev => new Set([...prev, jobId]));
    }, []);

    // Check if a job's timer has expired (persisted + session state)
    const isJobExpired = useCallback((jobId) => {
        // First check local session state (for real-time updates during this session)
        if (expiredJobs.has(jobId)) return true;

        // Then check the persisted timer context (survives navigation/app restart)
        if (isTimerExpiredFromContext(jobId)) return true;

        return false;
    }, [expiredJobs, isTimerExpiredFromContext]);

    // Supabase hook for user's activity
    const {
        myRequests: supabaseRequests,
        myJobs: supabaseJobs,
        loading: supabaseLoading,
        refetch: refetchActivity,
    } = useMyActivity();

    // Auto-refresh when screen comes into focus (real-time updates)
    useFocusEffect(
        useCallback(() => {
            console.log('🔄 Activity screen focused - refreshing data...');
            refetchActivity();
        }, [refetchActivity])
    );

    // Debug: log Supabase data
    useEffect(() => {
        console.log('📋 Activity - Supabase Requests:', supabaseRequests?.length || 0);
        console.log('📋 Activity - Supabase Jobs:', supabaseJobs?.length || 0);
        if (supabaseRequests?.length > 0) {
            console.log('📋 First request:', JSON.stringify(supabaseRequests[0]));
        }
        if (supabaseJobs?.length > 0) {
            console.log('📋 First job:', JSON.stringify(supabaseJobs[0]));
        }
    }, [supabaseRequests, supabaseJobs]);

    // Sync local timers with backend state
    // When backend has NULL session (admin reset), clear local timer cache
    useEffect(() => {
        if (!supabaseRequests) return;

        supabaseRequests.forEach(request => {
            if (!request.photoId) return;

            const timerId = request.photoId;
            const backendSessionStarted = request.viewSessionStartedAt;
            const localExpiry = getExpiry(timerId);

            // If backend says session not started (NULL) but we have local timer, clear it
            // This happens when admin resets/approves a photo
            if (!backendSessionStarted && localExpiry) {
                console.log('🔄 Syncing timer: Backend reset detected for', timerId, '- clearing local cache');
                clearTimer(timerId);
                // Also clear from expired set if present
                setExpiredJobs(prev => {
                    const next = new Set(prev);
                    next.delete(timerId);
                    return next;
                });
            }
        });
    }, [supabaseRequests, getExpiry, clearTimer]);

    // Subscribe to job store changes (for local testing only)
    // Note: In production, we rely on Supabase data only
    useEffect(() => {
        // Don't initialize sample data - use only Supabase data
        // initializeSampleData();

        setTakenPhotos(getTakenPhotos());
        setRequestedJobs(getAllTestJobs());

        const unsubscribe = subscribe(() => {
            setTakenPhotos(getTakenPhotos());
            setRequestedJobs(getAllTestJobs());
        });

        return () => unsubscribe();
    }, []);

    // Merge and filter Supabase data with local data
    // Tab "Requested" = ALL requests created by user (photos I requested from others)
    //   - Shows: open, locked, disputed, AND fulfilled requests
    //   - Has VIEW PHOTO button for fulfilled requests with photos
    //   - Has 3-minute timer for viewing photos
    // Tab "Completed" = ONLY jobs completed by user as agent (photos I took for others)
    //   - NO thumbnails (privacy protection)
    //   - Shows payment status
    const mergedRequests = useMemo(() => {
        // Show ALL requests created by user (except cancelled)
        const supabaseItems = supabaseRequests
            .filter(req => req.status !== 'cancelled')
            .map(req => ({
                ...req,
                isSupabase: true,
            }));
        const localItems = requestedJobs.map(job => ({
            ...job,
            isTestJob: true,
        }));
        return [...supabaseItems, ...localItems];
    }, [supabaseRequests, requestedJobs]);

    const mergedJobs = useMemo(() => {
        // ONLY show jobs where user was the agent (photographer)
        // Do NOT include fulfilled requests (those stay in Requested tab)
        const supabaseItems = supabaseJobs.map(job => ({
            ...job,
            isSupabase: true,
        }));
        const localItems = takenPhotos.map(photo => ({
            ...photo,
            isLocal: true,
        }));
        return [...supabaseItems, ...localItems];
    }, [supabaseJobs, takenPhotos]);

    const renderRequestItem = ({ item }) => {
        // Check if it's a Supabase request or local job
        if (item.isSupabase || item.isTestJob || item.lat) {
            // For Supabase: use item.hasPhoto and item.photoUrl from hook
            // For local: check deliveredPhoto from store
            const localPhoto = !item.isSupabase ? getPhotoByJobId(item.originalId) : null;
            const hasPhoto = item.isSupabase ? item.hasPhoto : (item.status === 'completed' && localPhoto);

            // Get photo URL (Supabase signed URL or local URI)
            const photoUrl = item.isSupabase ? item.photoUrl : localPhoto?.photoUri;

            // Photo ID for Supabase view session
            const supabasePhotoId = item.isSupabase ? item.photoId : null;

            // Check if under dispute or has resolved dispute
            const isDisputed = item.status === 'disputed';
            const hasResolvedDispute = item.dispute &&
                (item.dispute.status === 'resolved_creator' || item.dispute.status === 'resolved_agent');
            const disputeResolutionNotes = item.dispute?.resolutionNotes || null;

            // Check if photo was rejected by admin
            const isPhotoRejected = item.isPhotoRejected || item.photoStatus === 'rejected';

            // Timer ID for ViewTimer component
            // For Supabase photos, use photoId as timer key (each new photo gets fresh timer)
            const timerId = item.isSupabase ? (item.photoId || item.supabaseId) : item.originalId;

            // Determine timer state from BACKEND data (source of truth)
            // This ensures sync between ActivityScreen and PhotoViewerScreen
            const viewSessionStartedAt = item.viewSessionStartedAt;
            const viewSessionExpiresAt = item.viewSessionExpiresAt;

            // Session states:
            // 1. NULL/NULL = Session not started yet (fresh 3 min available when opened)
            // 2. timestamp/timestamp = Session active or expired (check expiry time)
            const sessionNotStarted = !viewSessionStartedAt;
            const sessionExpired = viewSessionExpiresAt && new Date(viewSessionExpiresAt) < new Date();

            // Use backend truth, fall back to local state for non-Supabase items
            const isTimerExpired = item.isSupabase
                ? (sessionExpired && !sessionNotStarted) // Backend: expired only if started AND past expiry
                : isJobExpired(timerId); // Local fallback

            // For Supabase items, also check if session is fresh (for status display)
            const isSessionFresh = item.isSupabase && sessionNotStarted;

            // Status colors and text based on state
            let statusColor, statusBgColor, statusText, statusIcon;

            // Check if dispute was approved (agent won) - photo was valid
            const disputeApproved = hasResolvedDispute && item.dispute.status === 'resolved_agent';
            // Check if dispute was rejected (creator won) - photo was rejected
            const disputeRejected = hasResolvedDispute && item.dispute.status === 'resolved_creator';

            if (isPhotoRejected) {
                // Photo was rejected by admin - show rejection status
                statusColor = COLORS.error;
                statusBgColor = 'rgba(255, 68, 68, 0.15)';
                statusText = 'PHOTO REJECTED';
                statusIcon = 'close-circle';
            } else if (isDisputed) {
                statusColor = COLORS.error;
                statusBgColor = 'rgba(255, 68, 68, 0.15)';
                statusText = 'UNDER REVIEW';
                statusIcon = 'alert-circle';
            } else if (disputeRejected) {
                // Creator won dispute - photo was rejected, job reopened
                statusColor = COLORS.secondary;
                statusBgColor = 'rgba(0, 230, 255, 0.15)';
                statusText = 'DISPUTE RESOLVED';
                statusIcon = 'checkmark-circle';
            } else if (isTimerExpired && hasPhoto) {
                // Photo expired - same status whether or not it went through dispute
                statusColor = COLORS.error;
                statusBgColor = 'rgba(255, 68, 68, 0.12)';
                statusText = 'PHOTO EXPIRED';
                statusIcon = 'close-circle';
            } else if (disputeApproved) {
                // Agent won dispute - photo approved but not yet expired
                statusColor = COLORS.secondary;
                statusBgColor = 'rgba(0, 230, 255, 0.15)';
                statusText = 'PHOTO APPROVED';
                statusIcon = 'checkmark-circle';
            } else if (hasPhoto) {
                statusColor = COLORS.secondary;
                statusBgColor = 'rgba(0, 230, 255, 0.15)';
                statusText = 'PHOTO DELIVERED';
                statusIcon = 'checkmark-circle';
            } else {
                statusColor = '#FFC13C';
                statusBgColor = 'rgba(255, 193, 60, 0.15)';
                statusText = 'WAITING FOR PHOTO';
                statusIcon = 'time';
            }

            return (
                <InfoCard style={styles.card}>
                    <View style={styles.cardContent}>
                        {/* Top row with thumbnail/icon and info */}
                        <View style={styles.cardTopRow}>
                            {/* Show photo thumbnail if delivered and NOT expired, otherwise show icon */}
                            {hasPhoto && photoUrl && !isTimerExpired ? (
                                <View style={styles.photoThumbContainer}>
                                    <Image
                                        source={{
                                            uri: photoUrl,
                                            cache: 'reload' // Force reload to avoid stale signed URLs
                                        }}
                                        style={styles.photoThumb}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.photoDeliveredBadge}>
                                        <Ionicons name="checkmark" size={10} color="#000" />
                                    </View>
                                </View>
                            ) : (
                                <View style={[styles.iconContainer, { borderColor: statusColor }]}>
                                    <Ionicons
                                        name={statusIcon}
                                        size={24}
                                        color={statusColor}
                                    />
                                </View>
                            )}
                            <View style={styles.contentContainer}>
                                <Text style={styles.title}>{item.description || item.title || 'Photo Request'}</Text>
                                <View style={styles.infoRow}>
                                    <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
                                    <Text style={styles.locationText}>
                                        {item.lat ? `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}` : 'Location'}
                                    </Text>
                                </View>
                                <View style={styles.priceRow}>
                                    <Text style={styles.priceLabel}>Reward:</Text>
                                    <Text style={styles.priceValue}>€{(item.price || 0).toFixed(2)}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Status badge row with timer */}
                        <View style={styles.statusRow}>
                            <View style={[styles.statusBadgeLarge, { backgroundColor: statusBgColor }]}>
                                <Ionicons
                                    name={statusIcon}
                                    size={14}
                                    color={statusColor}
                                />
                                <Text style={[styles.statusTextLarge, { color: statusColor }]}>
                                    {statusText}
                                </Text>
                            </View>
                            {/* Timer - only show when photo is delivered, not disputed, and not expired */}
                            {hasPhoto && !isDisputed && !isTimerExpired && (
                                <ViewTimer
                                    jobId={timerId}
                                    expiryTimestamp={viewSessionExpiresAt ? new Date(viewSessionExpiresAt).getTime() : null}
                                    onExpired={() => handleTimerExpired(timerId)}
                                />
                            )}
                        </View>

                        {/* Photo Rejection Notice - show when photo was rejected */}
                        {isPhotoRejected && (
                            <View style={styles.rejectionNoticeContainer}>
                                <View style={styles.rejectionNoticeHeader}>
                                    <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                                    <Text style={styles.rejectionNoticeLabel}>Photo Rejected</Text>
                                </View>
                                <Text style={styles.rejectionNoticeText}>
                                    {disputeResolutionNotes
                                        ? `"${disputeResolutionNotes.replace(/^(approved|rejected):\s*/i, '')}"`
                                        : 'The submitted photo did not meet requirements. Job is back on the map for another photographer.'}
                                </Text>
                            </View>
                        )}

                        {/* Admin Resolution Notes - show when dispute was resolved (even if timer expired) */}
                        {(disputeApproved || disputeRejected) && disputeResolutionNotes && !isPhotoRejected && (
                            <View style={styles.adminNotesContainer}>
                                <View style={styles.adminNotesHeader}>
                                    <Ionicons name="chatbubble-ellipses" size={14} color={COLORS.textSecondary} />
                                    <Text style={styles.adminNotesLabel}>Admin Feedback:</Text>
                                </View>
                                <Text style={styles.adminNotesText}>
                                    "{disputeResolutionNotes.replace(/^(approved|rejected):\s*/i, '')}"
                                </Text>
                            </View>
                        )}

                        {/* VIEW PHOTO button - only show when photo is delivered, not disputed, not rejected, and not expired */}
                        {hasPhoto && photoUrl && !isDisputed && !isPhotoRejected && !isTimerExpired && (
                            <TouchableOpacity
                                style={styles.viewPhotoButtonLarge}
                                onPress={() => {
                                    navigation.navigate('PhotoViewer', {
                                        photoUri: photoUrl,
                                        jobId: timerId,
                                        supabasePhotoId: supabasePhotoId,
                                    });
                                }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="eye" size={20} color="#000" />
                                <Text style={styles.viewPhotoTextLarge}>VIEW PHOTO</Text>
                            </TouchableOpacity>
                        )}

                        {/* Date */}
                        <Text style={styles.date}>
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                        </Text>
                    </View>
                </InfoCard>
            );
        }

        // Mock request item
        return (
            <InfoCard style={styles.card}>
                <View style={styles.iconContainer}>
                    <Ionicons
                        name="camera-outline"
                        size={24}
                        color={COLORS.primary}
                    />
                </View>
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>Looking for: {item.location}</Text>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: item.status === 'Delivered' ? COLORS.secondary : COLORS.error }
                    ]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                    <Text style={styles.date}>{item.date}</Text>
                </View>
                <Text style={styles.price}>{item.price}</Text>
            </InfoCard>
        );
    };

    const renderJobItem = ({ item }) => {
        // Supabase job (photos submitted by user as agent - photos I took for OTHERS)
        if (item.isSupabase && item.storagePath) {
            // Define status display based on request status
            let statusColor, statusText, statusIcon, priceLabel;

            switch (item.status) {
                case 'fulfilled':
                    // Photo was viewed, payment confirmed
                    statusColor = COLORS.secondary;
                    statusText = 'Payment Received';
                    statusIcon = 'checkmark-circle';
                    priceLabel = 'Earned:';
                    break;
                case 'disputed':
                    // Photo was reported, under admin review
                    statusColor = COLORS.error;
                    statusText = 'Under Review';
                    statusIcon = 'alert-circle';
                    priceLabel = 'Pending:';
                    break;
                case 'rejected':
                    // Photo was rejected by admin
                    statusColor = COLORS.error;
                    statusText = 'Photo Rejected';
                    statusIcon = 'close-circle';
                    priceLabel = 'No payment:';
                    break;
                case 'locked':
                default:
                    // Photo submitted, waiting for requester to view
                    statusColor = COLORS.primary;
                    statusText = 'Awaiting Payment';
                    statusIcon = 'time';
                    priceLabel = 'Pending:';
                    break;
            }

            return (
                <InfoCard style={styles.card}>
                    <View style={styles.cardContent}>
                        <View style={styles.cardTopRow}>
                            <View style={[styles.iconContainer, { borderColor: statusColor }]}>
                                <Ionicons
                                    name={statusIcon}
                                    size={24}
                                    color={statusColor}
                                />
                            </View>
                            <View style={styles.contentContainer}>
                                <Text style={styles.title}>{item.title || 'Photo Job'}</Text>
                                <View style={styles.priceRow}>
                                    <Text style={styles.priceLabel}>{priceLabel}</Text>
                                    <Text style={[styles.priceValue, { color: statusColor }]}>
                                        €{(item.price || 0).toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusBadgeLarge, { backgroundColor: `${statusColor}20` }]}>
                                <Ionicons name={statusIcon} size={14} color={statusColor} />
                                <Text style={[styles.statusTextLarge, { color: statusColor }]}>{statusText}</Text>
                            </View>
                        </View>

                        {/* Admin feedback for rejected photos */}
                        {(item.status === 'rejected' || item.disputeStatus === 'resolved_creator') && item.adminFeedback && (
                            <View style={[styles.adminNotesContainer, { borderLeftColor: COLORS.error }]}>
                                <View style={styles.adminNotesHeader}>
                                    <Ionicons name="information-circle" size={14} color={COLORS.error} />
                                    <Text style={[styles.adminNotesLabel, { color: COLORS.error }]}>Rejection Reason:</Text>
                                </View>
                                <Text style={styles.adminNotesText}>
                                    "{item.adminFeedback.replace(/^(approved|rejected):\s*/i, '')}"
                                </Text>
                            </View>
                        )}

                        {/* Admin feedback for approved disputes */}
                        {item.disputeStatus === 'resolved_agent' && item.adminFeedback && item.status !== 'rejected' && (
                            <View style={styles.adminNotesContainer}>
                                <View style={styles.adminNotesHeader}>
                                    <Ionicons name="checkmark-circle" size={14} color={COLORS.secondary} />
                                    <Text style={[styles.adminNotesLabel, { color: COLORS.secondary }]}>Admin Approved:</Text>
                                </View>
                                <Text style={styles.adminNotesText}>
                                    "{item.adminFeedback.replace(/^(approved|rejected):\s*/i, '')}"
                                </Text>
                            </View>
                        )}

                        <Text style={styles.date}>
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                        </Text>
                    </View>
                </InfoCard>
            );
        }

        // Check if it's a real photo from local store
        if (item.photoUri) {
            return (
                <InfoCard style={styles.card}>
                    <View style={styles.photoThumbContainer}>
                        <Image
                            source={{ uri: item.photoUri }}
                            style={styles.photoThumb}
                            resizeMode="cover"
                        />
                    </View>
                    <View style={styles.contentContainer}>
                        <Text style={styles.title}>Photo Job #{item.jobId}</Text>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: item.status === 'approved' ? COLORS.secondary :
                              item.status === 'pending' ? COLORS.primary : COLORS.error }
                        ]}>
                            <Text style={styles.statusText}>
                                {item.status === 'approved' ? 'Approved' :
                                 item.status === 'pending' ? 'Pending' : 'Rejected'}
                            </Text>
                        </View>
                        <Text style={styles.date}>
                            {item.takenAt ? new Date(item.takenAt).toLocaleDateString() : 'Recent'}
                        </Text>
                    </View>
                    <Text style={[styles.earnings, { color: item.status === 'approved' ? COLORS.secondary : COLORS.textSecondary }]}>
                        €{(item.price || 0).toFixed(2)}
                    </Text>
                </InfoCard>
            );
        }

        // Mock job item (fallback)
        return (
            <InfoCard style={styles.card}>
                <View style={styles.iconContainer}>
                    <Ionicons
                        name={item.status === 'Earned' ? 'checkmark-circle-outline' : 'close-circle-outline'}
                        size={24}
                        color={item.status === 'Earned' ? COLORS.secondary : COLORS.error}
                    />
                </View>
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>Job at: {item.location}</Text>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: item.status === 'Earned' ? COLORS.secondary : COLORS.error }
                    ]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                    <Text style={styles.date}>{item.date}</Text>
                </View>
                <Text style={[styles.earnings, { color: item.status === 'Earned' ? COLORS.secondary : COLORS.textSecondary }]}>
                    {item.earnings}
                </Text>
            </InfoCard>
        );
    };

    return (
        <ScreenWrapper>
            <Text style={styles.headerTitle}>Activity</Text>

            {/* Segmented Control / Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'requested' && styles.activeTab]}
                    onPress={() => setActiveTab('requested')}
                >
                    <Text style={[styles.tabText, activeTab === 'requested' && styles.activeTabText]}>
                        Requested
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
                    onPress={() => setActiveTab('completed')}
                >
                    <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
                        Completed
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Loading indicator */}
            {supabaseLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
            )}

            {/* Conditional List Rendering */}
            <FlatList
                data={activeTab === 'requested'
                    ? [...mergedRequests.map(j => ({ ...j, originalId: j.id, id: `${j.isSupabase ? 'sb' : 'job'}-${j.id}` }))]
                    : [...mergedJobs.map(p => ({ ...p, id: `${p.isSupabase ? 'sb' : 'photo'}-${p.id}` }))]}
                renderItem={activeTab === 'requested' ? renderRequestItem : renderJobItem}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={[
                    styles.listContent,
                    (activeTab === 'requested' ? mergedRequests : mergedJobs).length === 0 && styles.emptyListContent
                ]}
                showsVerticalScrollIndicator={false}
                onRefresh={refetchActivity}
                refreshing={supabaseLoading}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Ionicons
                            name={activeTab === 'requested' ? 'camera-outline' : 'images-outline'}
                            size={64}
                            color={COLORS.textSecondary}
                        />
                        <Text style={styles.emptyTitle}>
                            {activeTab === 'requested' ? 'No requests yet' : 'No completed jobs yet'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {activeTab === 'requested'
                                ? 'Your photo requests will appear here'
                                : 'Photos you take for others will appear here'}
                        </Text>
                    </View>
                )}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    headerTitle: {
        fontSize: 24,
        color: COLORS.textPrimary,
        ...FONTS.bold,
        paddingHorizontal: SPACING.m,
        marginBottom: SPACING.m,
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: SPACING.m,
        marginBottom: SPACING.m,
        gap: SPACING.s,
    },
    tab: {
        flex: 1,
        paddingVertical: SPACING.s,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    activeTab: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    tabText: {
        color: COLORS.textPrimary,
        fontSize: 14,
        ...FONTS.bold,
    },
    activeTabText: {
        color: '#000000', // Black text on cyan background
    },
    listContent: {
        paddingHorizontal: SPACING.m,
        paddingBottom: SPACING.l,
    },
    emptyListContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xl * 2,
    },
    emptyTitle: {
        color: COLORS.textPrimary,
        fontSize: 18,
        ...FONTS.bold,
        marginTop: SPACING.m,
    },
    emptySubtitle: {
        color: COLORS.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        marginTop: SPACING.s,
        paddingHorizontal: SPACING.xl,
    },
    loadingContainer: {
        padding: SPACING.m,
        alignItems: 'center',
    },
    card: {
        marginBottom: SPACING.m,
        padding: SPACING.m,
    },
    cardContent: {
        width: '100%',
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: SPACING.m,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    contentContainer: {
        flex: 1,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 16,
        ...FONTS.bold,
        marginBottom: 6,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 4,
    },
    locationText: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    priceLabel: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    priceValue: {
        color: COLORS.secondary,
        fontSize: 14,
        ...FONTS.bold,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: SPACING.s,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.m,
        gap: SPACING.s,
        flexWrap: 'wrap',
    },
    statusBadgeLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: SPACING.m,
        borderRadius: 10,
        gap: 6,
    },
    statusText: {
        color: '#000000',
        fontSize: 10,
        ...FONTS.bold,
    },
    statusTextLarge: {
        fontSize: 12,
        ...FONTS.bold,
        letterSpacing: 0.5,
    },
    date: {
        color: COLORS.textSecondary,
        fontSize: 11,
        marginTop: SPACING.s,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    price: {
        fontSize: 16,
        ...FONTS.bold,
        color: COLORS.textPrimary,
    },
    earnings: {
        fontSize: 18,
        ...FONTS.bold,
    },
    photoThumbContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        overflow: 'hidden',
        marginRight: SPACING.m,
        borderWidth: 2,
        borderColor: COLORS.secondary,
        position: 'relative',
    },
    photoThumb: {
        width: '100%',
        height: '100%',
    },
    photoDeliveredBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: COLORS.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: COLORS.cardBg,
    },
    viewPhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.secondary,
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderRadius: 16,
        gap: 4,
    },
    viewPhotoButtonLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.secondary,
        paddingVertical: SPACING.m,
        borderRadius: 12,
        gap: 10,
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 8,
    },
    viewPhotoText: {
        color: '#000000',
        fontSize: 12,
        ...FONTS.bold,
    },
    viewPhotoTextLarge: {
        color: '#000000',
        fontSize: 16,
        ...FONTS.bold,
        letterSpacing: 1,
    },
    adminNotesContainer: {
        backgroundColor: COLORS.background,
        borderRadius: 10,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.secondary,
    },
    adminNotesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    adminNotesLabel: {
        color: COLORS.textSecondary,
        fontSize: 12,
        ...FONTS.medium,
    },
    adminNotesText: {
        color: COLORS.textPrimary,
        fontSize: 13,
        fontStyle: 'italic',
        lineHeight: 18,
        ...FONTS.regular,
    },
    // Rejection notice styles
    rejectionNoticeContainer: {
        backgroundColor: 'rgba(255, 68, 68, 0.08)',
        borderRadius: 10,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.error,
    },
    rejectionNoticeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    rejectionNoticeLabel: {
        color: COLORS.error,
        fontSize: 12,
        ...FONTS.bold,
    },
    rejectionNoticeText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        lineHeight: 18,
        ...FONTS.regular,
    },
});

export default ActivityScreen;
