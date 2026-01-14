import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    Alert,
    Dimensions,
    ScrollView,
    Animated,
    Keyboard,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { DARK_MAP_STYLE } from '../../constants/mapStyle';
import { addTestJob } from '../../store/jobStore';

const { width, height } = Dimensions.get('window');

const PRICE_OPTIONS = [0.50, 1.00, 2.00, 5.00];

const CreateTestJob = ({ navigation }) => {
    const mapRef = useRef(null);
    const keyboardOffset = useRef(new Animated.Value(0)).current;
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [selectedPrice, setSelectedPrice] = useState(1.00);
    const [customPrice, setCustomPrice] = useState('');
    const [description, setDescription] = useState('');
    const [initialRegion, setInitialRegion] = useState({
        latitude: 38.7387,
        longitude: -9.2115,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });

    // Keyboard animation
    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
            Animated.timing(keyboardOffset, {
                toValue: e.endCoordinates.height,
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

    useEffect(() => {
        getCurrentLocation();
    }, []);

    const getCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({});
                const region = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                };
                setInitialRegion(region);
                mapRef.current?.animateToRegion(region, 500);
            }
        } catch (error) {
            console.log('Location error:', error);
        }
    };

    const handleMapPress = (e) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setSelectedLocation({ latitude, longitude });
    };

    const handlePriceSelect = (price) => {
        setSelectedPrice(price);
        setCustomPrice('');
    };

    const handleCustomPrice = (text) => {
        setCustomPrice(text);
        const parsed = parseFloat(text);
        if (!isNaN(parsed) && parsed > 0) {
            setSelectedPrice(parsed);
        }
    };

    const handleCreateJob = () => {
        if (!selectedLocation) {
            Alert.alert('Location Required', 'Please tap on the map to place the job.');
            return;
        }

        const finalPrice = customPrice ? parseFloat(customPrice) : selectedPrice;
        if (isNaN(finalPrice) || finalPrice <= 0) {
            Alert.alert('Invalid Price', 'Please enter a valid price.');
            return;
        }

        // Add job to the store so it appears on the main map
        const newJob = addTestJob({
            lat: selectedLocation.latitude,
            lng: selectedLocation.longitude,
            price: finalPrice,
            description: description || 'Test photo job',
            urgent: false,
            isTestJob: true,
        });

        Alert.alert(
            'Job Created!',
            `Test job created at\nLat: ${selectedLocation.latitude.toFixed(4)}\nLng: ${selectedLocation.longitude.toFixed(4)}\nPrice: €${finalPrice.toFixed(2)}\n\nGo to the Radar map to see it!`,
            [
                {
                    text: 'Stay Here',
                    style: 'cancel',
                },
                {
                    text: 'Go to Radar',
                    onPress: () => navigation.navigate('MainTabs', { screen: 'Radar' }),
                }
            ]
        );
    };

    const isConfirmDisabled = !selectedLocation;

    return (
        <View style={styles.overlay}>
            {/* Backdrop */}
            <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={() => navigation.goBack()}
            />

            {/* Bottom Sheet */}
            <Animated.View
                style={[
                    styles.sheetContainer,
                    {
                        transform: [{ translateY: Animated.multiply(keyboardOffset, -1) }],
                    },
                ]}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Create Test Job</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Map */}
                <View style={styles.miniMapContainer}>
                    <MapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        style={styles.map}
                        customMapStyle={DARK_MAP_STYLE}
                        initialRegion={initialRegion}
                        onPress={handleMapPress}
                        showsUserLocation
                        showsMyLocationButton={false}
                    >
                        {selectedLocation && (
                            <Marker coordinate={selectedLocation} anchor={{ x: 0.5, y: 1.0 }}>
                                <Ionicons name="location" size={36} color={COLORS.secondary} />
                            </Marker>
                        )}
                    </MapView>
                    <View style={styles.mapOverlay}>
                        <Text style={styles.mapHint}>Tap to place job</Text>
                    </View>
                </View>

                {/* Coordinates */}
                {selectedLocation && (
                    <View style={styles.locationContainer}>
                        <Ionicons name="location-outline" size={16} color={COLORS.secondary} />
                        <Text style={styles.locationText}>
                            {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
                        </Text>
                    </View>
                )}

                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Price Selection */}
                    <Text style={styles.label}>Price:</Text>
                    <View style={styles.priceRow}>
                        {PRICE_OPTIONS.map((price) => (
                            <TouchableOpacity
                                key={price}
                                style={[
                                    styles.priceButton,
                                    selectedPrice === price && !customPrice && styles.priceButtonActive
                                ]}
                                onPress={() => handlePriceSelect(price)}
                            >
                                <Text style={[
                                    styles.priceButtonText,
                                    selectedPrice === price && !customPrice && styles.priceButtonTextActive
                                ]}>
                                    €{price.toFixed(2)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Custom Price */}
                    <View style={styles.customPriceContainer}>
                        <Text style={styles.customPriceLabel}>Custom: €</Text>
                        <TextInput
                            style={styles.customPriceInput}
                            placeholder="0.00"
                            placeholderTextColor={COLORS.textSecondary}
                            keyboardType="decimal-pad"
                            value={customPrice}
                            onChangeText={handleCustomPrice}
                        />
                    </View>

                    {/* Description */}
                    <Text style={styles.label}>Description (optional):</Text>
                    <TextInput
                        style={styles.descriptionInput}
                        placeholder="Take photo of building entrance"
                        placeholderTextColor={COLORS.textSecondary}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        maxLength={100}
                    />
                </ScrollView>

                {/* Footer with Price and Button */}
                <View style={styles.summaryRow}>
                    <View style={styles.totalWrapper}>
                        <Text style={styles.totalLabel}>Job Price:</Text>
                        <Text style={styles.totalValue}>
                            €{(customPrice ? parseFloat(customPrice) || 0 : selectedPrice).toFixed(2)}
                        </Text>
                    </View>

                    <View style={{ flex: 1 }} />

                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={handleCreateJob}
                        disabled={isConfirmDisabled}
                        style={[
                            styles.confirmButton,
                            isConfirmDisabled ? styles.confirmButtonDisabled : styles.confirmButtonActive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.confirmButtonText,
                                isConfirmDisabled ? styles.confirmButtonTextDisabled : styles.confirmButtonTextActive,
                            ]}
                        >
                            CREATE JOB
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 18,
        color: COLORS.textPrimary,
        ...FONTS.bold,
    },
    miniMapContainer: {
        height: 180,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: '#111',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    mapOverlay: {
        position: 'absolute',
        top: 8,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    mapHint: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        color: COLORS.textPrimary,
        fontSize: 12,
        ...FONTS.medium,
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
    scrollContent: {
        paddingBottom: 16,
    },
    label: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginBottom: 8,
        ...FONTS.medium,
    },
    priceRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    priceButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#333',
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    priceButtonActive: {
        backgroundColor: COLORS.secondary,
        borderColor: COLORS.secondary,
    },
    priceButtonText: {
        color: COLORS.textPrimary,
        fontSize: 14,
        ...FONTS.bold,
    },
    priceButtonTextActive: {
        color: '#000000',
    },
    customPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    customPriceLabel: {
        color: COLORS.textSecondary,
        fontSize: 14,
        ...FONTS.medium,
    },
    customPriceInput: {
        flex: 1,
        paddingVertical: 12,
        color: COLORS.textPrimary,
        fontSize: 14,
        ...FONTS.medium,
    },
    descriptionInput: {
        backgroundColor: '#333',
        color: COLORS.textPrimary,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        minHeight: 60,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        ...FONTS.regular,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
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
        height: 44,
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButtonActive: {
        backgroundColor: COLORS.secondary,
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

export default CreateTestJob;
