import React from 'react';
import { View, Text } from 'react-native';
import { Search, MessageCircle, Plus, AlertCircle } from 'lucide-react-native';
import Button from './Button';

const EmptyState = ({
  title,
  description,
  icon: IconComponent,
  actionLabel,
  onAction,
  variant = 'default',
  style,
}) => {
  const getDefaultIcon = () => {
    switch (variant) {
      case 'search':
        return Search;
      case 'messages':
        return MessageCircle;
      case 'create':
        return Plus;
      case 'error':
        return AlertCircle;
      default:
        return Search;
    }
  };

  const DefaultIcon = IconComponent || getDefaultIcon();

  const getIconColor = () => {
    switch (variant) {
      case 'error':
        return '#EF4444';
      case 'create':
        return '#10B981';
      default:
        return '#9CA3AF';
    }
  };

  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: '#F3F4F6',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <DefaultIcon size={40} color={getIconColor()} />
      </View>

      <Text
        style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: '#111827',
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        {title}
      </Text>

      {description && (
        <Text
          style={{
            fontSize: 16,
            color: '#6B7280',
            textAlign: 'center',
            lineHeight: 24,
            marginBottom: actionLabel ? 32 : 0,
          }}
        >
          {description}
        </Text>
      )}

      {actionLabel && onAction && (
        <Button
          variant="primary"
          onPress={onAction}
          icon={variant === 'create' ? <Plus size={20} color="#FFFFFF" /> : null}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
};

export default EmptyState;
