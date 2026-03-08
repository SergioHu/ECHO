import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Vibration, Modal } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
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
    const [testJobs, setTestJobs] = useState([]);
    const [isHybridMap, setIsHybridMap] = useState(false);

    const mapRef = useRef(null);
    const isMarkerPress = useRef(false);

    // Supabase hook — pass location coords directly, same pattern as ExpandedMapModal
    const {
        requests: supabaseRequests,
        refetch: refetchSupabaseRequests,
        silentRefetch: silentRefetchRequests,
    } = useNearbyRequests(
        location?.coords?.latitude,
        location?.coords?.longitude,
        50000 // 50km radius
    );

    // Supabase hook — lock/accept requests
    const {
        lockRequest,
        loading: lockingRequest,
        error: lockError,
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
    // Use silentRefetch to bypass coord dedup — ensures fresh data after returning
    // from CameraJobScreen (coords unchanged, but DB state may have changed)
    useFocusEffect(
        useCallback(() => {
            silentRefetchRequests();
        }, [silentRefetchRequests])
    );

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            // Use last known position first for instant map display
            let quickLocation = await Location.getLastKnownPositionAsync({});
            if (quickLocation) {
                setLocation(quickLocation);
                const quickRegion = {
                    latitude: quickLocation.coords.latitude,
                    longitude: quickLocation.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                };
                setCurrentRegion(quickRegion);
                fetchAddress(quickRegion.latitude, quickRegion.longitude);
            }

            // Then get accurate position
            let accurateLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            setLocation(accurateLocation);

            const initialRegion = {
                latitude: accurateLocation.coords.latitude,
                longitude: accurateLocation.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
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
                longitude: currentRegion.longitude,
            });
            setShowCreateRequest(true);
        }
    };

    const handleCloseCreateRequest = () => {
        setShowCreateRequest(false);
    };

    const handleConfirmRequest = (payload) => {
        if (payload.supabaseId) {
            showToast('Request Created!', 'success');
            setShowCreateRequest(false);

            // Fallback refetch in case the real-time subscription misses the insert
            setTimeout(() => {
                refetchSupabaseRequests();
            }, 1000);

            return;
        }

        if (payload.supabaseError) {
            console.error('[RadarScreen] Request creation error:', payload.errorMessage);
            showToast('Failed to create request', 'error');
        }

        // Fallback: add to local store for demo purposes
        const newJob = addTestJob({
            lat: payload.latitude,
            lng: payload.longitude,
            price: 0.50,
            description: payload.description || 'Photo requested',
            urgent: false,
            isTestJob: true,
        });

        setTestJobs(getTestJobs());
        showToast('Job Requested (Local)', 'success');
        setShowCreateRequest(false);
    };

    const handleMarkerPress = (job) => {
        try {
            isMarkerPress.current = true;

            const safeJob = {
                id: job.id || 0,
                lat: parseFloat(job.lat) || 0,
                lng: parseFloat(job.lng) || 0,
                price: parseFloat(job.price) || 0,
                title: job.title || '',
                description: job.description || '',
                urgent: !!job.urgent,
                supabaseId: job.supabaseId || null,
                creatorId: job.creatorId || null,
                status: job.status || 'open',
            };

            setSelectedJob(safeJob);

            setTimeout(() => {
                isMarkerPress.current = false;
            }, 1000);
        } catch (error) {
            console.error('[RadarScreen] Error in handleMarkerPress:', error);
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

        const jobToPass = {
            id: selectedJob.id || 0,
            lat: parseFloat(selectedJob.lat) || 0,
            lng: parseFloat(selectedJob.lng) || 0,
            price: parseFloat(selectedJob.price) || 0,
            description: selectedJob.description || '',
            title: selectedJob.title || '',
            urgent: !!selectedJob.urgent,
            supabaseId: selectedJob.supabaseId,
        };

        if (selectedJob.supabaseId) {
            const { success, error } = await lockRequest(selectedJob.supabaseId);

            if (!success) {
                showToast(error?.message || 'Job no longer available', 'error');
                setSelectedJob(null);
                refetchSupabaseRequests();
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

            // Snap to last known position immediately for instant feedback
            if (location?.coords && mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.0005,
                    longitudeDelta: 0.0005,
                }, 450);
            }

            // Then refine with fresh GPS in the background
            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            setLocation(currentLocation);

            if (mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                    latitudeDelta: 0.0005,
                    longitudeDelta: 0.0005,
                }, 300);
            }
        } catch (error) {
            console.error('[RadarScreen] Error centering on user:', error);
        }
    };

    if (errorMsg) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="location-off" size={48} color={COLORS.textSecondary} />
                <Text style={{ color: COLORS.text, fontSize: 18, marginTop: 16, textAlign: 'center' }}>Location Access Required</Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
                    Enable location permission in Settings to see nearby requests.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* STATIC MAP LAYER */}
            <View style={styles.mapContainer}>
                {currentRegion ? (
                    <MapView
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

                        {/* 10M RADIUS CIRCLE */}
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

                        {/* NEARBY REQUESTS FROM SUPABASE */}
                        {supabaseRequests && supabaseRequests.map((req) => {
                            const lat = parseFloat(req.lat);
                            const lng = parseFloat(req.lng);
                            if (isNaN(lat) || isNaN(lng)) return null;

                            return (
                                <Marker
                                    key={`nearby-${req.id}`}
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

                        {/* ADMIN TEST JOBS FROM LOCAL STORE */}
                        {testJobs && testJobs.map((job) => (
                            <Marker
                                key={`test-${job.id}`}
                                coordinate={{ latitude: parseFloat(job.lat), longitude: parseFloat(job.lng) }}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleMarkerPress(job);
                                }}
                                anchor={{ x: 0.5, y: 0.5 }}
                                tracksViewChanges={true}
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

            {/* EMPTY STATE — no nearby requests */}
            {location && supabaseRequests && supabaseRequests.length === 0 && testJobs.length === 0 && (
                <View style={styles.emptyStateContainer} pointerEvents="none">
                    <Text style={styles.emptyStateText}>No requests nearby</Text>
                </View>
            )}

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

            {/* MAP STYLE TOGGLE */}
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

            {/* RE-CENTER BUTTON */}
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
        elevation: 0,
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
    },
    markerNormal: {
        borderColor: COLORS.primary,
    },
    markerUrgent: {
        borderColor: COLORS.primary,
    },
    markerOwn: {
        borderColor: COLORS.primary,
    },
    markerTestJob: {
        borderColor: COLORS.primary,
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
    emptyStateContainer: {
        position: 'absolute',
        bottom: 160,
        alignSelf: 'center',
        backgroundColor: 'rgba(30,30,30,0.85)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    emptyStateText: {
        color: COLORS.textSecondary,
        fontSize: 14,
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
