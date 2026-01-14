import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import RadarScreen from '../screens/RadarScreen';
import ActivityScreen from '../screens/ActivityScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CameraJobScreen from '../screens/CameraJobScreen';
import PreviewScreen from '../screens/PreviewScreen';
import AgentPreviewScreen from '../screens/AgentPreviewScreen';
import PhotoViewerScreen from '../screens/PhotoViewerScreen';
import DeliveredPhotoScreen from '../screens/DeliveredPhotoScreen';
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';
import AdminDashboard from '../screens/admin/AdminDashboard';
import CreateTestJob from '../screens/admin/CreateTestJob';
import PhotoReviewer from '../screens/admin/PhotoReviewer';
import ManageUsers from '../screens/admin/ManageUsers';
import DisputesList from '../screens/admin/DisputesList';
import DisputeReview from '../screens/admin/DisputeReview';
import Analytics from '../screens/admin/Analytics';
import { COLORS } from '../constants/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const MainTabs = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: COLORS.surface,
                    borderTopColor: COLORS.border,
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'Radar') {
                        iconName = focused ? 'map' : 'map-outline';
                    } else if (route.name === 'Activity') {
                        iconName = focused ? 'list' : 'list-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Radar" component={RadarScreen} />
            <Tab.Screen name="Activity" component={ActivityScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
};

import { navigationRef } from '../utils/navigationRef';

const AppNavigator = () => {
    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {/* Initial Screens */}
                <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />

                {/* Main App */}
                <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
                <Stack.Screen name="CameraJob" component={CameraJobScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Preview" component={PreviewScreen} options={{ headerShown: false }} />
                <Stack.Screen name="AgentPreview" component={AgentPreviewScreen} options={{ headerShown: false }} />
                <Stack.Screen name="PhotoViewer" component={PhotoViewerScreen} options={{ headerShown: false }} />
                <Stack.Screen name="DeliveredPhoto" component={DeliveredPhotoScreen} options={{ headerShown: false }} />

                {/* Admin Screens */}
                <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ headerShown: false }} />
                <Stack.Screen name="CreateTestJob" component={CreateTestJob} options={{ headerShown: false }} />
                <Stack.Screen name="PhotoReviewer" component={PhotoReviewer} options={{ headerShown: false }} />
                <Stack.Screen name="ManageUsers" component={ManageUsers} options={{ headerShown: false }} />
                <Stack.Screen name="DisputesList" component={DisputesList} options={{ headerShown: false }} />
                <Stack.Screen name="DisputeReview" component={DisputeReview} options={{ headerShown: false }} />
                <Stack.Screen name="Analytics" component={Analytics} options={{ headerShown: false }} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
