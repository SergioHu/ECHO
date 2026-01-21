import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { PhotoTimerProvider } from './src/context/PhotoTimerContext';
import { ToastProvider } from './src/context/ToastContext';
import { AuthProvider } from './src/context/AuthContext';
import PhotoTimerMonitor from './src/components/PhotoTimerMonitor';
import { supabaseConfig } from './src/lib/supabase';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('App Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>Something went wrong</Text>
                    <Text style={styles.errorMessage}>
                        {this.state.error?.message || 'Unknown error'}
                    </Text>
                    <Text style={styles.configStatus}>
                        Supabase configured: {supabaseConfig.isConfigured ? 'Yes' : 'No'}
                    </Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => this.setState({ hasError: false, error: null })}
                    >
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
        padding: 20,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ff6b6b',
        marginBottom: 16,
    },
    errorMessage: {
        fontSize: 14,
        color: '#aaa',
        textAlign: 'center',
        marginBottom: 12,
    },
    configStatus: {
        fontSize: 12,
        color: '#666',
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: '#4ecdc4',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontWeight: '600',
    },
});

export default function App() {
    return (
        <ErrorBoundary>
            <SafeAreaProvider>
                <AuthProvider>
                    <ToastProvider>
                        <PhotoTimerProvider>
                            <StatusBar style="light" />
                            <AppNavigator />
                            <PhotoTimerMonitor />
                        </PhotoTimerProvider>
                    </ToastProvider>
                </AuthProvider>
            </SafeAreaProvider>
        </ErrorBoundary>
    );
}
