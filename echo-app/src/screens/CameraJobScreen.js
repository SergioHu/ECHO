import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Vibration, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import { EchoModal } from '../components/EchoModal';
import PremiumRadar from '../components/PremiumRadar';
import { useToast } from '../context/ToastContext';
import { addTakenPhoto, updateJobStatus } from '../store/jobStore';
import { useSubmitPhoto } from '../hooks';

// --- HELPER FUNCTIONS ---

// Converts degrees to radians
const toRad = (deg) => (deg * Math.PI) / 180;

// Converts radians to degrees
const toDeg = (rad) => (rad * 180) / Math.PI;

/**
 * Calculates the bearing (azimuth) from point A to point B.
 * Returns a value between 0 and 360.
 */
const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δλ = toRad(lon2 - lon1);

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    const bearing = (toDeg(θ) + 360) % 360;
    return bearing;
};

/**
 * Calculates the distance between two points using the Haversine formula.
 * Returns distance in meters.
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
};

// Mock Target Location (Fallback)
const FALLBACK_TARGET = {
    latitude: 40.7580,
    longitude: -73.9855,
};

const CameraJobScreen = ({ navigation, route }) => {
    // Get job from route params or use fallback
    const jobParam = route.params?.job;

    // Sanitize job data to ensure all values are safe types
    const job = jobParam ? {
        id: jobParam.id,
        supabaseId: jobParam.supabaseId || null, // UUID from Supabase
        price: parseFloat(jobParam.price) || 0.40,
        lat: parseFloat(jobParam.lat) || FALLBACK_TARGET.latitude,
        lng: parseFloat(jobParam.lng) || FALLBACK_TARGET.longitude,
    } : {
        id: 8291,
        supabaseId: null,
        price: 0.40,
        lat: FALLBACK_TARGET.latitude,
        lng: FALLBACK_TARGET.longitude
    };

    // Supabase hook for photo submission
    const { submitPhoto, loading: submittingPhoto, progress: uploadProgress } = useSubmitPhoto();

    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [locationPermission, setLocationPermission] = useState(null);

    const { showToast } = useToast();

    // State for GPS and Orientation
    const [userLocation, setUserLocation] = useState(null);
    const userLocationRef = useRef(null); // Keep location in ref to survive re-renders
    const [heading, setHeading] = useState(0);
    const headingAnim = useRef(new Animated.Value(0)).current;
    const [bearing, setBearing] = useState(0);
    const [isAligned, setIsAligned] = useState(false);
    const [distanceToJob, setDistanceToJob] = useState(null);
    const [maxDistance, setMaxDistance] = useState(null); // Initial distance for progress bar
    const [hasVibrated, setHasVibrated] = useState(false); // Track if we've vibrated for in-range

    const cameraRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);

    // Premium pulse animation for shutter button
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // 1. Request Permissions & Start Watchers
    useEffect(() => {
        let locationSubscription = null;
        let headingSubscription = null;

        (async () => {
            // Permissions
            const locStatus = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(locStatus);

            if (locStatus.status === 'granted') {
                // Get initial position immediately
                try {
                    const initialLoc = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.High,
                    });
                    const locData = {
                        latitude: parseFloat(initialLoc.coords.latitude),
                        longitude: parseFloat(initialLoc.coords.longitude),
                    };
                    setUserLocation(locData);
                    userLocationRef.current = locData; // Store in ref
                    console.log('📍 Initial location set:', locData.latitude, locData.longitude);
                } catch (e) {
                    console.log('⚠️ Could not get initial location:', e);
                }

                // A. Watch Position for updates
                locationSubscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Highest,
                        distanceInterval: 1, // Update every 1 meter
                        timeInterval: 500,   // Update every 500ms
                    },
                    (loc) => {
                        const locData = {
                            latitude: parseFloat(loc.coords.latitude),
                            longitude: parseFloat(loc.coords.longitude),
                        };
                        setUserLocation(locData);
                        userLocationRef.current = locData; // Store in ref
                    }
                );

                // B. Watch Heading
                headingSubscription = await Location.watchHeadingAsync((data) => {
                    // Use trueHeading if available (>= 0), otherwise fallback to magHeading
                    const newHeading = parseFloat((data.trueHeading >= 0) ? data.trueHeading : data.magHeading) || 0;
                    setHeading(newHeading);

                    // Smooth animation for heading
                    Animated.timing(headingAnim, {
                        toValue: newHeading,
                        duration: 150,
                        useNativeDriver: true,
                    }).start();
                });
            }
        })();

        return () => {
            if (locationSubscription) locationSubscription.remove();
            if (headingSubscription) headingSubscription.remove();
        };
    }, []);

    // 2. Calculate Bearing & Alignment whenever location or heading changes
    useEffect(() => {
        if (userLocation && job.lat && job.lng) {
            try {
                // Calculate bearing from User -> Target
                const b = calculateBearing(
                    parseFloat(userLocation.latitude),
                    parseFloat(userLocation.longitude),
                    parseFloat(job.lat),
                    parseFloat(job.lng)
                );
                setBearing(b);

                // Calculate distance to job
                const dist = calculateDistance(
                    parseFloat(userLocation.latitude),
                    parseFloat(userLocation.longitude),
                    parseFloat(job.lat),
                    parseFloat(job.lng)
                );
                setDistanceToJob(dist);

                // Set initial max distance (only once)
                if (maxDistance === null) {
                    setMaxDistance(dist);
                }

                // Calculate Alignment
                // Handle wrap-around (e.g. 355 vs 5 degrees)
                let diff = Math.abs(heading - b);
                if (diff > 180) diff = 360 - diff;

                const aligned = diff < 30; // 30 degrees tolerance
                setIsAligned(aligned);
            } catch (error) {
                console.error('Error calculating bearing/distance:', error);
            }
        }
    }, [userLocation, job.lat, job.lng, heading]);

    // 3. Vibration feedback when entering range
    useEffect(() => {
        if (distanceToJob !== null) {
            // Vibrate when entering 5m range (once)
            if (distanceToJob <= 5 && !hasVibrated) {
                Vibration.vibrate(200);
                setHasVibrated(true);
            }

            // Vibrate when very close (≤2m) with pattern
            if (distanceToJob <= 2) {
                Vibration.vibrate([0, 100, 100, 100]);
            }

            // Reset vibration flag if user moves away
            if (distanceToJob > 5 && hasVibrated) {
                setHasVibrated(false);
            }
        }
    }, [distanceToJob]);

    // 4. Premium pulse animation when aligned (subtle)
    useEffect(() => {
        if (isAligned) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.03,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isAligned]);

    // 3. Handle Permissions UI
    if (!cameraPermission || !locationPermission) {
        return <View style={styles.container} />;
    }

    if (!cameraPermission.granted || locationPermission.status !== 'granted') {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>Permission needed.</Text>
                <TouchableOpacity onPress={requestCameraPermission} style={styles.permissionButton}>
                    <Text style={styles.permissionText}>Open Settings</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const takePicture = async () => {
        // No distance check - user already passed the check when accepting the job
        if (cameraRef.current && !isProcessing) {
            setIsProcessing(true);
            try {
                // Compress photo for Supabase upload (max ~2MB)
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.5,  // 50% quality for smaller file size
                    skipProcessing: false,
                });

                // Get fresh location - don't rely on state which may be stale
                let currentLocation = userLocation || userLocationRef.current;

                // If no location available, try to get it now
                if (!currentLocation) {
                    console.log('📍 No location in state, getting fresh location...');
                    try {
                        const freshLoc = await Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.High,
                        });
                        currentLocation = {
                            latitude: freshLoc.coords.latitude,
                            longitude: freshLoc.coords.longitude,
                        };
                        console.log('📍 Got fresh location:', currentLocation);
                    } catch (locErr) {
                        console.error('❌ Failed to get location:', locErr);
                    }
                }

                // If it's a Supabase job, submit to backend
                console.log('📷 About to submit photo:', {
                    supabaseId: job.supabaseId,
                    userLocation: currentLocation,
                    hasSupabaseId: !!job.supabaseId,
                    hasUserLocation: !!currentLocation
                });

                if (job.supabaseId && currentLocation) {
                    console.log('📷 Submitting to Supabase...');
                    const { data, error } = await submitPhoto({
                        requestId: job.supabaseId,
                        photoUri: photo.uri,
                        latitude: currentLocation.latitude,
                        longitude: currentLocation.longitude,
                    });

                    if (error) {
                        console.error('❌ Supabase photo submission failed:', error);
                        showToast('Upload failed - saved locally', 'error');
                        // Continue with local save as fallback
                    } else {
                        console.log('✅ Photo submitted to Supabase:', data);
                        showToast('Photo Submitted!', 'success');
                    }
                } else {
                    console.log('⚠️ Skipping Supabase - missing supabaseId or userLocation');
                    showToast('Location unavailable - try again', 'error');
                }

                // Always save photo to local store for immediate viewing
                addTakenPhoto({
                    photoUri: photo.uri,
                    jobId: job.id,
                    supabaseId: job.supabaseId,
                    price: job.price,
                    locationTaken: currentLocation,
                    locationRequested: { lat: job.lat, lng: job.lng },
                    distance: distanceToJob,
                });

                // Update job status if it's a test job
                if (job.isTestJob) {
                    updateJobStatus(job.id, 'completed');
                }

                navigation.navigate('AgentPreview', { photoUri: photo.uri });
                setIsProcessing(false);
            } catch (error) {
                console.error(error);
                setShowErrorModal(true);
                setIsProcessing(false);
            }
        }
    };

    return (
        <View style={styles.container}>
            {/* Camera View */}
            <CameraView style={styles.camera} ref={cameraRef} facing="back" />

            {/* Close Button - Top Left */}
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                <View style={styles.closeButtonInner}>
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                </View>
            </TouchableOpacity>

            {/* Radar - Top Left (below close button) */}
            <PremiumRadar
                relativeBearing={((bearing - heading + 360) % 360) || 0}
                distance={distanceToJob || 0}
                isAligned={isAligned}
                jobLat={parseFloat(job.lat) || 0}
                jobLng={parseFloat(job.lng) || 0}
            />


            {/* Job details - premium layout */}
            <View style={styles.jobContainer}>
                <Text style={styles.jobId}>JOB #{job.id}</Text>
                <Text style={styles.jobPrice}>€{parseFloat(job.price).toFixed(2)}</Text>
            </View>

            {/* Shutter Button - premium with pulse animation */}
            <Animated.View style={[
                styles.shutterButton,
                isAligned && styles.shutterAligned,
                { transform: [{ scale: pulseAnim }] }
            ]}>
                <TouchableOpacity
                    onPress={takePicture}
                    disabled={isProcessing}
                    activeOpacity={0.8}
                    style={[
                        styles.shutterTouchable,
                        isAligned && { borderColor: '#00E5FF' }
                    ]}
                >
                    {isProcessing ? (
                        <ActivityIndicator color={COLORS.primary} size="large" />
                    ) : (
                        <View style={styles.shutterInner} />
                    )}
                </TouchableOpacity>
            </Animated.View>

            {/* Error Modal */}
            <EchoModal
                visible={showErrorModal}
                type="error"
                title="ERROR"
                message="Failed to take photo. Please try again."
                primaryActionText="OK"
                onPrimaryAction={() => setShowErrorModal(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    camera: {
        flex: 1,
    },
    message: {
        textAlign: 'center',
        color: 'white',
        marginBottom: 20,
    },
    permissionButton: {
        backgroundColor: COLORS.primary,
        padding: 10,
        borderRadius: 8,
        alignSelf: 'center',
    },
    permissionText: {
        color: 'black',
        fontWeight: 'bold',
    },

    // --- TOP LEFT: CLOSE BUTTON ---
    closeButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    closeButtonInner: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: 18,
    },

    // --- JOB DETAILS (premium layout) ---
    jobContainer: {
        position: 'absolute',
        bottom: 130,
        alignSelf: 'center',
        alignItems: 'center',
    },
    jobId: {
        fontSize: 11,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: 1,
        marginBottom: 4,
    },
    jobPrice: {
        fontSize: 20,
        fontWeight: '700',
        color: '#00E5FF',
        textShadowColor: 'rgba(0, 229, 255, 0.3)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 6,
    },

    // --- SHUTTER BUTTON (premium with animations) ---
    shutterButton: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        width: 72,
        height: 72,
        borderRadius: 36,
    },
    shutterTouchable: {
        width: '100%',
        height: '100%',
        borderRadius: 36,
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shutterAligned: {
        borderColor: '#00E5FF',
        shadowColor: '#00E5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
    },
    shutterInner: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
});

export default CameraJobScreen;
