import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import InfoCard from '../components/InfoCard';
import InfoModal, { MODAL_TOKENS } from '../components/InfoModal';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../hooks';

// ============================================================
// MOCK USER STATE (front-end only — replace with real data later)
// ============================================================
/*
 * SECURITY NOTE — Photo Review Access Control (FUTURE IMPLEMENTATION)
 * ====================================================================
 * The Admin Dashboard grants access to view REPORTED PHOTOS.
 * This is a SECURITY-CRITICAL feature that must be restricted:
 *
 * 1. Only authorized reviewers (moderators/admins) can access
 * 2. Access must be verified via backend authentication
 * 3. Role-based access control (RBAC) required:
 *    - "reviewer" role: can view & resolve disputes
 *    - "admin" role: full access + user management
 * 4. All photo review actions must be logged for audit
 * 5. Reviewers should NOT be able to download/screenshot photos
 *
 * Current: isAdmin is a simple boolean flag (dev/testing only)
 * Future: Replace with backend role check (e.g., user.role === 'reviewer')
 * ====================================================================
 */
const MOCK_USER = {
    balance: 127.50,
    photos: 23,
    rating: 4.9,
    strikes: 0,
    // Admin flag — SECURITY: Controls access to photo review
    // TODO: Replace with backend role check (user.role === 'reviewer' || 'admin')
    isAdmin: true,  // DEV: Set to true for admin testing. In production, this comes from backend role check.
    // Payout readiness flags
    hasPayoutMethod: true,   // User has added a payout method (bank/wallet)
    isVerified: true,        // User has completed identity verification
};

/*
 * ============================================================
 * DEV TEST COMBOS — Toggle MOCK_USER flags to test UI states
 * ============================================================
 *
 * TEST 1: No payout method
 *   hasPayoutMethod: false, isVerified: true/false
 *   → CTA: "ADD PAYOUT METHOD" (outline, cyan)
 *   → Status: amber "Add a payout method to cash out"
 *   → Modal: Payout Methods (explicit dismiss)
 *
 * TEST 2: Has payout method, not verified
 *   hasPayoutMethod: true, isVerified: false
 *   → CTA: "VERIFY TO CASH OUT" (outline, cyan)
 *   → Status: amber "Verification required to cash out"
 *   → Modal: Verification (explicit dismiss)
 *
 * TEST 3: Ready to cash out
 *   hasPayoutMethod: true, isVerified: true
 *   → CTA: "CASH OUT" (solid, green)
 *   → Status: green "Ready to cash out"
 *   → Modal: Cash Out coming soon
 *
 * ============================================================
 */

// Use centralized tokens for semantic colors
const TOKEN = MODAL_TOKENS.colors;

// ============================================================
// STATUS BADGE COMPONENT
// ============================================================
const StatusBadge = ({ verified }) => {
    if (verified) {
        return (
            <View style={[styles.badge, styles.badgeVerified]}>
                <Ionicons name="checkmark-circle" size={14} color={TOKEN.success} />
                <Text style={[styles.badgeText, styles.badgeTextVerified]}>Verified</Text>
            </View>
        );
    }
    return (
        <View style={[styles.badge, styles.badgeRequired]}>
            <Ionicons name="alert-circle" size={14} color={TOKEN.warning} />
            <Text style={[styles.badgeText, styles.badgeTextRequired]}>Required</Text>
        </View>
    );
};

// ============================================================
// PROFILE MENU ROW COMPONENT
// ============================================================
const ProfileMenuRow = ({ icon, label, onPress, badge, isLast }) => (
    <TouchableOpacity
        style={[styles.menuItem, isLast && styles.menuItemLast]}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={label}
    >
        <View style={styles.menuLeft}>
            <Ionicons name={icon} size={24} color={TOKEN.textMuted} />
            <Text style={styles.menuText}>{label}</Text>
        </View>
        <View style={styles.menuRight}>
            {badge}
            <Ionicons name="chevron-forward" size={20} color={TOKEN.textMuted} />
        </View>
    </TouchableOpacity>
);

// ============================================================
// MAIN PROFILE SCREEN
// ============================================================
const ProfileScreen = ({ navigation }) => {
    const { signOut, user: authUser } = useAuth();
    const { profile, loading: profileLoading, refetch: refetchProfile } = useProfile();

    // Merge Supabase profile with mock data for fields not yet in DB
    const user = useMemo(() => ({
        ...MOCK_USER,
        // Override with real data when available
        balance: profile?.balance ?? MOCK_USER.balance,
        photos: profile?.completedJobs ?? MOCK_USER.photos,
        rating: profile?.reputationScore ?? MOCK_USER.rating,
        displayName: profile?.displayName || authUser?.email?.split('@')[0] || 'User',
        isAgent: profile?.isAgent ?? false,
        isVerified: profile?.agentVerifiedAt != null,
        // Admin access: check Supabase role, fallback to mock for dev
        isAdmin: profile?.role === 'reviewer' || profile?.role === 'admin' || MOCK_USER.isAdmin,
    }), [profile, authUser]);

    // Modal state
    const [modalConfig, setModalConfig] = useState({
        visible: false,
        icon: 'information-circle',
        iconColor: TOKEN.primary,
        title: '',
        message: '',
        primaryLabel: 'OK',
        primaryAction: null,
        secondaryLabel: null,
        secondaryAction: null,
        type: 'info',
        dismissBehavior: 'anywhere',
    });

    const showModal = (config) => {
        setModalConfig({
            ...modalConfig,
            visible: true,
            dismissBehavior: 'anywhere', // Reset default
            ...config,
        });
    };

    const hideModal = () => {
        setModalConfig((prev) => ({ ...prev, visible: false }));
    };

    // ============================================================
    // PAYOUT STATE LOGIC
    // All warning states use amber (not red) — red is for strikes/bans only
    // ============================================================
    const getPayoutState = () => {
        if (!user.hasPayoutMethod) {
            return {
                status: 'no_method',
                message: 'Add a payout method to cash out',
                messageColor: TOKEN.warning,
                buttonLabel: 'ADD PAYOUT METHOD',
                buttonAction: () => handlePayoutMethodsPress(),
            };
        }
        if (!user.isVerified) {
            return {
                status: 'not_verified',
                message: 'Verification required to cash out',
                messageColor: TOKEN.warning,
                buttonLabel: 'VERIFY TO CASH OUT',
                buttonAction: () => handleVerificationPress(),
            };
        }
        return {
            status: 'ready',
            message: 'Ready to cash out',
            messageColor: TOKEN.success,
            buttonLabel: 'CASH OUT',
            buttonAction: () => handleCashOut(),
        };
    };

    const payoutState = getPayoutState();

    // ============================================================
    // NAVIGATION HANDLERS
    // ============================================================

    // Verification modal — explicit dismiss (critical gating step)
    const handleVerificationPress = () => {
        showModal({
            type: 'coming-soon',
            icon: 'shield-checkmark',
            iconColor: TOKEN.primary,
            title: 'Identity Verification',
            message: 'Verification keeps Echo safe and unlocks payouts. This feature is coming soon.',
            primaryLabel: 'Got it',
            dismissBehavior: 'explicit',
        });
    };

    // Payout Methods modal — explicit dismiss (critical gating step)
    const handlePayoutMethodsPress = () => {
        showModal({
            type: 'coming-soon',
            icon: 'wallet',
            iconColor: TOKEN.success,
            title: 'Payout Methods',
            message: 'Connect your bank account or digital wallet to receive your earnings. Coming soon.',
            primaryLabel: 'Got it',
            dismissBehavior: 'explicit',
        });
    };

    const handleEarningsPress = () => {
        navigation.navigate('Activity');
    };

    const handlePrivacySafetyPress = () => {
        showModal({
            type: 'info',
            icon: 'lock-closed',
            iconColor: TOKEN.primary,
            title: 'Privacy & Safety',
            message: 'Echo protects you with screenshot blocking, secure photo viewing, and fair dispute resolution. Your safety comes first.',
            primaryLabel: 'Got it',
        });
    };

    const handleSupportPress = () => {
        showModal({
            type: 'info',
            icon: 'chatbubble-ellipses',
            iconColor: TOKEN.primary,
            title: 'Support',
            message: 'Need help? Reach out to us at support@echo.app and we\'ll get back to you shortly.',
            primaryLabel: 'OK',
        });
    };

    // Logout modal — warning type (explicit dismiss by default)
    const handleLogoutPress = () => {
        showModal({
            type: 'warning',
            icon: 'log-out',
            iconColor: TOKEN.warning,
            title: 'Log out?',
            message: 'You can log back in anytime with your account.',
            primaryLabel: 'Log out',
            primaryAction: async () => {
                await signOut();
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Auth' }],
                });
            },
            secondaryLabel: 'Cancel',
        });
    };

    // Cash Out modal — explicit dismiss (critical action)
    const handleCashOut = () => {
        showModal({
            type: 'coming-soon',
            icon: 'cash',
            iconColor: TOKEN.success,
            title: 'Cash Out',
            message: `Your balance of €${user.balance.toFixed(2)} is ready. Payout processing is coming soon.`,
            primaryLabel: 'Got it',
            dismissBehavior: 'explicit',
        });
    };

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* ===== EARNINGS CARD (HERO) ===== */}
                <View style={styles.earningsContainer}>
                    <Text style={styles.earningsLabel}>Available Balance</Text>
                    <Text style={styles.earningsValue}>€{user.balance.toFixed(2)}</Text>

                    {/* Payout status message */}
                    <View style={styles.payoutStatusRow}>
                        <View style={[styles.statusDot, { backgroundColor: payoutState.messageColor }]} />
                        <Text style={[styles.payoutStatusText, { color: payoutState.messageColor }]}>
                            {payoutState.message}
                        </Text>
                    </View>

                    {/* Next payout placeholder */}
                    <Text style={styles.nextPayoutText}>Next payout: —</Text>

                    {/* Dynamic Cash Out Button */}
                    <TouchableOpacity
                        style={[
                            styles.cashOutButton,
                            payoutState.status !== 'ready' && styles.cashOutButtonAlt
                        ]}
                        onPress={payoutState.buttonAction}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={payoutState.buttonLabel}
                    >
                        <Text style={[
                            styles.cashOutText,
                            payoutState.status !== 'ready' && styles.cashOutTextAlt
                        ]}>
                            {payoutState.buttonLabel}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* ===== STATS ROW ===== */}
                <View style={styles.statsRow}>
                    <InfoCard style={styles.statCard}>
                        <Text style={styles.statValue}>{user.photos}</Text>
                        <Text style={styles.statLabel}>Photos</Text>
                    </InfoCard>
                    <InfoCard style={styles.statCard}>
                        <Text style={styles.statValue}>{user.rating}</Text>
                        <Text style={styles.statLabel}>Rating</Text>
                    </InfoCard>
                    <InfoCard style={styles.statCard}>
                        <Text style={styles.statValue}>{user.strikes}</Text>
                        <Text style={styles.statLabel}>Strikes</Text>
                    </InfoCard>
                </View>

                {/* ===== MENU OPTIONS (Payout-first order) ===== */}
                <View style={styles.menuContainer}>
                    {/* 1. Verification / Identity */}
                    <ProfileMenuRow
                        icon="shield-checkmark-outline"
                        label="Verification"
                        onPress={handleVerificationPress}
                        badge={<StatusBadge verified={user.isVerified} />}
                    />

                    {/* 2. Payout Methods */}
                    <ProfileMenuRow
                        icon="wallet-outline"
                        label="Payout Methods"
                        onPress={handlePayoutMethodsPress}
                    />

                    {/* 3. Earnings & Payouts */}
                    <ProfileMenuRow
                        icon="trending-up-outline"
                        label="Earnings & Payouts"
                        onPress={handleEarningsPress}
                    />

                    {/* 4. Privacy & Safety */}
                    <ProfileMenuRow
                        icon="lock-closed-outline"
                        label="Privacy & Safety"
                        onPress={handlePrivacySafetyPress}
                    />

                    {/* 5. Support */}
                    <ProfileMenuRow
                        icon="help-circle-outline"
                        label="Support"
                        onPress={handleSupportPress}
                    />

                    {/* 6. Logout */}
                    <ProfileMenuRow
                        icon="log-out-outline"
                        label="Logout"
                        onPress={handleLogoutPress}
                        isLast
                    />
                </View>

                {/* ===== ADMIN DASHBOARD (Hard-gated: renders ONLY if isAdmin === true) ===== */}
                {user.isAdmin === true && (
                    <TouchableOpacity
                        style={styles.adminButton}
                        onPress={() => navigation.navigate('AdminDashboard')}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Admin Dashboard"
                    >
                        <View style={styles.adminIconContainer}>
                            <Ionicons name="shield-checkmark" size={24} color={TOKEN.textDark} />
                        </View>
                        <View style={styles.adminTextContainer}>
                            <Text style={styles.adminButtonTitle}>Admin Dashboard</Text>
                            <Text style={styles.adminButtonSubtitle}>Manage jobs, users & disputes</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={TOKEN.primary} />
                    </TouchableOpacity>
                )}

            </ScrollView>

            {/* ===== INFO MODAL ===== */}
            <InfoModal
                visible={modalConfig.visible}
                onClose={hideModal}
                icon={modalConfig.icon}
                iconColor={modalConfig.iconColor}
                title={modalConfig.title}
                message={modalConfig.message}
                primaryLabel={modalConfig.primaryLabel}
                primaryAction={modalConfig.primaryAction}
                secondaryLabel={modalConfig.secondaryLabel}
                secondaryAction={modalConfig.secondaryAction}
                type={modalConfig.type}
                dismissBehavior={modalConfig.dismissBehavior}
            />
        </ScreenWrapper>
    );
};

// ============================================================
// STYLES — Using centralized tokens where applicable
// ============================================================
const styles = StyleSheet.create({
    scrollContent: {
        padding: SPACING.m,
        paddingBottom: SPACING.xl,
    },

    // Earnings Card
    earningsContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: SPACING.l,
        alignItems: 'center',
        marginBottom: SPACING.l,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    earningsLabel: {
        color: TOKEN.textMuted,
        fontSize: 14,
        marginBottom: SPACING.s,
        ...FONTS.medium,
    },
    earningsValue: {
        color: TOKEN.success,
        fontSize: 48,
        ...FONTS.bold,
        marginBottom: 6,
    },
    payoutStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    payoutStatusText: {
        fontSize: 13,
        ...FONTS.medium,
    },
    nextPayoutText: {
        color: TOKEN.textMuted,
        fontSize: 12,
        marginBottom: SPACING.m,
        marginTop: 2,
        ...FONTS.regular,
    },
    cashOutButton: {
        paddingHorizontal: SPACING.xl,
        minHeight: 48,
        borderRadius: 30,
        backgroundColor: TOKEN.success,
        minWidth: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cashOutButtonAlt: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: TOKEN.primary,
    },
    cashOutText: {
        color: TOKEN.textDark,
        fontSize: 14,
        letterSpacing: 0.5,
        ...FONTS.bold,
    },
    cashOutTextAlt: {
        color: TOKEN.primary,
    },

    // Stats Row
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.l,
        gap: SPACING.s,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.m,
    },
    statValue: {
        color: TOKEN.text,
        fontSize: 20,
        ...FONTS.bold,
        marginBottom: 4,
    },
    statLabel: {
        color: TOKEN.textMuted,
        fontSize: 12,
    },

    // Menu Container
    menuContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.m,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        minHeight: 56,
    },
    menuItemLast: {
        borderBottomWidth: 0,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.m,
    },
    menuRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
    },
    menuText: {
        color: TOKEN.text,
        fontSize: 16,
        ...FONTS.medium,
    },

    // Status Badge
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    badgeVerified: {
        backgroundColor: `${TOKEN.success}26`,
    },
    badgeRequired: {
        backgroundColor: `${TOKEN.warning}26`,
    },
    badgeText: {
        fontSize: 12,
        ...FONTS.medium,
    },
    badgeTextVerified: {
        color: TOKEN.success,
    },
    badgeTextRequired: {
        color: TOKEN.warning,
    },

    // Admin Button
    adminButton: {
        marginTop: SPACING.l,
        padding: SPACING.m,
        borderRadius: 16,
        backgroundColor: TOKEN.primary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.m,
    },
    adminIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    adminTextContainer: {
        flex: 1,
    },
    adminButtonTitle: {
        color: TOKEN.textDark,
        fontSize: 16,
        ...FONTS.bold,
    },
    adminButtonSubtitle: {
        color: 'rgba(0,0,0,0.6)',
        fontSize: 12,
        marginTop: 2,
        ...FONTS.regular,
    },
});

export default ProfileScreen;
