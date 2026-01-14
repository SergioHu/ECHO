import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';
import { DARK_MAP_STYLE } from '../constants/mapStyle';

const MiniMap = ({ job, userLocation, headingAnim }) => {
    const mapRef = useRef(null);
    const [mapReady, setMapReady] = useState(false);
    const [initialRenderComplete, setInitialRenderComplete] = useState(false);

    // Desabilitar tracksViewChanges após 2 segundos para melhor performance
    useEffect(() => {
        const timer = setTimeout(() => {
            setInitialRenderComplete(true);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    // Memoizar região inicial para evitar recálculos
    const initialRegion = useMemo(() => {
        if (!userLocation || !userLocation.latitude) {
            return {
                latitude: job.lat,
                longitude: job.lng,
                latitudeDelta: 0.002,
                longitudeDelta: 0.002,
            };
        }

        // Centro entre user e job
        const centerLat = (job.lat + userLocation.latitude) / 2;
        const centerLng = (job.lng + userLocation.longitude) / 2;

        // Calcular distância
        const latDiff = Math.abs(job.lat - userLocation.latitude);
        const lngDiff = Math.abs(job.lng - userLocation.longitude);

        // IMPORTANTE: Garantir um delta MÍNIMO para que ambos sejam visíveis
        // Mesmo que estejam a 0 metros, queremos ver os dois
        const minDelta = 0.0008; // ~80 metros de visão mínima
        const latDelta = Math.max(latDiff * 5, minDelta);
        const lngDelta = Math.max(lngDiff * 5, minDelta);

        return {
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: latDelta,
            longitudeDelta: lngDelta,
        };
    }, [job.lat, job.lng, userLocation?.latitude, userLocation?.longitude]);

    // Quando o mapa fica pronto E userLocation existe, forçar fit
    useEffect(() => {
        if (mapReady && userLocation && userLocation.latitude && mapRef.current) {
            // Delay maior para garantir que os markers renderizaram
            const timer = setTimeout(() => {
                mapRef.current.fitToCoordinates(
                    [
                        { latitude: job.lat, longitude: job.lng },
                        { latitude: userLocation.latitude, longitude: userLocation.longitude },
                    ],
                    {
                        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
                        animated: true,
                    }
                );
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [mapReady, userLocation?.latitude, userLocation?.longitude, job.lat, job.lng]);

    // Rotação do cone
    const rotation = headingAnim
        ? headingAnim.interpolate({
              inputRange: [0, 360],
              outputRange: ['0deg', '360deg'],
          })
        : '0deg';

    return (
        <View style={styles.container} pointerEvents="none">
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                customMapStyle={DARK_MAP_STYLE}
                initialRegion={initialRegion}
                onMapReady={() => setMapReady(true)}
                scrollEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                zoomEnabled={false}
                showsUserLocation={false}
                loadingEnabled={false}
                minZoomLevel={17}
                maxZoomLevel={20}
            >
                {/* Círculo de Validação 5m à volta do JOB */}
                <Circle
                    key={`job-circle-${job.id}`}
                    center={{ latitude: job.lat, longitude: job.lng }}
                    radius={5}
                    strokeColor="rgba(0, 229, 255, 0.8)"
                    strokeWidth={2}
                    fillColor="rgba(0, 229, 255, 0.15)"
                />

                {/* JOB MARKER */}
                <Marker
                    key={`job-marker-${job.id}`}
                    coordinate={{ latitude: parseFloat(job.lat), longitude: parseFloat(job.lng) }}
                    anchor={{ x: 0.5, y: 0.5 }}
                    tracksViewChanges={!initialRenderComplete}
                    zIndex={100}
                >
                    <View style={styles.jobMarker}>
                        <Text style={styles.jobText}>
                            €{parseFloat(job.price).toFixed(2)}
                        </Text>
                    </View>
                </Marker>

                {/* USER MARKER - TU */}
                {userLocation && userLocation.latitude && (
                    <Marker
                        key="user-marker"
                        coordinate={{
                            latitude: userLocation.latitude,
                            longitude: userLocation.longitude,
                        }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        flat={true}
                        tracksViewChanges={!initialRenderComplete}
                        zIndex={200}
                    >
                        <View style={styles.userWrapper}>
                            {/* Cone de Direcção */}
                            <Animated.View
                                style={[
                                    styles.coneWrapper,
                                    { transform: [{ rotate: rotation }] },
                                ]}
                            >
                                <LinearGradient
                                    colors={['rgba(66, 133, 244, 0.8)', 'transparent']}
                                    start={{ x: 0.5, y: 1 }}
                                    end={{ x: 0.5, y: 0 }}
                                    style={styles.cone}
                                />
                            </Animated.View>

                            {/* User Dot - PONTO AZUL */}
                            <View style={styles.userDotOuter}>
                                <View style={styles.userDotInner} />
                            </View>
                        </View>
                    </Marker>
                )}
            </MapView>

            {/* Indicador GPS */}
            {(!userLocation || !userLocation.latitude) && (
                <View style={styles.noGps}>
                    <Text style={styles.noGpsText}>GPS...</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 100,
        left: 20,
        width: 160,
        height: 160,
        borderRadius: 80,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.4)',
        backgroundColor: '#1a1a1a',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    // JOB MARKER
    jobMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#000000',
        borderWidth: 2,
        borderColor: '#00E5FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    jobText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: 'bold',
    },
    // USER MARKER
    userWrapper: {
        width: 80,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    coneWrapper: {
        position: 'absolute',
        width: 80,
        height: 80,
        alignItems: 'center',
    },
    cone: {
        width: 40,
        height: 50,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    userDotOuter: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#4285F4',
    },
    userDotInner: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#4285F4',
    },
    // INDICADOR GPS
    noGps: {
        position: 'absolute',
        bottom: 5,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    noGpsText: {
        color: '#FF6B6B',
        fontSize: 10,
        fontWeight: 'bold',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
});

export default MiniMap;
