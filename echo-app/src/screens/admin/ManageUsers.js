import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { getMockUsers } from '../../utils/adminHelpers';
import { useAdminUsers } from '../../hooks';

const ManageUsers = ({ navigation }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);

    // Supabase hook for real users
    const { users: supabaseUsers, loading, refetch, updateUserRole, isAdmin } = useAdminUsers(searchQuery);

    // Fallback to mock data if not admin or no Supabase data
    const mockUsers = getMockUsers();
    const users = isAdmin && supabaseUsers.length > 0 ? supabaseUsers : mockUsers;

    const filteredUsers = useMemo(() => {
        if (isAdmin && supabaseUsers.length > 0) {
            // Supabase already filters via RPC
            return users;
        }
        // Filter mock data locally
        return users.filter(user =>
            (user.name || user.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [users, searchQuery, isAdmin, supabaseUsers.length]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return COLORS.secondary;
            case 'warning':
                return '#FF9500';
            case 'banned':
                return COLORS.error;
            default:
                return COLORS.textSecondary;
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'active':
                return '●';
            case 'warning':
                return '⚠️';
            case 'banned':
                return '🚫';
            default:
                return '○';
        }
    };

    const handleUserAction = (action, user) => {
        const actions = {
            addStrike: `Add strike to ${user.name}?`,
            removeStrike: `Remove strike from ${user.name}?`,
            ban: `Ban ${user.name}? This action cannot be undone easily.`,
            resetPassword: `Send password reset to ${user.email}?`,
        };

        Alert.alert(
            'Confirm Action',
            actions[action],
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    style: action === 'ban' ? 'destructive' : 'default',
                    onPress: () => {
                        Alert.alert('Success', `Action completed for ${user.name}`);
                        setSelectedUser(null);
                    },
                },
            ]
        );
    };

    // Helper to get user display values (supports both mock and Supabase data)
    const getUserName = (user) => user.name || user.display_name || 'Unknown';
    const getUserBalance = (user) => {
        if (typeof user.balance === 'number') return user.balance;
        if (typeof user.balance_cents === 'number') return user.balance_cents / 100;
        return 0;
    };
    const getUserRating = (user) => user.rating || user.reputation_score || 0;
    const getUserPhotos = (user) => user.photos || user.completed_jobs || 0;
    const getUserStrikes = (user) => user.strikes || 0;
    const getUserStatus = (user) => {
        if (user.status) return user.status;
        if (user.role === 'admin' || user.role === 'reviewer') return 'admin';
        if (user.is_agent) return 'agent';
        return 'active';
    };
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        if (typeof dateStr === 'string' && !dateStr.includes('T')) return dateStr;
        return new Date(dateStr).toLocaleDateString();
    };

    const renderUserCard = (user) => {
        const userName = getUserName(user);
        const userBalance = getUserBalance(user);
        const userRating = getUserRating(user);
        const userPhotos = getUserPhotos(user);
        const userStrikes = getUserStrikes(user);
        const userStatus = getUserStatus(user);

        return (
            <TouchableOpacity
                key={user.id}
                style={styles.userCard}
                onPress={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.userIcon}>
                        <Text style={styles.userIconText}>👤</Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{userName}</Text>
                        <Text style={styles.userStats}>
                            Jobs: {userPhotos} | Rating: {userRating}
                        </Text>
                        <Text style={styles.userStats}>
                            Strikes: {userStrikes} | Balance: €{userBalance.toFixed(2)}
                        </Text>
                    </View>
                    <View style={styles.statusContainer}>
                        <Text style={[styles.statusIcon, { color: getStatusColor(userStatus) }]}>
                            {getStatusIcon(userStatus)}
                        </Text>
                        <Text style={[styles.statusText, { color: getStatusColor(userStatus) }]}>
                            {userStatus.charAt(0).toUpperCase() + userStatus.slice(1)}
                        </Text>
                    </View>
                </View>

                {/* Expanded Details */}
                {selectedUser?.id === user.id && (
                    <View style={styles.expandedSection}>
                        <View style={styles.divider} />

                        <View style={styles.detailsGrid}>
                            <Text style={styles.detailItem}>Email: {user.email || 'N/A'}</Text>
                            <Text style={styles.detailItem}>Joined: {formatDate(user.joined || user.created_at)}</Text>
                            <Text style={styles.detailItem}>Role: {user.role || 'user'}</Text>
                            <Text style={styles.detailItem}>Requests: {user.jobsRequested || user.created_requests || 0}</Text>
                        </View>

                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.actionBtnWarning]}
                                onPress={() => handleUserAction('addStrike', user)}
                            >
                                <Text style={styles.actionBtnText}>Add Strike</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.actionBtnSuccess]}
                                onPress={() => handleUserAction('removeStrike', user)}
                            >
                                <Text style={styles.actionBtnText}>Remove Strike</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.actionBtnDanger]}
                                onPress={() => handleUserAction('ban', user)}
                            >
                                <Text style={styles.actionBtnText}>Ban User</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.actionBtnNeutral]}
                                onPress={() => handleUserAction('resetPassword', user)}
                            >
                                <Text style={styles.actionBtnText}>Reset Password</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

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
                    <Text style={styles.headerTitle}>Manage Users</Text>
                    <TouchableOpacity style={styles.searchIcon}>
                        <Ionicons name="search" size={22} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={18} color={COLORS.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search users..."
                        placeholderTextColor={COLORS.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Users List */}
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
                    {loading && filteredUsers.length === 0 ? (
                        <View style={styles.loadingState}>
                            <ActivityIndicator color={COLORS.primary} size="large" />
                            <Text style={styles.loadingText}>Loading users...</Text>
                        </View>
                    ) : filteredUsers.length > 0 ? (
                        filteredUsers.map(renderUserCard)
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>👥</Text>
                            <Text style={styles.emptyText}>No users found</Text>
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
    searchIcon: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        marginHorizontal: SPACING.m,
        marginVertical: SPACING.s,
        paddingHorizontal: SPACING.m,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchInput: {
        flex: 1,
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.s,
        color: COLORS.textPrimary,
        fontSize: 14,
        ...FONTS.regular,
    },
    scrollContent: {
        padding: SPACING.m,
    },
    userCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    userIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
    },
    userIconText: {
        fontSize: 18,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        color: COLORS.textPrimary,
        fontSize: 16,
        marginBottom: 4,
        ...FONTS.bold,
    },
    userStats: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginBottom: 2,
        ...FONTS.regular,
    },
    statusContainer: {
        alignItems: 'flex-end',
    },
    statusIcon: {
        fontSize: 12,
        marginBottom: 2,
    },
    statusText: {
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        ...FONTS.bold,
    },
    expandedSection: {
        marginTop: SPACING.m,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: SPACING.m,
    },
    detailsGrid: {
        marginBottom: SPACING.m,
    },
    detailItem: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginBottom: 4,
        ...FONTS.regular,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: SPACING.s,
        marginBottom: SPACING.s,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: SPACING.s,
        borderRadius: 8,
        alignItems: 'center',
    },
    actionBtnWarning: {
        backgroundColor: '#FF9500' + '30',
        borderWidth: 1,
        borderColor: '#FF9500',
    },
    actionBtnSuccess: {
        backgroundColor: COLORS.secondary + '30',
        borderWidth: 1,
        borderColor: COLORS.secondary,
    },
    actionBtnDanger: {
        backgroundColor: COLORS.error + '30',
        borderWidth: 1,
        borderColor: COLORS.error,
    },
    actionBtnNeutral: {
        backgroundColor: COLORS.primary + '30',
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    actionBtnText: {
        color: COLORS.textPrimary,
        fontSize: 12,
        ...FONTS.medium,
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

export default ManageUsers;
