import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
    StatusBar,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DARK_MAP_STYLE } from '../constants/mapStyle';
import { COLORS, FONTS } from '../constants/theme';
import { openInGoogleMaps } from '../utils/openInGoogleMaps';
import MapCrosshair from './MapCrosshair';
import { getTestJobs, subscribe } from '../store/jobStore';
import { useNearbyRequests } from '../hooks';

const { width, height } = Dimensions.get('window');

const ExpandedMapModal = ({ visible, initialLocation, userLocation, onConfirm, onClose }) => {
    const mapRef = useRef(null);
    const [currentLocation, setCurrentLocation] = useState(initialLocation);
    const [testJobs, setTestJobs] = useState([]);

    // Get nearby requests from Supabase (same source as RadarScreen)
    const {
        requests: nearbyRequests,
    } = useNearbyRequests(
        userLocation?.latitude,
        userLocation?.longitude,
        50000 // 50km radius (same as RadarScreen)
    );

    // Subscribe to job store changes (same as RadarScreen)
    useEffect(() => {
        setTestJobs(getTestJobs());

        const unsubscribe = subscribe(() => {
            setTestJobs(getTestJobs());
        });

        return () => unsubscribe();
    }, []);

    // Update location when modal opens with new initial location
    useEffect(() => {
        if (visible && initialLocation) {
            setCurrentLocation(initialLocation);
            mapRef.current?.animateToRegion({
                ...initialLocation,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            }, 300);
        }
    }, [visible, initialLocation]);

    const handleRegionChangeComplete = (region) => {
        setCurrentLocation({
            latitude: region.latitude,
            longitude: region.longitude,
        });
    };

    const handleConfirm = () => {
        onConfirm(currentLocation);
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <View style={styles.container}>
                {/* Full Screen Map */}
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    customMapStyle={DARK_MAP_STYLE}
                    initialRegion={{
                        latitude: initialLocation?.latitude || 0,
                        longitude: initialLocation?.longitude || 0,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                    }}
                    onRegionChangeComplete={handleRegionChangeComplete}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    showsCompass={false}
                    toolbarEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    loadingEnabled={true}
                    loadingBackgroundColor={COLORS.background}
                >
                    {/* USER LOCATION MARKER - Blue dot (same as RadarScreen) */}
                    {userLocation && (
                        <Marker
                            coordinate={{
                                latitude: userLocation.latitude,
                                longitude: userLocation.longitude,
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

                    {/* NEARBY REQUESTS FROM SUPABASE - Same as RadarScreen */}
                    {nearbyRequests && nearbyRequests.length > 0 && nearbyRequests.map((req) => {
                        const lat = parseFloat(req.lat);
                        const lng = parseFloat(req.lng);
                        if (isNaN(lat) || isNaN(lng)) return null;
                        return (
                            <Marker
                                key={`nearby-${req.id}`}
                                coordinate={{ latitude: lat, longitude: lng }}
                                anchor={{ x: 0.5, y: 0.5 }}
                                tracksViewChanges={true}
                                zIndex={req.isOwn ? 150 : 100}
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

                    {/* TEST JOBS FROM STORE - Same as RadarScreen */}
                    {testJobs && testJobs.map((job) => (
                        <Marker
                            key={`test-${job.id}`}
                            coordinate={{ latitude: parseFloat(job.lat), longitude: parseFloat(job.lng) }}
                            anchor={{ x: 0.5, y: 0.5 }}
                            tracksViewChanges={true}
                            zIndex={100}
                        >
                            <View style={styles.markerWrapper}>
                                <View style={[styles.markerContainer, styles.markerTestJob]}>
                                    <Text style={styles.markerText}>€{parseFloat(job.price).toFixed(2)}</Text>
                                </View>
                            </View>
                        </Marker>
                    ))}
                </MapView>

                {/* CENTER CROSSHAIR - Fixed overlay, map moves underneath */}
                <View style={styles.crosshairContainer} pointerEvents="none">
                    <MapCrosshair />
                </View>

                {/* Top Bar - Close Button + Maps Button */}
                <SafeAreaView edges={['top']} style={styles.topBar}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.topTitle}>Adjust Location</Text>
                    {/* Open in Google Maps */}
                    <TouchableOpacity
                        style={styles.mapsButton}
                        onPress={() => openInGoogleMaps(
                            currentLocation?.latitude,
                            currentLocation?.longitude,
                            userLocation // Pass user location for directions context
                        )}
                        activeOpacity={0.8}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Ionicons name="map-outline" size={20} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </SafeAreaView>

                {/* Bottom Controls */}
                <SafeAreaView edges={['bottom']} style={styles.bottomControls}>
                    {/* Hint Text */}
                    <View style={styles.hintContainer}>
                        <Ionicons name="move" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.hintText}>Move the map to position the pin</Text>
                    </View>

                    {/* Coordinates Display */}
                    <View style={styles.coordsContainer}>
                        <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.coordsText}>
                            {currentLocation?.latitude?.toFixed(5) || '0.00000'}, {currentLocation?.longitude?.toFixed(5) || '0.00000'}
                        </Text>
                    </View>

                    {/* Confirm Button */}
                    <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={handleConfirm}
                        activeOpacity={0.9}
                    >
                        <Ionicons name="checkmark-circle" size={22} color="#000" />
                        <Text style={styles.confirmButtonText}>CONFIRM LOCATION</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },

    // Center Crosshair - Same as RadarScreen
    crosshairContainer: {
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

    // User Location Marker - Same as RadarScreen
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

    // Job Markers - Same as RadarScreen
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
        borderColor: COLORS.secondary, // Green for available requests
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

    // Top Bar
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    topTitle: {
        color: COLORS.textPrimary,
        fontSize: 17,
        ...FONTS.bold,
    },
    mapsButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Bottom Controls
    bottomControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(18, 18, 18, 0.95)',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    hintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        gap: 8,
    },
    hintText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    coordsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'center',
        marginBottom: 16,
        gap: 6,
    },
    coordsText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontFamily: 'monospace',
    },
    confirmButton: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    confirmButtonText: {
        color: '#000',
        fontSize: 16,
        ...FONTS.bold,
        letterSpacing: 1,
    },
});

export default ExpandedMapModal;
