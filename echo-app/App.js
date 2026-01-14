import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { PhotoTimerProvider } from './src/context/PhotoTimerContext';
import { ToastProvider } from './src/context/ToastContext';
import { AuthProvider } from './src/context/AuthContext';
import PhotoTimerMonitor from './src/components/PhotoTimerMonitor';

export default function App() {
    return (
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
    );
}
