import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Keyboard,
    ActivityIndicator,
    Animated,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { DARK_MAP_STYLE } from '../constants/mapStyle';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import ExpandedMapModal from './ExpandedMapModal';
import { openInGoogleMaps } from '../utils/openInGoogleMaps';
import { useCreateRequest } from '../hooks/useCreateRequest';
import { useAuth } from '../context/AuthContext';

const GOOGLE_API_KEY =
    Constants.expoConfig?.android?.config?.googleMaps?.apiKey ||
    Constants.expoConfig?.ios?.config?.googleMapsApiKey ||
    '';

export const CreateRequestSheet = ({ visible, coordinates, userLocation, onClose, onConfirm }) => {
    if (!visible) return null;

    return (
        <CreateRequestSheetContent
            coordinates={coordinates}
            userLocation={userLocation}
            onClose={onClose}
            onConfirm={onConfirm}
        />
    );
};

const CreateRequestSheetContent = ({ coordinates, userLocation, onClose, onConfirm }) => {
    const safeCoordinates = coordinates || { latitude: 0, longitude: 0 };

    // Supabase hooks
    const { user } = useAuth();
    const { createRequest, loading: creatingRequest, error: createError } = useCreateRequest();

    const [description, setDescription] = useState('');
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [selectedLocation, setSelectedLocation] = useState({
        latitude: safeCoordinates.latitude,
        longitude: safeCoordinates.longitude,
    });

    const [showExpandedMap, setShowExpandedMap] = useState(false);
    const [expandInitialLocation, setExpandInitialLocation] = useState(null);

    const mapRef = useRef(null);
    const keyboardOffset = useRef(new Animated.Value(0)).current;

    // Handle submit - create request in Supabase or fallback to local
    const handleSubmit = async () => {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║  📍 HANDLE SUBMIT CALLED                                 ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log('📍 Description:', description);
        console.log('📍 Description trimmed:', description.trim());
        console.log('📍 Description empty?:', !description.trim());

        if (!description.trim()) {
            console.log('❌ ABORTED: Description is empty');
            return;
        }

        setIsSubmitting(true);

        console.log('');
        console.log('📍 ATTEMPTING TO CREATE REQUEST...');
        console.log('📍 Coordinates:', selectedLocation.latitude, selectedLocation.longitude);
        console.log('📍 User object:', user);
        console.log('📍 User ID:', user?.id);
        console.log('📍 Is user authenticated?:', !!user?.id);

        // If user is authenticated, create request in Supabase
        if (user?.id) {
            console.log('✅ User is authenticated, calling createRequest()...');

            const requestParams = {
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
                locationName: query || `${selectedLocation.latitude.toFixed(5)}, ${selectedLocation.longitude.toFixed(5)}`,
                description: description.trim(),
                priceCents: 50, // €0.50 default
                category: 'general',
            };
            console.log('📍 Request params:', JSON.stringify(requestParams, null, 2));

            const { data, error } = await createRequest(requestParams);

            console.log('');
            console.log('╔══════════════════════════════════════════════════════════╗');
            console.log('║  📍 SUPABASE RESPONSE                                    ║');
            console.log('╚══════════════════════════════════════════════════════════╝');
            console.log('📍 Data:', JSON.stringify(data, null, 2));
            console.log('📍 Error:', error);

            setIsSubmitting(false);

            if (error) {
                console.error('❌ Failed to create request:', error);
                console.error('❌ Error message:', error.message);
                console.error('❌ Error details:', JSON.stringify(error, null, 2));
                // Still call onConfirm to show feedback (will fallback to local in RadarScreen)
                onConfirm({
                    ...selectedLocation,
                    description,
                    supabaseError: true,
                    errorMessage: error.message,
                });
                return;
            }

            console.log('✅ SUCCESS! Request created with ID:', data?.id);
            console.log('✅ Full data:', JSON.stringify(data, null, 2));

            // Success - pass Supabase data back
            onConfirm({
                ...selectedLocation,
                description,
                supabaseId: data.id,
                supabaseData: data,
            });
        } else {
            // Not authenticated - use local mock (fallback)
            console.log('⚠️ USER NOT AUTHENTICATED - using local fallback');
            console.log('⚠️ user object is:', user);
            setIsSubmitting(false);
            onConfirm({ ...selectedLocation, description });
        }
    };

    // anima o SHEET INTEIRO com o teclado
    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
            // Remove cap to allow full keyboard height + buffer
            const offset = e.endCoordinates.height + 20;

            Animated.timing(keyboardOffset, {
                toValue: offset,
                duration: 200,
                useNativeDriver: true,
            }).start();
        });

        const hideSub = Keyboard.addListener('keyboardDidHide', () => {
            Animated.timing(keyboardOffset, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }).start();
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, [keyboardOffset]);

    // Update location when coordinates change from parent
    useEffect(() => {
        if (coordinates) {
            setSelectedLocation({
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
            });
            // Animate map to new location without using controlled region prop
            mapRef.current?.animateToRegion({
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
                latitudeDelta: 0.003,
                longitudeDelta: 0.003,
            }, 300);
        }
    }, [coordinates]);

    // Open expanded map with snapshot of current location
    const handleOpenExpand = () => {
        setExpandInitialLocation({ ...selectedLocation });
        setShowExpandedMap(true);
    };

    // Handle confirm from expanded map
    const handleExpandConfirm = (coords) => {
        setSelectedLocation(coords);
        setShowExpandedMap(false);
        // Smooth animation to new location
        mapRef.current?.animateToRegion({
            ...coords,
            latitudeDelta: 0.003,
            longitudeDelta: 0.003,
        }, 300);
    };

    const fetchPlaces = async (text) => {
        setQuery(text);

        if (text.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setLoadingSuggestions(true);
        setShowSuggestions(true);

        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
                    text,
                )}&key=${GOOGLE_API_KEY}&language=en`,
            );
            const data = await response.json();
            setSuggestions(data.status === 'OK' ? data.predictions : []);
        } catch (e) {
            setSuggestions([]);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const handleSelectPlace = async (placeId, descriptionText) => {
        setQuery(descriptionText);
        setShowSuggestions(false);
        Keyboard.dismiss();

        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_API_KEY}`,
            );
            const data = await response.json();

            if (data.status === 'OK' && data.result.geometry) {
                const { lat, lng } = data.result.geometry.location;
                setSelectedLocation({ latitude: lat, longitude: lng });

                mapRef.current?.animateToRegion(
                    {
                        latitude: lat,
                        longitude: lng,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                    },
                    800,
                );
            }
        } catch (e) {
            // silencioso
        }
    };

    const isConfirmDisabled = !description.trim();

    return (
        <View style={styles.overlay}>
            {/* backdrop */}
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

            {/* SHEET inteiro animado */}
            <Animated.View
                style={[
                    styles.sheetContainer,
                    {
                        transform: [
                            {
                                translateY: Animated.multiply(keyboardOffset, -1),
                            },
                        ],
                    },
                ]}
            >
                {/* HEADER */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>New Request</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* MAPA + PINS - Interactive + Expand Option */}
                <View style={styles.miniMapContainer}>
                    <MapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                        customMapStyle={DARK_MAP_STYLE}
                        initialRegion={{
                            latitude: safeCoordinates.latitude,
                            longitude: safeCoordinates.longitude,
                            latitudeDelta: 0.003,
                            longitudeDelta: 0.003,
                        }}
                        onRegionChangeComplete={(r) => {
                            setSelectedLocation({
                                latitude: r.latitude,
                                longitude: r.longitude,
                            });
                        }}
                        rotateEnabled={false}
                        pitchEnabled={false}
                    >
                        {/* User location marker */}
                        {userLocation && (
                            <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
                                <View style={styles.userLocationDot} />
                            </Marker>
                        )}
                    </MapView>

                    {/* Center Pin Overlay - Fixed position */}
                    <View style={styles.centerPinOverlay} pointerEvents="none">
                        <Ionicons name="location" size={36} color={COLORS.primary} />
                    </View>

                    {/* Overlay Buttons Row - box-none allows map gestures through */}
                    <View style={styles.mapOverlayRow} pointerEvents="box-none">
                        {/* Open in Google Maps - Left */}
                        <TouchableOpacity
                            style={styles.mapOverlayButton}
                            onPress={() => openInGoogleMaps(
                                selectedLocation.latitude,
                                selectedLocation.longitude,
                                userLocation // Pass user location for directions context
                            )}
                            activeOpacity={0.8}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            pointerEvents="auto"
                        >
                            <Ionicons name="map-outline" size={16} color={COLORS.textPrimary} />
                        </TouchableOpacity>

                        {/* Expand - Right */}
                        <TouchableOpacity
                            style={styles.expandButton}
                            onPress={handleOpenExpand}
                            activeOpacity={0.8}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            pointerEvents="auto"
                        >
                            <Ionicons name="expand-outline" size={16} color={COLORS.textPrimary} />
                            <Text style={styles.expandButtonText}>Expand</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* CONTEÚDO */}
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* SEARCH */}
                    <View style={styles.searchContainer}>
                        <Ionicons
                            name="search"
                            size={20}
                            color={COLORS.textSecondary}
                            style={{ marginRight: 8 }}
                        />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search location..."
                            placeholderTextColor={COLORS.textSecondary}
                            value={query}
                            onChangeText={fetchPlaces}
                        />
                        {loadingSuggestions && <ActivityIndicator color={COLORS.primary} />}
                    </View>

                    {/* AUTOCOMPLETE */}
                    {showSuggestions && suggestions.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                            {suggestions.map((item) => (
                                <TouchableOpacity
                                    key={item.place_id}
                                    style={styles.suggestionItem}
                                    onPress={() => handleSelectPlace(item.place_id, item.description)}
                                >
                                    <Ionicons name="location-sharp" size={16} color={COLORS.textSecondary} />
                                    <Text style={styles.suggestionText} numberOfLines={1}>
                                        {item.description}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* COORDENADAS */}
                    <View style={styles.locationContainer}>
                        <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.locationText}>
                            {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
                        </Text>
                    </View>

                    {/* DESCRIÇÃO */}
                    <Text style={styles.label}>What do you need to see?</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Is the shop open?"
                        placeholderTextColor={COLORS.textSecondary}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        maxLength={100}
                    />
                </ScrollView>

                {/* TOTAL + BOTÃO INLINE (FIXED FOOTER) */}
                <View style={styles.summaryRow}>
                    <View style={styles.totalWrapper}>
                        <Text style={styles.totalLabel}>Total:</Text>
                        <Text style={styles.totalValue}>€0.50</Text>
                    </View>

                    <View style={{ flex: 1 }} />

                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={handleSubmit}
                        disabled={isConfirmDisabled || isSubmitting}
                        style={[
                            styles.confirmButton,
                            (isConfirmDisabled || isSubmitting) ? styles.confirmButtonDisabled : styles.confirmButtonActive,
                        ]}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#000" size="small" />
                        ) : (
                            <Text
                                style={[
                                    styles.confirmButtonText,
                                    isConfirmDisabled ? styles.confirmButtonTextDisabled : styles.confirmButtonTextActive,
                                ]}
                                numberOfLines={1}
                            >
                                CONFIRM & PAY
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Expanded Map Modal */}
            <ExpandedMapModal
                visible={showExpandedMap}
                initialLocation={expandInitialLocation || selectedLocation}
                userLocation={userLocation}
                onConfirm={handleExpandConfirm}
                onClose={() => setShowExpandedMap(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 999,
    },
    backdrop: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
    },
    sheetContainer: {
        width: '100%',
        maxHeight: '90%',
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 18,
        color: COLORS.textPrimary,
        ...FONTS.bold,
    },
    miniMapContainer: {
        height: 180,
        borderRadius: 16,
        // No overflow: 'hidden' - preserves Google attribution
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: '#111',
        position: 'relative',
    },
    centerPinOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 18, // Offset for pin tip alignment
    },
    mapOverlayRow: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 9999,
        elevation: 20, // Critical for Android
    },
    mapOverlayButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    expandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 6,
    },
    expandButtonText: {
        color: COLORS.textPrimary,
        fontSize: 12,
        fontWeight: '600',
    },
    pin: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#00B7FF',
        borderWidth: 2,
        borderColor: 'white',
    },
    userLocationDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#00AFFF',
        borderWidth: 1.5,
        borderColor: 'white',
    },
    scrollContent: {
        paddingBottom: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        marginBottom: 6,
    },
    searchInput: {
        flex: 1,
        color: COLORS.textPrimary,
        marginLeft: 4,
    },
    suggestionsContainer: {
        backgroundColor: '#2A2A2A',
        borderRadius: 10,
        marginBottom: 8,
        overflow: 'hidden',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    suggestionText: {
        color: COLORS.textPrimary,
        fontSize: 13,
        marginLeft: 6,
        flex: 1,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#222',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    locationText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginLeft: 6,
    },
    label: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginBottom: 4,
    },
    input: {
        backgroundColor: '#333',
        color: COLORS.textPrimary,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        minHeight: 60,
        textAlignVertical: 'top',
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    totalWrapper: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    totalLabel: {
        color: COLORS.textPrimary,
        fontSize: 14,
        marginRight: 4,
    },
    totalValue: {
        color: COLORS.secondary,
        fontSize: 22,
        ...FONTS.bold,
    },
    confirmButton: {
        borderRadius: 12,
        height: 42,
        paddingHorizontal: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButtonActive: {
        backgroundColor: COLORS.primary,
    },
    confirmButtonDisabled: {
        backgroundColor: '#2F2F2F',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    confirmButtonText: {
        fontSize: 14,
        ...FONTS.bold,
    },
    confirmButtonTextActive: {
        color: '#000000',
    },
    confirmButtonTextDisabled: {
        color: 'rgba(255,255,255,0.45)',
    },
});

export default CreateRequestSheet;
