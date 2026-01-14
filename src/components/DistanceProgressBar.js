import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

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
 * DistanceProgressBar - Visual progress indicator for job approach
 * Shows user position (🔵) moving towards job (💰) with distance feedback
 *
 * @param {number} distance - Current distance to job in meters
 * @param {number} maxDistance - Initial distance (for progress calculation)
 * @param {boolean} isInRange - True if distance <= 5m
 */
const DistanceProgressBar = ({ distance, maxDistance, isInRange }) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Calculate progress percentage (0-100)
  const progressPercentage = useMemo(() => {
    if (distance === null || maxDistance === null || maxDistance === 0) return 0;
    const progress = Math.max(0, Math.min(100, ((maxDistance - distance) / maxDistance) * 100));
    return progress;
  }, [distance, maxDistance]);

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercentage,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progressPercentage]);

  // Pulse animation when in range
  useEffect(() => {
    if (isInRange) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isInRange]);

  // Determine color based on distance
  const getColorForDistance = useMemo(() => {
    if (distance === null) return COLORS.textSecondary;
    if (distance <= 5) return COLORS.success;
    if (distance <= 15) return COLORS.warning;
    return COLORS.error;
  }, [distance]);

  // Format distance text
  const distanceText = useMemo(() => {
    if (distance === null) return 'Locating...';
    if (isInRange) return '📸 Ready to capture!';
    if (distance < 1000) return `${Math.round(distance)}m remaining`;
    return `${(distance / 1000).toFixed(1)}km remaining`;
  }, [distance, isInRange]);

  // Animated progress width
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        {/* Background Track */}
        <View style={styles.track} />

        {/* Animated Progress Bar */}
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressWidth,
              backgroundColor: getColorForDistance,
            },
          ]}
        />

        {/* User Icon (Left) */}
        <View style={styles.userIcon}>
          <View style={[styles.userDot, { backgroundColor: COLORS.primary }]} />
        </View>

        {/* Job Icon (Right) - with pulse when in range */}
        <Animated.View
          style={[
            styles.jobIcon,
            {
              transform: [{ scale: isInRange ? pulseAnim : 1 }],
            },
          ]}
        >
          <View style={[styles.jobDot, { backgroundColor: COLORS.warning }]}>
            <Text style={styles.jobEmoji}>€</Text>
          </View>
        </Animated.View>
      </View>

      {/* Distance Text */}
      <Text
        style={[
          styles.distanceText,
          {
            color: isInRange ? COLORS.success : COLORS.textPrimary,
            fontWeight: isInRange ? 'bold' : '600',
          },
        ]}
      >
        {distanceText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width * 0.9,
    marginBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  progressContainer: {
    width: '100%',
    height: 6,
    position: 'relative',
    marginBottom: 12,
  },
  track: {
    position: 'absolute',
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
  },
  progressBar: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
    // Shadow for glow effect
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  userIcon: {
    position: 'absolute',
    left: -6,
    top: -3,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#000',
    // Shadow for depth
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  jobIcon: {
    position: 'absolute',
    right: -6,
    top: -3,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for depth
    shadowColor: '#FFD60A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  jobEmoji: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000',
  },
  distanceText: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
});

export default React.memo(DistanceProgressBar);
