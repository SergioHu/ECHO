import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

const Button = ({
  variant = 'primary',
  size = 'medium',
  children,
  title, // Support both title and children props
  onPress,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? '#9CA3AF' : '#3B82F6',
          borderColor: disabled ? '#9CA3AF' : '#3B82F6',
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          borderColor: '#3B82F6',
          borderWidth: 1,
        };
      case 'danger':
        return {
          backgroundColor: disabled ? '#9CA3AF' : '#EF4444',
          borderColor: disabled ? '#9CA3AF' : '#EF4444',
        };
      case 'success':
        return {
          backgroundColor: disabled ? '#9CA3AF' : '#10B981',
          borderColor: disabled ? '#9CA3AF' : '#10B981',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
      default:
        return {
          backgroundColor: disabled ? '#9CA3AF' : '#3B82F6',
          borderColor: disabled ? '#9CA3AF' : '#3B82F6',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderRadius: 8,
        };
      case 'large':
        return {
          paddingVertical: 16,
          paddingHorizontal: 24,
          borderRadius: 12,
        };
      default: // medium
        return {
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 10,
        };
    }
  };

  const getTextColor = () => {
    if (variant === 'secondary' || variant === 'ghost') {
      return disabled ? '#9CA3AF' : '#3B82F6';
    }
    return disabled ? '#6B7280' : '#FFFFFF';
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  const buttonStyles = [
    {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      ...getVariantStyles(),
      ...getSizeStyles(),
    },
    fullWidth && { alignSelf: 'stretch' },
    style,
  ];

  const textStyles = [
    {
      color: getTextColor(),
      fontSize: getTextSize(),
      fontWeight: '600',
    },
    textStyle,
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ActivityIndicator 
            size="small" 
            color={getTextColor()} 
            style={{ marginRight: 8 }}
          />
          <Text style={textStyles}>Loading...</Text>
        </View>
      );
    }

    const content = [];
    
    if (icon && iconPosition === 'left') {
      content.push(
        <View key="icon-left" style={{ marginRight: 8 }}>
          {icon}
        </View>
      );
    }

    // Use title prop if provided, otherwise use children
    const text = title || children;
    
    if (typeof text === 'string') {
      content.push(
        <Text key="text" style={textStyles}>
          {text}
        </Text>
      );
    } else if (text) {
      // Only push non-string children if they exist
      if (React.isValidElement(text)) {
        content.push(text);
      } else if (__DEV__) {
        console.warn('[Button] Non-string, non-React element provided:', text);
      }
    }

    if (icon && iconPosition === 'right') {
      content.push(
        <View key="icon-right" style={{ marginLeft: 8 }}>
          {icon}
        </View>
      );
    }

    return content;
  };

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {renderContent()}
      </View>
    </TouchableOpacity>
  );
};

export default Button;
