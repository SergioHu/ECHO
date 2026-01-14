import React, { useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    Dimensions,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';

// New unified onboarding components
import OnboardingSlideLayout from '../components/onboarding/OnboardingSlideLayout';
import OnboardingControls from '../components/onboarding/OnboardingControls';

const { width } = Dimensions.get('window');

// ============================================
// SLIDE DATA - ONLY DATA, NO STYLING
// ============================================
// Each slide provides ONLY:
// - iconName
// - title
// - subtitle OR bullets (not both)
// - flags for special handling

const SLIDES = [
    {
        id: '1',
        iconName: 'target',
        title: 'Welcome to ECHO',
        subtitle: 'Earn money by taking photos for people who need them.\n\nIt\'s simple, fast, and fun.',
    },
    {
        id: '2',
        iconName: 'camera',
        title: 'Take Photos, Earn Money',
        bullets: [
            'See photo requests on the map',
            'Accept jobs within 10m',
            'Point your camera at the target',
            'Snap the photo & get paid!',
        ],
    },
    {
        id: '3',
        iconName: 'map',
        title: 'Request Photos Anywhere',
        bullets: [
            'Drop a pin on the map',
            'Offer a reward to get it done faster',
            'Wait for a photographer',
            'Review and approve the photo',
        ],
    },
    {
        id: '4',
        iconName: 'legal',
        title: 'Terms & Legal Rights',
        bullets: [
            'Respect others\' privacy and rights',
            'Do NOT photograph people without consent',
            'Do NOT photograph private property',
            'Follow local laws and regulations',
            'You agree to our Terms of Service',
        ],
        isTerms: true,
    },
    {
        id: '5',
        iconName: 'warning',
        title: 'Important Rules',
        bullets: [
            'You must be within 10m to accept a job',
            'You have 3 minutes to review photos',
            'No screenshots allowed',
            'Violations may result in account ban',
        ],
    },
    {
        id: '6',
        iconName: 'location',
        title: 'We Need Some Permissions',
        bullets: [
            'Location — To show jobs near you',
            'Camera — To take photos for jobs',
            'Notifications — To alert you of new jobs',
        ],
        isPermissions: true,
    },
    {
        id: '7',
        iconName: 'rocket',
        title: "You're All Set!",
        subtitle: 'Start exploring the map and find your first photo job.\n\nGood luck and have fun!',
    },
];

const PREMIUM = {
    background: '#000000',
};

const OnboardingScreen = ({ navigation }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef(null);

    const handleNext = async () => {
        const currentSlide = SLIDES[currentIndex];

        // Handle permissions slide
        if (currentSlide.isPermissions) {
            await requestPermissions();
        }

        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true,
            });
            setCurrentIndex(currentIndex + 1);
        } else {
            // Last slide - complete onboarding
            await completeOnboarding();
        }
    };

    const requestPermissions = async () => {
        try {
            const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
            if (locationStatus !== 'granted') {
                Alert.alert(
                    'Location Required',
                    'ECHO needs location access to show nearby jobs.',
                    [{ text: 'OK' }]
                );
            }

            const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
            if (cameraStatus !== 'granted') {
                Alert.alert(
                    'Camera Required',
                    'ECHO needs camera access to take photos for jobs.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            // Silent error handling
        }
    };

    const completeOnboarding = () => {
        navigation.replace('Auth');
    };

    const getButtonText = () => {
        if (currentIndex === 0) return 'GET STARTED';
        if (currentIndex === SLIDES.length - 1) return 'START EXPLORING';
        if (SLIDES[currentIndex].isTerms) return 'I AGREE';
        if (SLIDES[currentIndex].isPermissions) return 'ALLOW PERMISSIONS';
        return 'NEXT';
    };

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems[0]) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const renderSlide = ({ item }) => (
        <OnboardingSlideLayout
            iconName={item.iconName}
            title={item.title}
            subtitle={item.subtitle}
            bullets={item.bullets}
        />
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Slides */}
                <FlatList
                    ref={flatListRef}
                    data={SLIDES}
                    renderItem={renderSlide}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
                    scrollEnabled={true}
                    style={styles.flatList}
                />

                {/* Fixed Controls - Never move between slides */}
                <OnboardingControls
                    totalSlides={SLIDES.length}
                    currentIndex={currentIndex}
                    buttonLabel={getButtonText()}
                    onButtonPress={handleNext}
                    onSkipPress={completeOnboarding}
                    showSkip={currentIndex < SLIDES.length - 1}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: PREMIUM.background,
    },
    container: {
        flex: 1,
        backgroundColor: PREMIUM.background,
    },
    flatList: {
        flex: 1,
    },
});

export default OnboardingScreen;
