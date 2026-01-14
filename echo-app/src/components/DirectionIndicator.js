import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const COLORS = {
  primary: '#00E5FF',
  background: '#0a0a0a',
  surface: '#1a1a1a',
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  error: '#FF3B30',
  success: '#30D158',
  warning: '#FFD60A',
};

/**
 * DirectionIndicator - Premium navigation component
 * Shows distance, direction arrow, and price with dynamic color feedback
 *
 * @param {number} distance - Distance to job in meters
 * @param {number} bearing - Bearing angle to job (0-360)
 * @param {number} heading - Device orientation (0-360)
 * @param {number} price - Job price (e.g., 0.50)
 * @param {boolean} isInRange - True if distance <= 5m
 */
const DirectionIndicator = ({ distance, bearing, heading, price, isInRange }) => {
  const arrowRotation = useRef(new Animated.Value(0)).current;
  const previousRotation = useRef(0);

  // Calculate arrow rotation (direction to job relative to device)
  const targetRotation = useMemo(() => {
    if (bearing === null || heading === null) return 0;
    return (bearing - heading + 360) % 360;
  }, [bearing, heading]);

  // Calculate alignment difference (normalized to -180 to +180)
  const alignmentDiff = useMemo(() => {
    if (bearing === null || heading === null) return null;
    let diff = bearing - heading;
    // Normalize to -180 to +180
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff;
  }, [bearing, heading]);

  // Determine alignment status and text
  const alignmentStatus = useMemo(() => {
    if (alignmentDiff === null) return { text: '', color: COLORS.textSecondary };

    const absDiff = Math.abs(alignmentDiff);

    // Aligned (within 20 degrees)
    if (absDiff <= 20) {
      return { text: '✅ ALINHADO', color: COLORS.success };
    }

    // Almost aligned (20-45 degrees)
    if (absDiff <= 45) {
      const direction = alignmentDiff < 0 ? '← VIRA ESQUERDA' : 'VIRA DIREITA →';
      return { text: direction, color: COLORS.warning };
    }

    // Misaligned (>45 degrees)
    const direction = alignmentDiff < 0 ? '← VIRA ESQUERDA' : 'VIRA DIREITA →';
    return { text: direction, color: COLORS.error };
  }, [alignmentDiff]);

  // Smooth arrow rotation animation
  useEffect(() => {
    if (targetRotation === null) return;

    // Handle 360/0 degree wraparound for smooth rotation
    let fromValue = previousRotation.current;
    let toValue = targetRotation;

    const diff = toValue - fromValue;
    if (diff > 180) {
      fromValue += 360;
    } else if (diff < -180) {
      toValue += 360;
    }

    arrowRotation.setValue(fromValue);

    Animated.timing(arrowRotation, {
      toValue: toValue,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      previousRotation.current = targetRotation;
    });
  }, [targetRotation]);

  // Determine color based on distance
  const getColorForDistance = useMemo(() => {
    if (distance === null) return COLORS.textSecondary;
    if (distance <= 5) return COLORS.success;
    if (distance <= 15) return COLORS.warning;
    return COLORS.error;
  }, [distance]);

  // Format distance display
  const formatDistance = useMemo(() => {
    if (distance === null) return '--';
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  }, [distance]);

  // Arrow emoji with rotation
  const arrowStyle = {
    transform: [
      {
        rotate: arrowRotation.interpolate({
          inputRange: [0, 360],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  };

  return (
    <View style={[styles.container, { borderColor: getColorForDistance }]}>
      {/* Distance Display */}
      <Text style={[styles.distance, { color: getColorForDistance }]}>
        {formatDistance}
      </Text>

      {/* Direction Arrow */}
      <Animated.View style={arrowStyle}>
        <Text style={styles.arrow}>⬇️</Text>
      </Animated.View>

      {/* Price Display */}
      <Text style={styles.price}>€{parseFloat(price).toFixed(2)}</Text>

      {/* Alignment Indicator (NOVO) */}
      {alignmentStatus.text !== '' && (
        <Text style={[styles.alignmentText, { color: alignmentStatus.color }]}>
          {alignmentStatus.text}
        </Text>
      )}

      {/* Ready Indicator (when in range) */}
      {isInRange && (
        <View style={styles.readyBadge}>
          <Text style={styles.readyText}>📸 READY</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 120,
    minHeight: 160, // Increased to accommodate alignment text
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 12,
    paddingHorizontal: 8,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  distance: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: -1,
  },
  arrow: {
    fontSize: 44,
    lineHeight: 44,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  alignmentText: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  readyBadge: {
    position: 'absolute',
    bottom: -12,
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
  },
  readyText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 0.5,
  },
});

export default React.memo(DirectionIndicator);
