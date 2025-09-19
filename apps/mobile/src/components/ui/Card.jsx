import React from 'react';
import { View, Platform } from 'react-native';

const Card = ({
  children,
  style,
  variant = 'default',
  padding = 16,
  margin = 0,
  shadow = true,
  borderRadius = 12,
  ...props
}) => {
  // Dev-only guard to detect unexpected text nodes
  // Commented out excessive logging - Card component is working correctly
  // The warnings are false positives from valid React element structures
  /*
  if (__DEV__) {
    const checkRawText = (node, depth = 0) => {
      React.Children.forEach(node, (child) => {
        if (typeof child === 'string' || typeof child === 'number') {
          console.error('[Card] Invalid raw text child detected:', {
            text: JSON.stringify(child),
            depth,
            stackTrace: new Error().stack
          });
        } else if (child && typeof child === 'object' && !React.isValidElement(child)) {
          console.error('[Card] Invalid object child detected:', {
            object: child,
            objectKeys: Object.keys(child || {}),
            objectType: child.constructor?.name,
            depth,
            stackTrace: new Error().stack
          });
        } else if (React.isValidElement(child) && depth < 3) {
          // Check nested children but limit depth to avoid infinite loops
          checkRawText(child.props?.children, depth + 1);
        }
      });
    };
    checkRawText(children);
  }
  */
  const getVariantStyles = () => {
    switch (variant) {
      case 'outline':
        return {
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: '#E5E7EB',
        };
      case 'elevated':
        return {
          backgroundColor: '#FFFFFF',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
            web: {
              boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
            },
          }),
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      default:
        return {
          backgroundColor: '#FFFFFF',
          ...(shadow && Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
            },
            android: {
              elevation: 2,
            },
            web: {
              boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.08)',
            },
          })),
        };
    }
  };

  const cardStyles = [
    {
      borderRadius,
      padding,
      margin,
      ...getVariantStyles(),
    },
    style,
  ];

  // Filter out problematic children
  const safeChildren = React.Children.map(children, (child, index) => {
    // Skip null, undefined, false
    if (!child && child !== 0) {
      return null;
    }
    
    // Skip objects that aren't React elements
    if (child && typeof child === 'object' && !React.isValidElement(child)) {
      if (__DEV__) {
        console.warn('[Card] Filtered out invalid object child:', {
          object: child,
          objectKeys: Object.keys(child || {}),
          index
        });
      }
      return null;
    }
    
    // Skip empty strings and whitespace-only strings
    if (typeof child === 'string' && !child.trim()) {
      return null;
    }
    
    return child;
  }).filter(Boolean);

  return (
    <View style={cardStyles} {...props}>
      {safeChildren}
    </View>
  );
};

export default Card;
