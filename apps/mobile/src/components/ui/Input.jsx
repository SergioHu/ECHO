import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity } from 'react-native';
import { AlertCircle, Eye, EyeOff } from 'lucide-react-native';

const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  helperText,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  keyboardType = 'default',
  secureTextEntry = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  containerStyle,
  variant = 'default', // 'default', 'outlined', 'filled'
  size = 'medium', // 'small', 'medium', 'large'
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const getVariantStyles = () => {
    const baseStyles = {
      borderRadius: 12,
      paddingHorizontal: 16,
    };

    switch (variant) {
      case 'outlined':
        return {
          ...baseStyles,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: error ? '#EF4444' : (isFocused ? '#3B82F6' : '#E5E7EB'),
        };
      case 'filled':
        return {
          ...baseStyles,
          backgroundColor: '#F3F4F6',
          borderWidth: 0,
        };
      default:
        return {
          ...baseStyles,
          backgroundColor: '#F9FAFB',
          borderWidth: 1,
          borderColor: error ? '#EF4444' : (isFocused ? '#3B82F6' : '#E5E7EB'),
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 8,
          fontSize: 14,
        };
      case 'large':
        return {
          paddingVertical: 16,
          fontSize: 18,
        };
      default: // medium
        return {
          paddingVertical: 12,
          fontSize: 16,
        };
    }
  };

  const inputStyles = [
    {
      flex: 1,
      color: disabled ? '#9CA3AF' : '#111827',
      ...getSizeStyles(),
    },
    multiline && {
      height: numberOfLines * 20 + 24, // Approximate height calculation
      textAlignVertical: 'top',
    },
    style,
  ];

  const containerStyles = [
    {
      flexDirection: 'row',
      alignItems: multiline ? 'flex-start' : 'center',
      ...getVariantStyles(),
    },
    disabled && { opacity: 0.6 },
    containerStyle,
  ];

  const showPasswordToggle = secureTextEntry && value && value.length > 0;
  const effectiveSecureTextEntry = secureTextEntry && !isPasswordVisible;

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: '#374151',
            marginBottom: 8,
          }}
        >
          {label}
          {props.required && <Text style={{ color: '#EF4444' }}> *</Text>}
        </Text>
      )}
      
      <View style={containerStyles}>
        {leftIcon && (
          <View style={{ marginRight: 12, marginTop: multiline ? 12 : 0 }}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          maxLength={maxLength}
          keyboardType={keyboardType}
          secureTextEntry={effectiveSecureTextEntry}
          style={inputStyles}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {showPasswordToggle && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={{ 
              marginLeft: 12, 
              marginTop: multiline ? 12 : 0,
              padding: 4,
            }}
          >
            {isPasswordVisible ? (
              <EyeOff size={20} color="#6B7280" />
            ) : (
              <Eye size={20} color="#6B7280" />
            )}
          </TouchableOpacity>
        )}
        
        {rightIcon && !showPasswordToggle && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={{ 
              marginLeft: 12, 
              marginTop: multiline ? 12 : 0,
              padding: 4,
            }}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      
      {maxLength && value && (
        <Text
          style={{
            fontSize: 12,
            color: '#6B7280',
            textAlign: 'right',
            marginTop: 4,
          }}
        >
          {value.length}/{maxLength}
        </Text>
      )}
      
      {error && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 6,
          }}
        >
          <AlertCircle size={16} color="#EF4444" />
          <Text
            style={{
              fontSize: 14,
              color: '#EF4444',
              marginLeft: 6,
              flex: 1,
            }}
          >
            {error}
          </Text>
        </View>
      )}
      
      {helperText && !error && (
        <Text
          style={{
            fontSize: 14,
            color: '#6B7280',
            marginTop: 6,
          }}
        >
          {helperText}
        </Text>
      )}
    </View>
  );
};

export default Input;
