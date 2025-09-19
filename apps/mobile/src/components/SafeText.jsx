import React from 'react';
import { Text } from 'react-native';

/**
 * SafeText component that ensures text content is properly wrapped in Text components
 * Prevents "Unexpected text node" errors on React Native Web
 */
const SafeText = ({ children, style, ...props }) => {
  // If children is already a React element, return as is
  if (React.isValidElement(children)) {
    return children;
  }

  // If children is null, undefined, empty string, or just whitespace, return null
  if (!children || (typeof children === 'string' && !children.trim())) {
    return null;
  }

  // Wrap non-element children in Text component
  return (
    <Text style={style} {...props}>
      {children}
    </Text>
  );
};

export default SafeText;
