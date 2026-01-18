import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Platform,
    StatusBar,
    BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { useAdminDisputes } from '../../hooks';

const DisputesList = ({ navigation, route }) => {
    const [filter, setFilter] = useState('pending'); // 'pending' or 'resolved'
    const [needsRefresh, setNeedsRefresh] = useState(false);

    // Supabase hook for real disputes
    const { disputes: supabaseDisputes, loading, error, refetch, isAdmin } = useAdminDisputes();

    // Handle Android hardware back button - go to AdminDashboard
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            navigation.navigate('AdminDashboard');
            return true;
        });
        return () => backHandler.remove();
    }, [navigation]);

    // Handle navigation params for refresh and tab switching after resolving dispute
    useEffect(() => {
        if (route.params?.refresh) {
            console.log('🔄 DisputesList - Setting refresh flag from navigation...');
            setNeedsRefresh(true);
            // Clear the param to avoid re-fetching on subsequent renders
            navigation.setParams({ refresh: undefined });
        }
        if (route.params?.switchToResolved) {
            console.log('📋 DisputesList - Switching to Resolved tab...');
            setFilter('resolved');
            navigation.setParams({ switchToResolved: undefined });
        }
    }, [route.params?.refresh, route.params?.switchToResolved, navigation]);

    // Refetch when screen comes into focus and needs refresh
    useFocusEffect(
        useCallback(() => {
            if (needsRefresh) {
                console.log('🔄 DisputesList - Screen focused, refreshing disputes...');
                refetch();
                setNeedsRefresh(false);
            }
        }, [needsRefresh, refetch])
    );

    // Debug logging
    console.log('📋 DisputesList - isAdmin:', isAdmin, 'supabaseDisputes:', supabaseDisputes?.length, 'error:', error?.message);

    // Only use Supabase data when admin - NO mock data fallback
    const disputes = isAdmin ? supabaseDisputes : [];

    const filteredDisputes = useMemo(() => {
        return disputes.filter(d => {
            const status = d.status?.toLowerCase() || '';
            if (filter === 'pending') {
                return status === 'pending' || status === 'open' || status === 'under_review';
            }
            return status.includes('resolved') || status === 'closed';
        });
    }, [disputes, filter]);

    const pendingCount = disputes.filter(d => {
        const status = d.status?.toLowerCase() || '';
        return status === 'pending' || status === 'open' || status === 'under_review';
    }).length;
    const resolvedCount = disputes.length - pendingCount;

    // Format time for display (handles both mock and Supabase data)
    const formatTime = (dispute) => {
        if (dispute.time) return dispute.time; // Mock data
        if (dispute.created_at) {
            const date = new Date(dispute.created_at);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 60) return `${diffMins} min ago`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            return `${Math.floor(diffHours / 24)}d ago`;
        }
        return '';
    };

    // Get price for display
    const getPrice = (dispute) => {
        if (dispute.price) return dispute.price;
        if (dispute.request_price) return dispute.request_price / 100;
        return 0;
    };

    const renderDisputeCard = (dispute) => {
        const displayId = typeof dispute.id === 'string'
            ? dispute.id.substring(0, 8).toUpperCase()
            : dispute.id;
        const status = dispute.status?.toLowerCase() || 'pending';
        const isPending = status === 'pending' || status === 'open' || status === 'under_review';

        return (
            <TouchableOpacity
                key={dispute.id}
                style={styles.disputeCard}
                onPress={() => navigation.navigate('DisputeReview', { dispute })}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardTitleRow}>
                        <Text style={styles.alertIcon}>🚨</Text>
                        <Text style={styles.disputeId}>DISPUTE #{displayId}</Text>
                    </View>
                    <Text style={styles.timeText}>{formatTime(dispute)}</Text>
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.jobInfo}>
                        €{getPrice(dispute).toFixed(2)}
                    </Text>
                    <Text style={styles.userInfo}>
                        Creator: {dispute.requester?.name || dispute.creator_id?.substring(0, 8) || 'N/A'}
                    </Text>
                    <Text style={styles.userInfo}>
                        Agent: {dispute.photographer?.name || dispute.agent_id?.substring(0, 8) || 'N/A'}
                    </Text>
                    <Text style={styles.reasonText}>
                        Reason: "{dispute.reason || dispute.description || 'No reason provided'}"
                    </Text>
                </View>

                <View style={styles.cardFooter}>
                    <View style={[styles.statusBadge, !isPending && styles.statusBadgeResolved]}>
                        <Text style={[styles.statusText, !isPending && styles.statusTextResolved]}>
                            {isPending ? 'PENDING' : 'RESOLVED'}
                        </Text>
                    </View>
                    <View style={styles.reviewButton}>
                        <Text style={styles.reviewButtonText}>REVIEW</Text>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Handle back navigation - always go to AdminDashboard
    const handleGoBack = () => {
        navigation.navigate('AdminDashboard');
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={handleGoBack}
                        style={styles.backButton}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                        <Ionicons name="arrow-back" size={28} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Disputes</Text>
                    <TouchableOpacity style={styles.filterButton}>
                        <Text style={styles.filterText}>Filter ▼</Text>
                    </TouchableOpacity>
                </View>

                {/* Filter Tabs */}
                <View style={styles.filterTabs}>
                    <TouchableOpacity
                        style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
                        onPress={() => setFilter('pending')}
                    >
                        <Text style={[
                            styles.filterTabText,
                            filter === 'pending' && styles.filterTabTextActive
                        ]}>
                            Pending: {pendingCount}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterTab, filter === 'resolved' && styles.filterTabActive]}
                        onPress={() => setFilter('resolved')}
                    >
                        <Text style={[
                            styles.filterTabText,
                            filter === 'resolved' && styles.filterTabTextActive
                        ]}>
                            Resolved: {resolvedCount}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Disputes List */}
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
                    {loading && filteredDisputes.length === 0 ? (
                        <View style={styles.loadingState}>
                            <ActivityIndicator color={COLORS.primary} size="large" />
                            <Text style={styles.loadingText}>Loading disputes...</Text>
                        </View>
                    ) : filteredDisputes.length > 0 ? (
                        filteredDisputes.map(renderDisputeCard)
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>✓</Text>
                            <Text style={styles.emptyText}>
                                No {filter} disputes
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
        paddingBottom: SPACING.m,
        // Add extra top padding on Android for StatusBar
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + SPACING.l : SPACING.l,
        minHeight: Platform.OS === 'android' ? 80 : 64,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        padding: 12,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        marginRight: SPACING.s,
    },
    headerTitle: {
        fontSize: 18,
        color: COLORS.textPrimary,
        flex: 1,
        ...FONTS.bold,
    },
    filterButton: {
        padding: 4,
    },
    filterText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        ...FONTS.medium,
    },
    filterTabs: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        gap: SPACING.s,
    },
    filterTab: {
        flex: 1,
        paddingVertical: SPACING.s,
        borderRadius: 20,
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    filterTabActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterTabText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        ...FONTS.medium,
    },
    filterTabTextActive: {
        color: '#000000',
    },
    scrollContent: {
        padding: SPACING.m,
    },
    disputeCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.s,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
    },
    alertIcon: {
        fontSize: 16,
    },
    disputeId: {
        color: COLORS.error,
        fontSize: 14,
        ...FONTS.bold,
    },
    timeText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        ...FONTS.regular,
    },
    cardBody: {
        marginBottom: SPACING.m,
    },
    jobInfo: {
        color: COLORS.textPrimary,
        fontSize: 14,
        marginBottom: 4,
        ...FONTS.medium,
    },
    userInfo: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginBottom: 2,
        ...FONTS.regular,
    },
    reasonText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontStyle: 'italic',
        marginTop: 4,
        ...FONTS.regular,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.m,
    },
    statusBadge: {
        backgroundColor: COLORS.error + '30',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: COLORS.error,
        fontSize: 10,
        letterSpacing: 0.5,
        ...FONTS.bold,
    },
    reviewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reviewButtonText: {
        color: COLORS.primary,
        fontSize: 14,
        ...FONTS.bold,
    },
    statusBadgeResolved: {
        backgroundColor: COLORS.secondary + '30',
    },
    statusTextResolved: {
        color: COLORS.secondary,
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
    emptyIcon: {
        fontSize: 48,
        marginBottom: SPACING.m,
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontSize: 16,
        ...FONTS.medium,
    },
});

export default DisputesList;
