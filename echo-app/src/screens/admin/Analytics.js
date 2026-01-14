import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { getMockAnalytics } from '../../utils/adminHelpers';
import { useAdminAnalytics } from '../../hooks';

const Analytics = ({ navigation }) => {
    const [period, setPeriod] = useState('This Week');
    const periods = ['Today', 'This Week', 'This Month', 'All Time'];

    // Supabase hook for real analytics
    const {
        analytics: supabaseAnalytics,
        topPhotographers: supabaseTopPhotographers,
        loading,
        refetch,
        isAdmin
    } = useAdminAnalytics(period);

    // Fallback to mock data
    const mockAnalytics = getMockAnalytics();

    // Use Supabase data if available, otherwise mock
    const analytics = isAdmin && supabaseAnalytics ? {
        revenue: supabaseAnalytics.revenue || mockAnalytics.revenue,
        jobs: supabaseAnalytics.jobs || mockAnalytics.jobs,
        users: supabaseAnalytics.users || mockAnalytics.users,
        topPhotographers: supabaseTopPhotographers?.length > 0
            ? supabaseTopPhotographers
            : mockAnalytics.topPhotographers,
        quickStats: supabaseAnalytics.quickStats || {
            successRate: 92,
            avgCompletionMinutes: 4.2,
            avgRating: 4.7
        }
    } : mockAnalytics;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Analytics</Text>
                    <TouchableOpacity style={styles.periodButton}>
                        <Text style={styles.periodText}>📅 {period}</Text>
                    </TouchableOpacity>
                </View>

                {/* Period Selector */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.periodScroll}
                >
                    {periods.map((p) => (
                        <TouchableOpacity
                            key={p}
                            style={[
                                styles.periodChip,
                                period === p && styles.periodChipActive
                            ]}
                            onPress={() => setPeriod(p)}
                        >
                            <Text style={[
                                styles.periodChipText,
                                period === p && styles.periodChipTextActive
                            ]}>
                                {p}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={refetch}
                            tintColor={COLORS.primary}
                            colors={[COLORS.primary]}
                        />
                    }
                >
                    {loading && !analytics ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    ) : null}

                    {/* Revenue Card */}
                    <View style={styles.revenueCard}>
                        <Text style={styles.cardLabel}>Revenue</Text>
                        <Text style={styles.revenueValue}>
                            €{analytics.revenue.total.toFixed(2)}
                        </Text>
                        <View style={styles.changeRow}>
                            <Ionicons
                                name="arrow-up"
                                size={14}
                                color={COLORS.secondary}
                            />
                            <Text style={styles.changeText}>
                                {analytics.revenue.change}% from last week
                            </Text>
                        </View>
                    </View>

                    {/* Jobs Card */}
                    <View style={styles.statsCard}>
                        <Text style={styles.cardLabel}>Jobs</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{analytics.jobs.created}</Text>
                                <Text style={styles.statLabel}>Created</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: COLORS.secondary }]}>
                                    {analytics.jobs.completed}
                                </Text>
                                <Text style={styles.statLabel}>Completed</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: COLORS.error }]}>
                                    {analytics.jobs.disputed}
                                </Text>
                                <Text style={styles.statLabel}>Disputed</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: COLORS.textSecondary }]}>
                                    {analytics.jobs.expired}
                                </Text>
                                <Text style={styles.statLabel}>Expired</Text>
                            </View>
                        </View>
                    </View>

                    {/* Users Card */}
                    <View style={styles.statsCard}>
                        <Text style={styles.cardLabel}>Users</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: COLORS.primary }]}>
                                    {analytics.users.new}
                                </Text>
                                <Text style={styles.statLabel}>New</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: COLORS.secondary }]}>
                                    {analytics.users.active}
                                </Text>
                                <Text style={styles.statLabel}>Active</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: COLORS.error }]}>
                                    {analytics.users.banned}
                                </Text>
                                <Text style={styles.statLabel}>Banned</Text>
                            </View>
                        </View>
                    </View>

                    {/* Top Photographers */}
                    <View style={styles.topCard}>
                        <Text style={styles.cardLabel}>Top Photographers</Text>
                        {analytics.topPhotographers.map((photographer, index) => (
                            <View key={photographer.id} style={styles.topItem}>
                                <View style={styles.topRank}>
                                    <Text style={styles.topRankText}>{index + 1}</Text>
                                </View>
                                <View style={styles.topInfo}>
                                    <Text style={styles.topName}>{photographer.name}</Text>
                                    <Text style={styles.topStats}>
                                        {photographer.jobs} jobs
                                    </Text>
                                </View>
                                <Text style={styles.topEarnings}>
                                    €{photographer.earnings.toFixed(2)}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Quick Stats */}
                    <View style={styles.quickStats}>
                        <View style={styles.quickStatItem}>
                            <Text style={styles.quickStatIcon}>📈</Text>
                            <Text style={styles.quickStatValue}>
                                {analytics.quickStats?.successRate ?? 92}%
                            </Text>
                            <Text style={styles.quickStatLabel}>Success Rate</Text>
                        </View>
                        <View style={styles.quickStatItem}>
                            <Text style={styles.quickStatIcon}>⏱️</Text>
                            <Text style={styles.quickStatValue}>
                                {analytics.quickStats?.avgCompletionMinutes ?? 4.2}m
                            </Text>
                            <Text style={styles.quickStatLabel}>Avg. Completion</Text>
                        </View>
                        <View style={styles.quickStatItem}>
                            <Text style={styles.quickStatIcon}>⭐</Text>
                            <Text style={styles.quickStatValue}>
                                {analytics.quickStats?.avgRating ?? 4.7}
                            </Text>
                            <Text style={styles.quickStatLabel}>Avg. Rating</Text>
                        </View>
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
        paddingVertical: SPACING.m,
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
    periodButton: {
        padding: 4,
    },
    periodText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        ...FONTS.medium,
    },
    periodScroll: {
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        gap: SPACING.s,
    },
    periodChip: {
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: SPACING.s,
    },
    periodChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    periodChipText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        ...FONTS.medium,
    },
    periodChipTextActive: {
        color: '#000000',
    },
    scrollContent: {
        padding: SPACING.m,
    },
    revenueCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.l,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    cardLabel: {
        color: COLORS.textSecondary,
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.s,
        ...FONTS.bold,
    },
    revenueValue: {
        color: COLORS.secondary,
        fontSize: 42,
        ...FONTS.bold,
    },
    changeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.s,
        gap: 4,
    },
    changeText: {
        color: COLORS.secondary,
        fontSize: 13,
        ...FONTS.medium,
    },
    statsCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: SPACING.s,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        color: COLORS.textPrimary,
        fontSize: 22,
        ...FONTS.bold,
    },
    statLabel: {
        color: COLORS.textSecondary,
        fontSize: 11,
        marginTop: 2,
        ...FONTS.regular,
    },
    topCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    topItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.s,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    topRank: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary + '30',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
    },
    topRankText: {
        color: COLORS.primary,
        fontSize: 14,
        ...FONTS.bold,
    },
    topInfo: {
        flex: 1,
    },
    topName: {
        color: COLORS.textPrimary,
        fontSize: 14,
        ...FONTS.medium,
    },
    topStats: {
        color: COLORS.textSecondary,
        fontSize: 12,
        ...FONTS.regular,
    },
    topEarnings: {
        color: COLORS.secondary,
        fontSize: 16,
        ...FONTS.bold,
    },
    quickStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: SPACING.s,
    },
    quickStatItem: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: SPACING.m,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    quickStatIcon: {
        fontSize: 20,
        marginBottom: 4,
    },
    quickStatValue: {
        color: COLORS.textPrimary,
        fontSize: 18,
        ...FONTS.bold,
    },
    quickStatLabel: {
        color: COLORS.textSecondary,
        fontSize: 10,
        marginTop: 2,
        textAlign: 'center',
        ...FONTS.regular,
    },
    loadingContainer: {
        padding: SPACING.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default Analytics;
