import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Polygon, G } from 'react-native-svg';

const COLORS = {
  primary: '#00E5FF',
  background: '#0a0a0a',
  surface: '#1a1a1a',
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  error: '#FF3B30',
  success: '#30D158',
  warning: '#FFD60A',
  userBlue: '#4285F4',
  jobGold: '#FFD700',
};

/**
 * AlignmentMiniMap - SVG radar showing user position, job location, and camera cone
 * Helps users understand spatial alignment with the job target
 *
 * @param {number} bearing - Bearing angle to job (0-360)
 * @param {number} heading - Device orientation (0-360)
 * @param {number} distance - Distance to job in meters
 * @param {number} maxDistance - Maximum distance for scale (default 50m)
 * @param {number} size - Size of the component (default 100px)
 */
const AlignmentMiniMap = ({
  bearing = 0,
  heading = 0,
  distance = 0,
  maxDistance = 50,
  size = 100,
}) => {
  const AnimatedG = Animated.createAnimatedComponent(G);
  const coneRotation = useRef(new Animated.Value(0)).current;
  const previousHeading = useRef(0);

  // Sanitize inputs FIRST
  const safeBearing = parseFloat(bearing) || 0;
  const safeHeading = parseFloat(heading) || 0;
  const safeDistance = parseFloat(distance) || 0;
  const safeMaxDistance = parseFloat(maxDistance) || 50;
  const safeSize = parseFloat(size) || 100;

  // Calculate after sanitization
  const center = safeSize / 2;
  const maxRadius = safeSize * 0.4; // 40% of size for max job distance

  // Calculate job position on minimap
  const jobPosition = useMemo(() => {
    if (safeBearing === null || safeDistance === null) {
      return { x: center, y: center };
    }

    const angle = safeBearing * (Math.PI / 180); // Convert to radians
    const jobDistance = Math.min(safeDistance, safeMaxDistance); // Cap distance
    const radius = (jobDistance / safeMaxDistance) * maxRadius;

    // Calculate X, Y position (Y is inverted because SVG Y grows downward)
    const x = center + radius * Math.sin(angle);
    const y = center - radius * Math.cos(angle);

    return { x, y };
  }, [safeBearing, safeDistance, safeMaxDistance, safeSize]);

  // Smooth cone rotation animation
  useEffect(() => {
    if (safeHeading === null) return;

    // Handle 360/0 degree wraparound for smooth rotation
    let fromValue = previousHeading.current;
    let toValue = safeHeading;

    const diff = toValue - fromValue;
    if (diff > 180) {
      fromValue += 360;
    } else if (diff < -180) {
      toValue += 360;
    }

    coneRotation.setValue(fromValue);

    Animated.timing(coneRotation, {
      toValue: toValue,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      previousHeading.current = safeHeading;
    });
  }, [safeHeading]);

  // Calculate cone vertices (60-degree field of view)
  const getConePoints = () => {
    const coneAngle = 60; // Total cone angle in degrees
    const coneLength = maxRadius * 1.2; // Cone extends beyond max job radius

    // Calculate left and right points of the cone
    const leftAngle = -coneAngle / 2;
    const rightAngle = coneAngle / 2;

    const leftX = parseFloat(center + coneLength * Math.sin((leftAngle * Math.PI) / 180));
    const leftY = parseFloat(center - coneLength * Math.cos((leftAngle * Math.PI) / 180));

    const rightX = parseFloat(center + coneLength * Math.sin((rightAngle * Math.PI) / 180));
    const rightY = parseFloat(center - coneLength * Math.cos((rightAngle * Math.PI) / 180));

    // Return polygon points (center, left, right)
    return `${center},${center} ${leftX.toFixed(2)},${leftY.toFixed(2)} ${rightX.toFixed(2)},${rightY.toFixed(2)}`;
  };

  // Check if job is within the cone (aligned)
  const isJobInCone = useMemo(() => {
    if (safeBearing === null || safeHeading === null) return false;

    let diff = safeBearing - safeHeading;
    // Normalize to -180 to +180
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    return Math.abs(diff) <= 30; // 30 degrees (half of 60-degree cone)
  }, [safeBearing, safeHeading]);

  const coneColor = isJobInCone ? 'rgba(48, 209, 88, 0.25)' : 'rgba(0, 229, 255, 0.15)';

  // Ensure numeric values for rendering
  const safeRenderSize = parseFloat(safeSize) || 100;
  const safeRenderCenter = safeRenderSize / 2;

  return (
    <View style={[styles.container, { width: safeRenderSize, height: safeRenderSize }]}>
      <Svg width={safeRenderSize} height={safeRenderSize}>
        {/* Vision Cone (rotates with heading) */}
        <AnimatedG
          origin={`${safeRenderCenter}, ${safeRenderCenter}`}
          rotation={coneRotation}
        >
          <Polygon
            points={getConePoints()}
            fill={coneColor}
            stroke={isJobInCone ? COLORS.success : COLORS.primary}
            strokeWidth="1"
            strokeOpacity="0.5"
          />
        </AnimatedG>

        {/* User Position (center - always fixed) */}
        <Circle
          cx={parseFloat(center) || 50}
          cy={parseFloat(center) || 50}
          r="6"
          fill={COLORS.userBlue}
          stroke="#000"
          strokeWidth="2"
        />

        {/* Job Position (moves based on bearing/distance) */}
        <Circle
          cx={parseFloat(jobPosition.x) || 50}
          cy={parseFloat(jobPosition.y) || 50}
          r="5"
          fill={COLORS.jobGold}
          stroke={isJobInCone ? COLORS.success : '#000'}
          strokeWidth="2"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default React.memo(AlignmentMiniMap);
