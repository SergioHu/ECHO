import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

const LoadingSpinner = ({
  size = 'large',
  color = '#3B82F6',
  text,
  style,
  overlay = false,
  fullScreen = false,
}) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return 'small';
      case 'large':
        return 'large';
      default:
        return size;
    }
  };

  const containerStyle = [
    {
      alignItems: 'center',
      justifyContent: 'center',
      ...(fullScreen && {
        flex: 1,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: overlay ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
        zIndex: 1000,
      }),
      ...(overlay && !fullScreen && {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 10,
      }),
    },
    style,
  ];

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={getSize()} color={color} />
      {text && (
        <Text
          style={{
            marginTop: 12,
            fontSize: 16,
            color: '#6B7280',
            textAlign: 'center',
          }}
        >
          {text}
        </Text>
      )}
    </View>
  );
};

export default LoadingSpinner;
