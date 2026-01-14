import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Platform,
    ActivityIndicator,
    BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { useAdminStats, useAdminDisputes } from '../../hooks';

/*
 * ============================================================================
 * ADMIN DASHBOARD — Photo Review Portal
 * ============================================================================
 *
 * SECURITY-CRITICAL SCREEN
 *
 * This screen provides access to view and review REPORTED PHOTOS.
 * Access must be strictly controlled in production:
 *
 * FUTURE IMPLEMENTATION REQUIREMENTS:
 * -----------------------------------
 * 1. AUTHENTICATION: Verify user is logged in via backend
 * 2. AUTHORIZATION: Check user role before rendering
 *    - Only 'reviewer' or 'admin' roles can access
 *    - Regular users must NEVER see this screen
 * 3. AUDIT LOGGING: Log all access and actions
 *    - Who viewed which photo
 *    - Approve/reject decisions with timestamps
 * 4. SCREENSHOT PROTECTION: Already implemented in PhotoReviewer
 * 5. SESSION VALIDATION: Re-validate on each sensitive action
 *
 * CURRENT STATE: Dev/testing mode (no backend check)
 * TODO: Implement backend role verification before production
 *
 * ============================================================================
 */

const AdminDashboard = ({ navigation }) => {
    // Supabase hooks for real data
    const { stats, loading: statsLoading, isAdmin } = useAdminStats();
    const { disputes: supabaseDisputes, loading: disputesLoading } = useAdminDisputes();

    // Use Supabase data only when admin - NO mock data fallback
    const disputes = isAdmin ? supabaseDisputes : [];

    // Calculate pending count from actual disputes data (more accurate than stats)
    // This filters disputes by status to count only open/under_review
    const pendingCount = disputes.filter(d => {
        const status = d.status?.toLowerCase() || '';
        return status === 'open' || status === 'under_review';
    }).length;

    const resolvedCount = disputes.length - pendingCount;
    const loading = statsLoading || disputesLoading;

    // Handle Android hardware back button - go to Profile
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs', params: { screen: 'Profile' } }],
            });
            return true;
        });
        return () => backHandler.remove();
    }, [navigation]);

    // Handle back navigation - always go to Profile
    const handleGoBack = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs', params: { screen: 'Profile' } }],
        });
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
                    <Text style={styles.headerTitle}>Admin Dashboard</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Reported Photos Section */}
                    <View style={styles.sectionHeader}>
                        <Ionicons name="flag" size={20} color={COLORS.error} />
                        <Text style={styles.sectionTitle}>Reported Photos</Text>
                    </View>
                    <Text style={styles.sectionDescription}>
                        Review photos that have been reported or disputed by users.
                    </Text>

                    {/* Stats Card */}
                    <View style={styles.statsCard}>
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color={COLORS.primary} />
                            </View>
                        ) : (
                            <>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{pendingCount}</Text>
                                    <Text style={styles.statLabel}>Pending Review</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: COLORS.secondary }]}>
                                        {resolvedCount}
                                    </Text>
                                    <Text style={styles.statLabel}>Resolved</Text>
                                </View>
                            </>
                        )}
                    </View>

                    {/* Review Disputes Button */}
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate('DisputesList')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.buttonContent}>
                            <View style={styles.buttonIconContainer}>
                                <Ionicons name="images" size={24} color={COLORS.textPrimary} />
                            </View>
                            <View style={styles.buttonTextContainer}>
                                <Text style={styles.buttonTitle}>Review Reported Photos</Text>
                                <Text style={styles.buttonSubtitle}>
                                    View and resolve photo disputes
                                </Text>
                            </View>
                        </View>
                        <View style={styles.buttonRight}>
                            {pendingCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{pendingCount}</Text>
                                </View>
                            )}
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                        </View>
                    </TouchableOpacity>

                    {/* Info Note */}
                    <View style={styles.infoNote}>
                        <Ionicons name="information-circle" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.infoText}>
                            Photos are reported when users dispute quality, location accuracy, or content.
                        </Text>
                    </View>
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
    scrollContent: {
        padding: SPACING.m,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
        marginBottom: SPACING.s,
    },
    sectionTitle: {
        fontSize: 18,
        color: COLORS.textPrimary,
        ...FONTS.bold,
    },
    sectionDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: SPACING.l,
        lineHeight: 20,
        ...FONTS.regular,
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.l,
        marginBottom: SPACING.l,
        borderWidth: 1,
        borderColor: COLORS.border,
        minHeight: 80,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 32,
        color: COLORS.error,
        marginBottom: 4,
        ...FONTS.bold,
    },
    statLabel: {
        fontSize: 13,
        color: COLORS.textSecondary,
        ...FONTS.medium,
    },
    statDivider: {
        width: 1,
        backgroundColor: COLORS.border,
        marginHorizontal: SPACING.m,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.l,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    buttonIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: COLORS.error + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
    },
    buttonTextContainer: {
        flex: 1,
    },
    buttonTitle: {
        fontSize: 16,
        color: COLORS.textPrimary,
        marginBottom: 2,
        ...FONTS.bold,
    },
    buttonSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        ...FONTS.regular,
    },
    buttonRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
    },
    badge: {
        backgroundColor: COLORS.error,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 24,
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 12,
        color: '#FFFFFF',
        ...FONTS.bold,
    },
    infoNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.s,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 18,
        ...FONTS.regular,
    },
});

export default AdminDashboard;
