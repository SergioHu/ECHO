import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../constants/theme';

// ============================================================
// MODAL TOKENS — Single source of truth for modal styling
// ============================================================
export const MODAL_TOKENS = {
    // Semantic colors
    colors: {
        surface: COLORS.surface,
        border: COLORS.border,
        overlay: 'rgba(0, 0, 0, 0.8)',
        // Action colors
        primary: COLORS.primary,         // Cyan — primary actions
        success: COLORS.secondary,       // Green — success, money, ready
        warning: '#FFB800',              // Amber — required steps, attention
        danger: '#FF4D4D',               // Red — destructive, bans, strikes only
        // Text colors
        text: COLORS.textPrimary,
        textMuted: COLORS.textSecondary,
        textDark: '#000000',
    },
    // Spacing
    spacing: {
        padding: SPACING.l,
        gap: SPACING.s,
        iconSize: 64,
        buttonHeight: 48,                // Min 44px for tap targets
    },
    // Radii
    radius: {
        container: 20,
        button: 12,
        icon: 32,
    },
};

/**
 * InfoModal - Production-grade modal component for Echo app
 *
 * Props:
 * - visible: boolean - Controls modal visibility
 * - onClose: function - Called when modal is dismissed
 * - icon: string - Ionicons icon name
 * - iconColor: string - Icon color (uses token if not provided)
 * - title: string - Modal title (max 1 line, ellipsized)
 * - message: string - Modal message (max 3 lines)
 * - primaryLabel: string - Primary button label (default: 'OK')
 * - primaryAction: function - Primary button action
 * - secondaryLabel: string - Optional secondary button label
 * - secondaryAction: function - Optional secondary button action
 * - type: 'info' | 'success' | 'warning' | 'coming-soon' - Preset styling
 * - dismissBehavior: 'anywhere' | 'explicit' - How modal can be dismissed
 *   - 'anywhere': tap outside or buttons (default for info, coming-soon)
 *   - 'explicit': only via buttons (default for warning)
 * - showCloseButton: boolean - Show X button (auto-hidden for explicit dismiss)
 */
const InfoModal = ({
    visible,
    onClose,
    icon,
    iconColor,
    title,
    message,
    primaryLabel = 'OK',
    primaryAction,
    secondaryLabel,
    secondaryAction,
    type = 'info',
    dismissBehavior,
    showCloseButton,
}) => {
    const T = MODAL_TOKENS;

    // Derive defaults from type
    const getTypeDefaults = () => {
        switch (type) {
            case 'success':
                return {
                    icon: 'checkmark-circle',
                    color: T.colors.success,
                    dismiss: 'anywhere',
                };
            case 'warning':
                return {
                    icon: 'alert-circle',
                    color: T.colors.warning,
                    dismiss: 'explicit',
                };
            case 'coming-soon':
                return {
                    icon: 'time',
                    color: T.colors.primary,
                    dismiss: 'anywhere',
                };
            case 'info':
            default:
                return {
                    icon: 'information-circle',
                    color: T.colors.primary,
                    dismiss: 'anywhere',
                };
        }
    };

    const defaults = getTypeDefaults();
    const finalIcon = icon || defaults.icon;
    const finalIconColor = iconColor || defaults.color;
    const finalDismissBehavior = dismissBehavior || defaults.dismiss;
    const canDismissAnywhere = finalDismissBehavior === 'anywhere';
    const shouldShowCloseButton = showCloseButton !== undefined
        ? showCloseButton
        : canDismissAnywhere;

    const handleOverlayPress = () => {
        if (canDismissAnywhere) {
            onClose();
        }
    };

    const handlePrimaryPress = () => {
        if (primaryAction) {
            primaryAction();
        }
        onClose();
    };

    const handleSecondaryPress = () => {
        if (secondaryAction) {
            secondaryAction();
        }
        onClose();
    };

    // Determine if this is a warning-style modal (for accent styling)
    const isWarningStyle = type === 'warning';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={canDismissAnywhere ? onClose : undefined}
        >
            <TouchableWithoutFeedback onPress={handleOverlayPress}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[
                            styles.container,
                            isWarningStyle && styles.containerWarning,
                        ]}>
                            {/* Close button (X) - only when allowed */}
                            {shouldShowCloseButton && (
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={onClose}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel="Close modal"
                                >
                                    <Ionicons
                                        name="close"
                                        size={20}
                                        color={T.colors.textMuted}
                                    />
                                </TouchableOpacity>
                            )}

                            {/* Icon */}
                            <View style={[
                                styles.iconContainer,
                                { backgroundColor: `${finalIconColor}15` }
                            ]}>
                                <Ionicons
                                    name={finalIcon}
                                    size={32}
                                    color={finalIconColor}
                                />
                            </View>

                            {/* Title - max 1 line */}
                            <Text
                                style={styles.title}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {title}
                            </Text>

                            {/* Message - max 3 lines */}
                            <Text
                                style={styles.message}
                                numberOfLines={3}
                                ellipsizeMode="tail"
                            >
                                {message}
                            </Text>

                            {/* Buttons */}
                            <View style={styles.buttonContainer}>
                                {secondaryLabel && (
                                    <TouchableOpacity
                                        style={styles.secondaryButton}
                                        onPress={handleSecondaryPress}
                                        activeOpacity={0.7}
                                        accessibilityRole="button"
                                        accessibilityLabel={secondaryLabel}
                                    >
                                        <Text style={styles.secondaryButtonText}>
                                            {secondaryLabel}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[
                                        styles.primaryButton,
                                        !secondaryLabel && styles.primaryButtonFull,
                                    ]}
                                    onPress={handlePrimaryPress}
                                    activeOpacity={0.8}
                                    accessibilityRole="button"
                                    accessibilityLabel={primaryLabel}
                                >
                                    {isWarningStyle && (
                                        <Ionicons
                                            name="alert-circle"
                                            size={16}
                                            color={T.colors.textDark}
                                            style={styles.buttonIcon}
                                        />
                                    )}
                                    <Text style={styles.primaryButtonText}>
                                        {primaryLabel}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ============================================================
// STYLES
// ============================================================
const T = MODAL_TOKENS;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: T.colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: T.spacing.padding,
    },
    container: {
        backgroundColor: T.colors.surface,
        borderRadius: T.radius.container,
        padding: T.spacing.padding,
        paddingTop: T.spacing.padding + 8,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: T.colors.border,
    },
    containerWarning: {
        borderColor: T.colors.warning,
        borderWidth: 1.5,
    },
    closeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: T.spacing.iconSize,
        height: T.spacing.iconSize,
        borderRadius: T.radius.icon,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.m,
    },
    title: {
        color: T.colors.text,
        fontSize: 18,
        textAlign: 'center',
        marginBottom: SPACING.s,
        maxWidth: '100%',
        ...FONTS.bold,
    },
    message: {
        color: T.colors.textMuted,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: T.spacing.padding,
        maxWidth: '100%',
        ...FONTS.regular,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: T.spacing.gap,
    },
    primaryButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: T.colors.primary,
        minHeight: T.spacing.buttonHeight,
        borderRadius: T.radius.button,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.m,
    },
    primaryButtonFull: {
        flex: 1,
    },
    buttonIcon: {
        marginRight: 6,
    },
    primaryButtonText: {
        color: T.colors.textDark,
        fontSize: 15,
        ...FONTS.bold,
    },
    secondaryButton: {
        flex: 1,
        backgroundColor: 'transparent',
        minHeight: T.spacing.buttonHeight,
        borderRadius: T.radius.button,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: T.colors.primary,
        paddingHorizontal: SPACING.m,
    },
    secondaryButtonText: {
        color: T.colors.primary,
        fontSize: 15,
        ...FONTS.medium,
    },
});

export default InfoModal;
