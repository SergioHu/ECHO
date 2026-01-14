import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

const LOCAL_COLORS = {
  userBlue: '#4285F4',
  success: '#00FF88',
};

/**
 * PremiumRadar - Ultra minimalist AR-style navigation
 * USES RELATIVE BEARING - Cone fixed UP, job direction rotates
 */
const PremiumRadar = ({ relativeBearing = 0, distance = 0, isAligned = false, jobLat = 0, jobLng = 0 }) => {
  const safeRelativeBearing = parseFloat(relativeBearing) || 0;
  const safeDistance = parseFloat(distance) || 0;
  const safeJobLat = parseFloat(jobLat) || 0;
  const safeJobLng = parseFloat(jobLng) || 0;
  const hasValidJob = safeJobLat !== 0 && safeJobLng !== 0;

  const radarSize = 100;
  const center = radarSize / 2;

  // Calculate cone path - ROTATES to show where job is (compass needle behavior)
  const getConePath = () => {
    const coneAngle = 60;
    const coneLength = 43; // Fixed length to stay inside

    // Convert relativeBearing to radians - cone rotates to point at job
    // relativeBearing = 0° → cone points UP → aligned
    // relativeBearing = 90° → cone points RIGHT → turn right
    // relativeBearing = 270° → cone points LEFT → turn left
    const bearingRad = (safeRelativeBearing * Math.PI) / 180;

    const leftAngle = bearingRad - (coneAngle / 2) * (Math.PI / 180);
    const rightAngle = bearingRad + (coneAngle / 2) * (Math.PI / 180);

    const leftX = center + coneLength * Math.sin(leftAngle);
    const leftY = center - coneLength * Math.cos(leftAngle);
    const rightX = center + coneLength * Math.sin(rightAngle);
    const rightY = center - coneLength * Math.cos(rightAngle);

    return `M ${center} ${center} L ${leftX.toFixed(1)} ${leftY.toFixed(1)} L ${rightX.toFixed(1)} ${rightY.toFixed(1)} Z`;
  };

  const coneFill = isAligned ? 'rgba(0, 255, 136, 0.25)' : 'rgba(255, 255, 255, 0.12)';
  const coneStroke = isAligned ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 255, 255, 0.25)';
  const borderColor = isAligned ? 'rgba(0, 255, 136, 0.6)' : 'rgba(255, 255, 255, 0.3)';

  const openGoogleMaps = () => {
    if (safeJobLat !== 0 && safeJobLng !== 0) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${safeJobLat},${safeJobLng}`;
      Linking.openURL(url).catch(err => console.error('Error opening maps:', err));
    }
  };

  const distanceText = safeDistance < 1000
    ? `${Math.round(safeDistance)}m`
    : `${(safeDistance / 1000).toFixed(1)}km`;

  return (
    <>
      {/* RADAR */}
      <View style={styles.radarWrapper}>
        {/* Glow layer - only when aligned */}
        {isAligned && (
          <View style={styles.glowLayer} />
        )}

        <View style={[
          styles.radarOuter,
          {
            borderColor,
          }
        ]}>
          <View style={styles.svgContainer}>
            <Svg width={radarSize} height={radarSize} style={styles.svg}>
              <Path
                d={getConePath()}
                fill={coneFill}
                stroke={coneStroke}
                strokeWidth={1.5}
              />
              <Circle
                cx={center}
                cy={center}
                r={7}
                fill={LOCAL_COLORS.userBlue}
              />
            </Svg>
          </View>

          <View style={styles.distanceContainer}>
            <Text style={styles.distanceText}>{distanceText}</Text>
          </View>
        </View>
      </View>

      {/* GOOGLE MAPS BUTTON - Bottom-right, opens directions to job */}
      <TouchableOpacity
        onPress={hasValidJob ? openGoogleMaps : null}
        activeOpacity={hasValidJob ? 0.7 : 1}
        style={[
          styles.mapsButton,
          !hasValidJob && styles.mapsButtonDisabled,
        ]}
        disabled={!hasValidJob}
      >
        <Ionicons name="map-outline" size={24} color={COLORS.primary} />
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  radarWrapper: {
    position: 'absolute',
    top: 90,
    left: 16,
    zIndex: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowLayer: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    zIndex: -1,
  },
  radarOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    overflow: 'hidden',
  },
  svgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
  distanceContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // Google Maps button - top-right, 70% of Radar size for visual hierarchy
  mapsButton: {
    position: 'absolute',
    top: 103,     // Aligned with Radar vertical center
    right: 16,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    zIndex: 15,
  },
  mapsButtonDisabled: {
    opacity: 0.4,
  },
});

export default React.memo(PremiumRadar);
