import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Vibration, Modal, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
// Note: Mock REQUESTS removed - using only Supabase data
import { COLORS, FONTS } from '../constants/theme';
import { DARK_MAP_STYLE } from '../constants/mapStyle';
import EchoButton from '../components/EchoButton';
import CreateRequestSheet from '../components/CreateRequestSheet';
import JobOfferSheet from '../components/JobOfferSheet';
import { useToast } from '../context/ToastContext';
import MapCrosshair from '../components/MapCrosshair';
import { getTestJobs, subscribe, addTestJob } from '../store/jobStore';
import { useNearbyRequests, useLockRequest } from '../hooks';

const RadarScreen = ({ navigation }) => {
    const { showToast } = useToast();
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [currentRegion, setCurrentRegion] = useState(null);
    const [showCreateRequest, setShowCreateRequest] = useState(false);
    const [selectedCoordinates, setSelectedCoordinates] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [locationName, setLocationName] = useState("Locating...");
    const [isMapMoving, setIsMapMoving] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [initialRenderComplete, setInitialRenderComplete] = useState(false);
    const [testJobs, setTestJobs] = useState([]);
    const [isHybridMap, setIsHybridMap] = useState(false); // false = dark, true = hybrid (satellite)
    const [useSupabaseData, setUseSupabaseData] = useState(true); // Always use Supabase data

    const mapRef = useRef(null);
    const isMarkerPress = useRef(false);

    // Supabase hook - fetches nearby requests from database
    const {
        requests: supabaseRequests,
        loading: supabaseLoading,
        error: supabaseError,
        refetch: refetchSupabaseRequests,
        updateKey: supabaseUpdateKey, // Used to force marker re-renders
    } = useNearbyRequests(
        location?.coords?.latitude,
        location?.coords?.longitude,
        50000 // 50km radius for testing
    );

    // Supabase hook - lock/accept requests
    const {
        lockRequest,
        unlockRequest,
        loading: lockingRequest,
        error: lockError
    } = useLockRequest();

    // Subscribe to job store changes
    useEffect(() => {
        setTestJobs(getTestJobs());

        const unsubscribe = subscribe(() => {
            setTestJobs(getTestJobs());
        });

        return () => unsubscribe();
    }, []);

    // Auto-refresh when map screen comes into focus
    useFocusEffect(
        useCallback(() => {
            console.log('🗺️ Map focused - refreshing nearby requests...');
            refetchSupabaseRequests();
        }, [refetchSupabaseRequests])
    );

    // FIX: Desabilita tracksViewChanges após render inicial para melhor performance
    useEffect(() => {
        const timer = setTimeout(() => {
            setInitialRenderComplete(true);
        }, 500); // Reduced from 2000ms for faster load
        return () => clearTimeout(timer);
    }, []);

    // Debug: Log Supabase data when it changes
    useEffect(() => {
        if (supabaseRequests) {
            console.log('🗺️ Supabase nearby requests:', supabaseRequests.length, 'found');
            if (supabaseRequests.length > 0) {
                console.log('🗺️ First request:', JSON.stringify(supabaseRequests[0]));
            }
        }
    }, [supabaseRequests]);

    // Debug: log loading state and errors
    useEffect(() => {
        if (supabaseError) {
            console.error('❌ Supabase error in RadarScreen:', supabaseError);
        }
        console.log('🗺️ RadarScreen state - loading:', supabaseLoading, 'requests:', supabaseRequests?.length || 0, 'location:', location ? 'YES' : 'NO', 'updateKey:', supabaseUpdateKey);
    }, [supabaseLoading, supabaseError, supabaseRequests, location, supabaseUpdateKey]);

    // Debug: Log when marker data changes (for debugging real-time updates)
    useEffect(() => {
        console.log('🗺️🗺️🗺️ MARKER DATA CHANGED 🗺️🗺️🗺️');
        console.log('🗺️ supabaseRequests count:', supabaseRequests?.length || 0);
        console.log('🗺️ supabaseUpdateKey:', supabaseUpdateKey);
        console.log('🗺️ mapReady:', mapReady);
        if (supabaseRequests && supabaseRequests.length > 0) {
            supabaseRequests.forEach((req, i) => {
                console.log(`  📍 [${i}] id=${req.id?.slice(0, 8)}... lat=${req.lat?.toFixed(5)} lng=${req.lng?.toFixed(5)} isOwn=${req.isOwn}`);
            });
        }
    }, [supabaseRequests, supabaseUpdateKey, mapReady]);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            // Try to get last known position first (instant)
            let quickLocation = await Location.getLastKnownPositionAsync({});
            if (quickLocation) {
                setLocation(quickLocation);
                const quickRegion = {
                    latitude: quickLocation.coords.latitude,
                    longitude: quickLocation.coords.longitude,
                    latitudeDelta: 0.001,
                    longitudeDelta: 0.001,
                };
                setCurrentRegion(quickRegion);
                fetchAddress(quickRegion.latitude, quickRegion.longitude);
            }

            // Then get accurate position (may take longer)
            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced, // Faster than High/Highest
            });
            setLocation(location);

            const initialRegion = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.001,
                longitudeDelta: 0.001,
            };
            setCurrentRegion(initialRegion);
            fetchAddress(initialRegion.latitude, initialRegion.longitude);
        })();
    }, []);



    const fetchAddress = async (latitude, longitude) => {
        try {
            const result = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (result && result.length > 0) {
                const { name, street, city } = result[0];
                let displayAddress = name;
                if (street && street !== name) {
                    displayAddress = `${name}, ${street}`;
                } else if (!name && street) {
                    displayAddress = street;
                } else if (!name && !street && city) {
                    displayAddress = city;
                }
                setLocationName(displayAddress || "Unknown Location");
            } else {
                setLocationName("Unknown Location");
            }
        } catch (error) {
            console.log("Error fetching address:", error);
            setLocationName("Location Unavailable");
        }
    };

    const handleRegionChangeComplete = (region) => {
        setCurrentRegion(region);
        setIsMapMoving(false);
        fetchAddress(region.latitude, region.longitude);
    };

    const handleOpenCreateRequest = () => {
        if (currentRegion) {
            setSelectedCoordinates({
                latitude: currentRegion.latitude,
                longitude: currentRegion.longitude
            });
            setShowCreateRequest(true);
        }
    };

    const handleCloseCreateRequest = () => {
        setShowCreateRequest(false);
    };

    const handleConfirmRequest = (payload) => {
        // Check if Supabase creation was successful
        if (payload.supabaseId) {
            console.log('✅ Request created in Supabase:', payload.supabaseId);
            showToast('Request Created!', 'success');
            setShowCreateRequest(false);

            // FALLBACK: If real-time subscription doesn't work, force refetch after 1 second
            setTimeout(() => {
                console.log('🔄 Fallback refetch triggered');
                refetchSupabaseRequests();
            }, 1000);

            return;
        }

        // If Supabase failed, show error
        if (payload.supabaseError) {
            console.error('Supabase error:', payload.errorMessage);
            showToast('Failed to create request', 'error');
            // Fallback to local job for demo purposes
        }

        // Fallback: Create a job in the local store so it appears on the map
        const newJob = addTestJob({
            lat: payload.latitude,
            lng: payload.longitude,
            price: 0.50, // Default price for requests
            description: payload.description || 'Photo requested',
            urgent: false,
            isTestJob: true,
        });

        // Force immediate update of test jobs
        setTestJobs(getTestJobs());

        showToast('Job Requested (Local)', 'success');
        setShowCreateRequest(false);
    };

    const handleMarkerPress = (job) => {
        try {
            isMarkerPress.current = true;

            // Ensure job has all required properties with safe types
            const safeJob = {
                id: job.id || 0,
                lat: parseFloat(job.lat) || 0,
                lng: parseFloat(job.lng) || 0,
                price: parseFloat(job.price) || 0,
                title: job.title || '',
                description: job.description || '',
                urgent: !!job.urgent,
                // Supabase-specific fields
                supabaseId: job.supabaseId || null, // UUID from Supabase
                creatorId: job.creatorId || null,
                status: job.status || 'open',
            };

            setSelectedJob(safeJob);

            setTimeout(() => {
                isMarkerPress.current = false;
            }, 1000);
        } catch (error) {
            console.error('Error in handleMarkerPress:', error);
            isMarkerPress.current = false;
        }
    };

    const handleAcceptJob = async () => {
        if (!location || !selectedJob) return;

        const distanceToJob = calculateDistance(
            parseFloat(location.coords.latitude),
            parseFloat(location.coords.longitude),
            parseFloat(selectedJob.lat),
            parseFloat(selectedJob.lng)
        );

        const canAcceptJob = distanceToJob <= 10;

        if (!canAcceptJob) {
            showToast('Move within 10 meters to accept this job', 'error');
            return;
        }

        // Ensure all job properties are type-safe and defined
        const jobToPass = {
            id: selectedJob.id || 0,
            lat: parseFloat(selectedJob.lat) || 0,
            lng: parseFloat(selectedJob.lng) || 0,
            price: parseFloat(selectedJob.price) || 0,
            description: selectedJob.description || '',
            title: selectedJob.title || '',
            urgent: !!selectedJob.urgent,
            supabaseId: selectedJob.supabaseId, // Pass Supabase ID if it's a real request
        };

        // If it's a Supabase request (has UUID), try to lock it
        if (selectedJob.supabaseId) {
            const { success, error } = await lockRequest(selectedJob.supabaseId);

            if (!success) {
                showToast(error?.message || 'Job no longer available', 'error');
                setSelectedJob(null);
                refetchSupabaseRequests(); // Refresh to show updated state
                return;
            }
        }

        showToast('Job Accepted!', 'success');
        setSelectedJob(null);
        navigation.navigate('CameraJob', { job: jobToPass });
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
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

    const handleMapPress = () => {
        if (isMarkerPress.current) return;
        setSelectedJob(null);
    };

    const centerOnUser = async () => {
        try {
            Vibration.vibrate(50);

            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            // Update location state - single source of truth
            setLocation(currentLocation);

            if (mapRef.current) {
                // Use animateToRegion for reliable centering with max zoom
                mapRef.current.animateToRegion({
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                    latitudeDelta: 0.00015,
                    longitudeDelta: 0.00015,
                }, 450);
            }
        } catch (error) {
            console.log("Error centering:", error);
        }
    };

    return (
        <View style={styles.container}>
            {/* STATIC MAP LAYER */}
            <View style={styles.mapContainer}>
                {currentRegion ? (
                    <MapView
                        key={`mapview-${supabaseUpdateKey}`}
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        style={styles.map}
                        customMapStyle={isHybridMap ? undefined : DARK_MAP_STYLE}
                        mapType={isHybridMap ? 'hybrid' : 'standard'}
                        initialRegion={currentRegion}
                        onRegionChange={() => setIsMapMoving(true)}
                        onRegionChangeComplete={handleRegionChangeComplete}
                        onPress={handleMapPress}
                        showsUserLocation={false}
                        showsMyLocationButton={false}
                        showsCompass={false}
                        toolbarEnabled={false}
                        loadingEnabled={true}
                        loadingBackgroundColor={COLORS.background}
                        removeClippedSubviews={false}
                        moveOnMarkerPress={false}
                        onMapReady={() => setMapReady(true)}
                        scrollEnabled={!selectedJob}
                        zoomEnabled={!selectedJob}
                        rotateEnabled={false}
                        pitchEnabled={false}
                    >
                        {/* USER LOCATION MARKER */}
                        {location && location.coords && (
                            <Marker
                                coordinate={{
                                    latitude: location.coords.latitude,
                                    longitude: location.coords.longitude,
                                }}
                                anchor={{ x: 0.5, y: 0.5 }}
                                flat={true}
                                tracksViewChanges={true}
                                zIndex={1000}
                            >
                                <View style={styles.userLocationMarker}>
                                    <View style={styles.userLocationDot} />
                                </View>
                            </Marker>
                        )}

                        {/* 10M RADIUS CIRCLE - offset compensated */}
                        {location && location.coords && (
                            <Circle
                                center={{
                                    latitude: location.coords.latitude + 0.000008,
                                    longitude: location.coords.longitude - 0.000013,
                                }}
                                radius={10}
                                strokeColor="rgba(0, 229, 255, 0.6)"
                                strokeWidth={2}
                                fillColor="rgba(0, 229, 255, 0.05)"
                            />
                        )}

                        {/* Note: Mock requests removed - using only Supabase data */}

                        {/* NEARBY DYNAMIC REQUESTS FROM SUPABASE */}
                        {/* updateKey forces re-render when real-time subscription updates data */}
                        {supabaseRequests && supabaseRequests.length > 0 && supabaseRequests.map((req) => {
                            const lat = parseFloat(req.lat);
                            const lng = parseFloat(req.lng);
                            // Skip invalid coordinates
                            if (isNaN(lat) || isNaN(lng)) {
                                console.warn('⚠️ Invalid coordinates for request:', req.id, req.lat, req.lng);
                                return null;
                            }
                            console.log('📍 Rendering marker at:', lat, lng, 'price:', req.price, 'updateKey:', supabaseUpdateKey);
                            return (
                                <Marker
                                    key={`nearby-${req.id}-${supabaseUpdateKey}`}
                                    coordinate={{ latitude: lat, longitude: lng }}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleMarkerPress(req);
                                    }}
                                    anchor={{ x: 0.5, y: 0.5 }}
                                    tracksViewChanges={true}
                                    zIndex={String(selectedJob?.id) === String(req.id) ? 999 : (req.isOwn ? 150 : 100)}
                                >
                                    <View style={styles.markerWrapper}>
                                        <View style={[
                                            styles.markerContainer,
                                            req.isOwn
                                                ? styles.markerOwn
                                                : (req.urgent ? styles.markerUrgent : styles.markerNormal)
                                        ]}>
                                            <Text style={styles.markerText}>€{parseFloat(req.price).toFixed(2)}</Text>
                                        </View>
                                    </View>
                                </Marker>
                            );
                        })}

                        {/* ADMIN TEST JOBS FROM STORE - Same style as regular jobs */}
                        {testJobs && testJobs.map((job) => (
                            <Marker
                                key={`test-${job.id}`}
                                coordinate={{ latitude: parseFloat(job.lat), longitude: parseFloat(job.lng) }}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleMarkerPress(job);
                                }}
                                anchor={{ x: 0.5, y: 0.5 }}
                                tracksViewChanges={!initialRenderComplete}
                                zIndex={String(selectedJob?.id) === String(job.id) ? 999 : 100}
                            >
                                <View style={styles.markerWrapper}>
                                    <View style={[styles.markerContainer, styles.markerTestJob]}>
                                        <Text style={styles.markerText}>€{parseFloat(job.price).toFixed(2)}</Text>
                                    </View>
                                </View>
                            </Marker>
                        ))}
                    </MapView>
                ) : (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Loading map...</Text>
                    </View>
                )}
            </View>

            {/* CENTER CROSSHAIR */}
            <View style={styles.centerMarkerContainer} pointerEvents="none">
                <MapCrosshair />
            </View>

            {/* ADDRESS INFO PILL */}
            <View style={styles.addressPillContainer} pointerEvents="none">
                <View style={styles.addressPill}>
                    {isMapMoving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.addressText} numberOfLines={1}>
                            {locationName}
                        </Text>
                    )}
                </View>
            </View>

            {/* MAP STYLE TOGGLE - Top Left (dark ↔ satellite/hybrid) */}
            <TouchableOpacity
                style={styles.mapStyleButton}
                onPress={() => {
                    Vibration.vibrate(50);
                    setIsHybridMap(prev => !prev);
                }}
                activeOpacity={0.7}
            >
                <Ionicons
                    name={isHybridMap ? 'earth' : 'map-outline'}
                    size={24}
                    color={COLORS.primary}
                />
            </TouchableOpacity>

            {/* CUSTOM RE-CENTER BUTTON - Top Right */}
            <TouchableOpacity
                style={styles.recenterButton}
                onPress={centerOnUser}
            >
                <MaterialIcons name="my-location" size={24} color={COLORS.primary} />
            </TouchableOpacity>

            {/* FAB */}
            {!selectedJob && currentRegion && (
                <View style={styles.fabContainer}>
                    <EchoButton
                        title="REQUEST PHOTO (+)"
                        onPress={handleOpenCreateRequest}
                        style={styles.fab}
                    />
                </View>
            )}

            {/* CREATE REQUEST BOTTOM SHEET */}
            <Modal
                visible={showCreateRequest}
                transparent={true}
                animationType="slide"
                presentationStyle="overFullScreen"
                statusBarTranslucent
                onRequestClose={handleCloseCreateRequest}
            >
                <CreateRequestSheet
                    visible={showCreateRequest}
                    coordinates={selectedCoordinates}
                    userLocation={location?.coords}
                    onClose={handleCloseCreateRequest}
                    onConfirm={handleConfirmRequest}
                />
            </Modal>

            {/* JOB OFFER BOTTOM SHEET */}
            {selectedJob && location && (() => {
                const distance = calculateDistance(
                    parseFloat(location.coords.latitude),
                    parseFloat(location.coords.longitude),
                    parseFloat(selectedJob.lat),
                    parseFloat(selectedJob.lng)
                );
                const safeDistance = Math.round(parseFloat(distance) || 0);
                return (
                    <View style={styles.jobOfferContainer}>
                        <JobOfferSheet
                            job={selectedJob}
                            distance={safeDistance}
                            canAccept={safeDistance <= 10}
                            onClose={() => setSelectedJob(null)}
                            onAccept={handleAcceptJob}
                        />
                    </View>
                );
            })()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    mapContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    map: {
        flex: 1,
    },
    centerMarkerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        // Fine-tune: shift crosshair to match user dot position
        marginTop: -20,
        marginLeft: -20,
    },
    markerWrapper: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'visible',
    },
    markerContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#000000',
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        // FIX GHOSTING - Remover todas as sombras (Android Maps SDK não suporta sombras em markers)
        elevation: 0,
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
    },
    markerNormal: {
        borderColor: COLORS.secondary, // Green for available requests from others
    },
    markerUrgent: {
        borderColor: COLORS.error, // Red for urgent
    },
    markerOwn: {
        borderColor: '#4A90D9', // Blue for own requests
    },
    markerTestJob: {
        borderColor: COLORS.primary, // Yellow for test jobs
    },
    markerText: {
        color: '#FFFFFF',
        fontSize: 11,
        ...FONTS.bold,
    },
    userLocationMarker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(66, 133, 244, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(66, 133, 244, 0.5)',
    },
    userLocationDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#4285F4',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    mapStyleButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.primary,
        zIndex: 100,
    },
    recenterButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    fabContainer: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        width: 200,
        zIndex: 50,
    },
    fab: {
        width: '100%',
        backgroundColor: COLORS.primary,
        elevation: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        borderRadius: 30,
    },
    addressPillContainer: {
        position: 'absolute',
        bottom: 110,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 40,
    },
    addressPill: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: '80%',
    },
    addressText: {
        color: '#FFFFFF',
        fontSize: 14,
        ...FONTS.bold,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        gap: 24,
    },
    loadingText: {
        marginTop: 20,
        color: COLORS.textPrimary,
        fontSize: 16,
        ...FONTS.medium,
    },
    jobOfferContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
    },
});

export default RadarScreen;
