import React from 'react';

// Component that wraps other components to detect unexpected text nodes
const DebugTextNodeDetector = ({ children, componentName = 'Unknown' }) => {
  // Disabled excessive debug logging - false positives from valid React structures
  if (false && __DEV__) {
    const checkForUnexpectedTextNodes = (node, path = '') => {
      React.Children.forEach(node, (child, index) => {
        const currentPath = `${path}[${index}]`;
        
        if (typeof child === 'string' || typeof child === 'number') {
          // Log the problematic text node with minimal context
          console.warn(`[${componentName}] Text node should be wrapped in <Text>:`, {
            text: JSON.stringify(child),
            path: currentPath.substring(0, 50) + '...'
          });
        } else if (child && typeof child === 'object' && !React.isValidElement(child)) {
          // Log problematic objects that are not React elements
          console.error(`[${componentName}] UNEXPECTED OBJECT AS CHILD:`, {
            object: child,
            objectKeys: Object.keys(child),
            objectType: child.constructor?.name,
            path: currentPath,
            stackTrace: new Error().stack,
            parentComponent: componentName,
            childIndex: index
          });
        } else if (React.isValidElement(child)) {
          // Check if this is a View-like component that shouldn't have direct text children
          const componentType = child.type?.displayName || child.type?.name || child.type;
          const isViewLike = [
            'View', 'TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback',
            'Pressable', 'SafeAreaView', 'ScrollView', 'FlatList', 'SectionList'
          ].includes(componentType);
          
          if (isViewLike && child.props?.children) {
            React.Children.forEach(child.props.children, (grandChild, grandIndex) => {
              if (typeof grandChild === 'string' || typeof grandChild === 'number') {
                console.error(`[${componentName}] TEXT NODE IN VIEW-LIKE COMPONENT:`, {
                  text: JSON.stringify(grandChild),
                  viewComponent: componentType,
                  path: `${currentPath}.children[${grandIndex}]`,
                  stackTrace: new Error().stack,
                  parentComponent: componentName
                });
              }
            });
          }
          
          // Recursively check nested children
          if (child.props?.children) {
            checkForUnexpectedTextNodes(child.props.children, `${currentPath}.children`);
          }
        }
      });
    };
    
    checkForUnexpectedTextNodes(children);
  }
  
  return children;
};

export default DebugTextNodeDetector;
