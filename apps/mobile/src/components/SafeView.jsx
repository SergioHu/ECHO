import React from 'react';
import { View, Text } from 'react-native';

/**
 * SafeView component that filters out problematic children and wraps text in Text components
 * Prevents "Unexpected text node" errors on React Native Web
 */
const SafeView = ({ children, style, ...props }) => {
  const processChildren = (children) => {
    return React.Children.map(children, (child, index) => {
      // Skip null, undefined, false, empty strings
      if (!child && child !== 0) {
        return null;
      }

      // If child is a string or number, wrap it in Text
      if (typeof child === 'string' || typeof child === 'number') {
        // Skip empty strings and whitespace-only strings
        if (typeof child === 'string' && !child.trim()) {
          return null;
        }
        
        if (__DEV__) {
          console.warn('[SafeView] Automatically wrapping text node in Text component:', {
            text: JSON.stringify(child),
            index,
            stackTrace: new Error().stack
          });
        }
        
        return (
          <Text key={index} style={{ color: '#111827' }}>
            {child}
          </Text>
        );
      }

      // Return React elements as-is
      return child;
    });
  };

  const safeChildren = processChildren(children);

  return (
    <View style={style} {...props}>
      {safeChildren}
    </View>
  );
};

export default SafeView;
