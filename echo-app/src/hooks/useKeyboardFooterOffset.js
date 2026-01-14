import { useEffect, useRef } from 'react';
import { Keyboard, Animated, Platform } from 'react-native';

/**
 * Hook to handle footer offset when keyboard opens/closes.
 * Returns an Animated.Value that can be used with 'bottom' style.
 * 
 * @param {number} initialOffset - The base bottom offset (default 0)
 * @returns {Animated.Value} - The animated value for the bottom position
 */
export const useKeyboardFooterOffset = (initialOffset = 0) => {
    const safeInitialOffset = parseFloat(initialOffset) || 0;
    const footerOffset = useRef(new Animated.Value(safeInitialOffset)).current;

    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                const keyboardHeight = parseFloat(e.endCoordinates.height) || 0;
                const offset = parseFloat(initialOffset) || 0;
                Animated.timing(footerOffset, {
                    toValue: keyboardHeight + offset,
                    duration: 250, // Standard keyboard duration
                    useNativeDriver: false, // Layout property
                }).start();
            }
        );

        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (e) => {
                const offset = parseFloat(initialOffset) || 0;
                Animated.timing(footerOffset, {
                    toValue: offset,
                    duration: 250,
                    useNativeDriver: false,
                }).start();
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, [initialOffset]);

    return footerOffset;
};
