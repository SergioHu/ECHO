import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import InfoCard from '../components/InfoCard';
import InfoModal, { MODAL_TOKENS } from '../components/InfoModal';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../hooks';
import { useToast } from '../context/ToastContext';

const TOKEN = MODAL_TOKENS.colors;

// ============================================================
// PROFILE MENU ROW
// ============================================================
const ProfileMenuRow = ({ icon, label, onPress, isLast }) => (
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
        <Ionicons name="chevron-forward" size={20} color={TOKEN.textMuted} />
    </TouchableOpacity>
);

// ============================================================
// MAIN PROFILE SCREEN
// ============================================================
const ProfileScreen = ({ navigation }) => {
    const { signOut, user: authUser } = useAuth();
    const { profile, updateProfile } = useProfile();
    const { showToast } = useToast();

    const user = useMemo(() => {
        const rawName = profile?.displayName;
        // If display_name in DB is an email (old accounts before name field), use the prefix
        const displayName = rawName
            ? (rawName.includes('@') ? rawName.split('@')[0] : rawName)
            : (authUser?.email?.split('@')[0] || 'User');

        return {
            displayName,
            balance: profile?.balance ?? 0,
            completedJobs: profile?.completedJobs ?? 0,
            createdRequests: profile?.createdRequests ?? 0,
            isAgent: profile?.isAgent ?? false,
            isAdmin: profile?.role === 'reviewer' || profile?.role === 'admin',
        };
    }, [profile, authUser]);

    const [isEditingName, setIsEditingName] = useState(false);
    const [nameInput, setNameInput] = useState('');

    // Used only for logout confirmation
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

    const showModal = (config) => setModalConfig(prev => ({ ...prev, visible: true, ...config }));
    const hideModal = () => setModalConfig(prev => ({ ...prev, visible: false }));

    const handleSaveName = async () => {
        if (!nameInput.trim()) return;
        const { error } = await updateProfile({ displayName: nameInput.trim() });
        if (error) {
            showToast('Failed to update name', 'error');
        } else {
            setIsEditingName(false);
        }
    };

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
                navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
            },
            secondaryLabel: 'Cancel',
        });
    };

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* ===== IDENTITY HEADER ===== */}
                <View style={styles.identityHeader}>
                    <View style={styles.initialsCircle}>
                        <Text style={styles.initialsText}>
                            {user.displayName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.identityInfo}>
                        {isEditingName ? (
                            <View style={styles.editNameRow}>
                                <TextInput
                                    style={styles.nameInput}
                                    value={nameInput}
                                    onChangeText={setNameInput}
                                    autoFocus
                                    maxLength={40}
                                    placeholder="Your name"
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                                <TouchableOpacity style={styles.nameSaveBtn} onPress={handleSaveName}>
                                    <Text style={styles.nameSaveBtnText}>Save</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setIsEditingName(false)}>
                                    <Text style={styles.nameCancelText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.nameRow}
                                onPress={() => { setNameInput(user.displayName); setIsEditingName(true); }}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.displayName}>{user.displayName}</Text>
                                <Ionicons name="pencil-outline" size={14} color={COLORS.textSecondary} style={{ marginLeft: 6 }} />
                            </TouchableOpacity>
                        )}
                        <Text style={styles.emailText}>{authUser?.email || ''}</Text>
                    </View>
                </View>

                {/* ===== AGENT MODE TOGGLE ===== */}
                <View style={styles.agentToggleRow}>
                    <View style={styles.agentToggleLeft}>
                        <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
                        <View style={{ marginLeft: SPACING.m }}>
                            <Text style={styles.agentToggleLabel}>Agent Mode</Text>
                            <Text style={styles.agentToggleSub}>Accept photo jobs from the map</Text>
                        </View>
                    </View>
                    <Switch
                        value={user.isAgent}
                        onValueChange={(val) => updateProfile({ isAgent: val })}
                        trackColor={{ false: COLORS.border, true: COLORS.primary + '66' }}
                        thumbColor={user.isAgent ? COLORS.primary : COLORS.textSecondary}
                    />
                </View>

                {/* ===== BALANCE CARD ===== */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Available Balance</Text>
                    <Text style={styles.balanceValue}>€{user.balance.toFixed(2)}</Text>
                </View>

                {/* ===== STATS ROW ===== */}
                <View style={styles.statsRow}>
                    <InfoCard style={styles.statCard}>
                        <Text style={styles.statValue}>{user.completedJobs}</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </InfoCard>
                    <InfoCard style={styles.statCard}>
                        <Text style={styles.statValue}>{user.createdRequests}</Text>
                        <Text style={styles.statLabel}>Requested</Text>
                    </InfoCard>
                </View>

                {/* ===== MENU ===== */}
                <View style={styles.menuContainer}>
                    <ProfileMenuRow
                        icon="log-out-outline"
                        label="Logout"
                        onPress={handleLogoutPress}
                        isLast
                    />
                </View>

                {/* ===== ADMIN DASHBOARD (role-gated) ===== */}
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

const styles = StyleSheet.create({
    scrollContent: {
        padding: SPACING.m,
        paddingBottom: SPACING.xl,
    },

    // Identity Header
    identityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.m,
        marginBottom: SPACING.s,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    initialsCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: COLORS.primary + '33',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
    },
    initialsText: {
        color: COLORS.primary,
        fontSize: 22,
        fontWeight: '700',
    },
    identityInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    displayName: {
        color: COLORS.textPrimary,
        fontSize: 18,
        fontWeight: '600',
    },
    emailText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginTop: 2,
    },
    editNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
    },
    nameInput: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.primary,
        paddingVertical: 2,
    },
    nameSaveBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.s,
        paddingVertical: 4,
        borderRadius: 8,
    },
    nameSaveBtnText: {
        color: '#000',
        fontSize: 13,
        fontWeight: '600',
    },
    nameCancelText: {
        color: COLORS.textSecondary,
        fontSize: 13,
    },

    // Agent Toggle
    agentToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.m,
        marginBottom: SPACING.s,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    agentToggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    agentToggleLabel: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: '600',
    },
    agentToggleSub: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginTop: 1,
    },

    // Balance Card
    balanceCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: SPACING.l,
        alignItems: 'center',
        marginBottom: SPACING.s,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    balanceLabel: {
        color: TOKEN.textMuted,
        fontSize: 14,
        marginBottom: SPACING.s,
        ...FONTS.medium,
    },
    balanceValue: {
        color: TOKEN.success,
        fontSize: 48,
        ...FONTS.bold,
    },

    // Stats Row
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.m,
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

    // Menu
    menuContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.s,
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
    menuText: {
        color: TOKEN.text,
        fontSize: 16,
        ...FONTS.medium,
    },

    // Admin Button
    adminButton: {
        marginTop: SPACING.s,
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
