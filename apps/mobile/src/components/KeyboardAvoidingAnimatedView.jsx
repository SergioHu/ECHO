import React, { useRef, useEffect } from 'react';
import { Platform, Keyboard, KeyboardAvoidingView } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const KeyboardAvoidingAnimatedView = (props, ref) => {
  const {
    children,
    behavior = Platform.OS === 'ios' ? 'padding' : 'height',
    keyboardVerticalOffset = 0,
    style,
    contentContainerStyle,
    enabled = true,
    onLayout,
    ...leftoverProps
  } = props;

  // Early return for web to avoid Reanimated initialization
  if (Platform.OS === 'web') {
    return (
      <KeyboardAvoidingView
        ref={ref}
        behavior={behavior}
        style={style}
        contentContainerStyle={contentContainerStyle}
        onLayout={onLayout}
        {...leftoverProps}
      >
        {children}
      </KeyboardAvoidingView>
    );
  }

  const animatedViewRef = useRef(null);
  const initialHeightRef = useRef(0);
  const bottomRef = useRef(0);
  const bottomHeight = useSharedValue(0);

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    const onKeyboardShow = (event) => {
      const { duration, endCoordinates } = event;
      const animatedView = animatedViewRef.current;

      if (!animatedView) return;

      let height = 0;
      const keyboardY = endCoordinates.screenY - keyboardVerticalOffset;
      height = Math.max(animatedView.y + animatedView.height - keyboardY, 0);

      bottomHeight.value = withTiming(height, {
        duration: duration > 10 ? duration : 300,
      });
      bottomRef.current = height;
    };

    const onKeyboardHide = () => {
      bottomHeight.value = withTiming(0, { duration: 300 });
      bottomRef.current = 0;
    };

    const showListener = Keyboard.addListener('keyboardWillShow', onKeyboardShow);
    const hideListener = Keyboard.addListener('keyboardWillHide', onKeyboardHide);

    return () => {
      showListener?.remove();
      hideListener?.remove();
    };
  }, [keyboardVerticalOffset, enabled, bottomHeight]);

  const animatedStyle = useAnimatedStyle(() => {
    if (behavior === 'height') {
      return {
        height: initialHeightRef.current - bottomHeight.value,
        flex: bottomHeight.value > 0 ? 0 : null,
      };
    }
    if (behavior === 'padding') {
      return {
        paddingBottom: bottomHeight.value,
      };
    }
    return {};
  });

  const positionAnimatedStyle = useAnimatedStyle(() => ({
    bottom: bottomHeight.value,
  }));

  const handleLayout = (event) => {
    const layout = event.nativeEvent.layout;
    animatedViewRef.current = layout;

    if (!initialHeightRef.current) {
      initialHeightRef.current = layout.height;
    }

    if (onLayout) {
      onLayout(event);
    }
  };

  const renderContent = () => {
    if (behavior === 'position') {
      return (
        <Animated.View
          style={[
            contentContainerStyle,
            positionAnimatedStyle,
          ]}
        >
          {children}
        </Animated.View>
      );
    }
    return children;
  };

  return (
    <Animated.View
      ref={ref}
      style={[style, animatedStyle]}
      onLayout={handleLayout}
      {...leftoverProps}
    >
      {renderContent()}
    </Animated.View>
  );
};

KeyboardAvoidingAnimatedView.displayName = 'KeyboardAvoidingAnimatedView';

export default KeyboardAvoidingAnimatedView;
