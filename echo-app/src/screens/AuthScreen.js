/**
 * AuthScreen - Login/Signup Screen
 * 
 * Handles user authentication with email/password using Supabase Auth.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING } from '../constants/theme';

const AuthScreen = ({ navigation }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [localLoading, setLocalLoading] = useState(false);

    const { signIn, signUp, loading } = useAuth();

    const handleSubmit = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (!isLogin && password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLocalLoading(true);

        try {
            if (isLogin) {
                const { error } = await signIn(email, password);
                if (error) {
                    Alert.alert('Login Error', error.message);
                } else {
                    navigation.replace('MainTabs');
                }
            } else {
                const { error, data } = await signUp(email, password);
                if (error) {
                    Alert.alert('Sign Up Error', error.message);
                } else if (data?.user?.identities?.length === 0) {
                    Alert.alert('Email already registered', 'This email is already registered. Try logging in.');
                } else {
                    Alert.alert(
                        'Sign Up Successful',
                        'Please check your email to confirm your account.',
                        [{ text: 'OK', onPress: () => setIsLogin(true) }]
                    );
                }
            }
        } catch (err) {
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setLocalLoading(false);
        }
    };

    const isLoading = loading || localLoading;

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoBorder}>
                        <Text style={styles.logoText}>ECHO</Text>
                    </View>
                    <Text style={styles.tagline}>
                        {isLogin ? 'Welcome back' : 'Create your account'}
                    </Text>
                </View>

                {/* Form */}
                <View style={styles.formContainer} importantForAutofill="noExcludeDescendants">
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor={COLORS.textSecondary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        textContentType="emailAddress"
                        underlineColorAndroid="transparent"
                        editable={!isLoading}
                    />

                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="Password"
                            placeholderTextColor={COLORS.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            textContentType={isLogin ? "password" : "newPassword"}
                            underlineColorAndroid="transparent"
                            editable={!isLoading}
                        />
                        <TouchableOpacity
                            style={styles.eyeButton}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Ionicons
                                name={showPassword ? 'eye-off' : 'eye'}
                                size={22}
                                color={COLORS.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>

                    {!isLogin && (
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Confirm Password"
                                placeholderTextColor={COLORS.textSecondary}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                                autoComplete="new-password"
                                textContentType="newPassword"
                                underlineColorAndroid="transparent"
                                editable={!isLoading}
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                <Ionicons
                                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                                    size={22}
                                    color={COLORS.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={COLORS.background} />
                        ) : (
                            <Text style={styles.buttonText}>
                                {isLogin ? 'Sign In' : 'Create Account'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.switchButton}
                        onPress={() => setIsLogin(!isLogin)}
                        disabled={isLoading}
                    >
                        <Text style={styles.switchText}>
                            {isLogin
                                ? "Don't have an account? Sign up"
                                : 'Already have an account? Sign in'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Skip for now (dev mode) */}
                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => navigation.replace('MainTabs')}
                >
                    <Text style={styles.skipText}>Continue without account (Demo)</Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
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
        justifyContent: 'center',
        paddingHorizontal: SPACING.l,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: SPACING.xl * 2,
    },
    logoBorder: {
        borderWidth: 2,
        borderColor: COLORS.primary,
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        borderRadius: 8,
        marginBottom: SPACING.m,
    },
    logoText: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.primary,
        letterSpacing: 8,
    },
    tagline: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    formContainer: {
        width: '100%',
    },
    input: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.m,
        fontSize: 16,
        color: COLORS.textPrimary,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.m,
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    eyeButton: {
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.m,
    },
    button: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: SPACING.m,
        alignItems: 'center',
        marginTop: SPACING.s,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.background,
    },
    switchButton: {
        alignItems: 'center',
        marginTop: SPACING.l,
    },
    switchText: {
        color: COLORS.primary,
        fontSize: 14,
    },
    skipButton: {
        alignItems: 'center',
        marginTop: SPACING.xl,
        paddingVertical: SPACING.m,
    },
    skipText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});

export default AuthScreen;
