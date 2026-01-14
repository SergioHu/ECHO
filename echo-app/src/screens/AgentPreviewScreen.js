import React, { useState } from 'react';
import { View, ImageBackground, StyleSheet, TouchableOpacity, Text, TextInput, Platform, Keyboard, TouchableWithoutFeedback, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import EchoButton from '../components/EchoButton';
import { EchoModal } from '../components/EchoModal';
import { useKeyboardFooterOffset } from '../hooks/useKeyboardFooterOffset';

const AgentPreviewScreen = ({ route, navigation }) => {
    const { photoUri } = route.params;
    const [comment, setComment] = useState('');
    const [successModalVisible, setSuccessModalVisible] = useState(false);

    // Custom hook for keyboard offset
    const footerOffset = useKeyboardFooterOffset(0);

    const handleRetake = () => {
        navigation.goBack();
    };

    const handleSendNow = () => {
        setSuccessModalVisible(true);
    };

    return (
        <View style={styles.container}>
            <ImageBackground source={{ uri: photoUri }} style={styles.backgroundImage}>
                <SafeAreaView style={styles.safeArea}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.contentContainer}>

                            {/* Top Left Close Button */}
                            <TouchableOpacity style={styles.closeButton} onPress={handleRetake}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>

                            {/* Bottom Input Section */}
                            <Animated.View
                                style={[
                                    styles.bottomSection,
                                    { bottom: footerOffset }
                                ]}
                            >
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Add a note..."
                                        placeholderTextColor="rgba(255, 255, 255, 0.6)"
                                        value={comment}
                                        onChangeText={setComment}
                                        multiline
                                        maxLength={100}
                                    />
                                </View>

                                <EchoButton
                                    title="SEND NOW"
                                    onPress={handleSendNow}
                                    style={styles.sendButton}
                                />
                            </Animated.View>

                        </View>
                    </TouchableWithoutFeedback>
                </SafeAreaView>
            </ImageBackground>

            <EchoModal
                visible={successModalVisible}
                type="success"
                title="MISSION COMPLETE"
                message="Encrypted data packet sent. Funds (€0.40) will be released upon requester verification."
                primaryActionText="ACKNOWLEDGE"
                onPrimaryAction={() => {
                    setSuccessModalVisible(false);
                    navigation.navigate('MainTabs', { screen: 'Radar' });
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        padding: SPACING.m,
    },
    closeButton: {
        position: 'absolute',
        top: SPACING.m,
        left: SPACING.m,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    bottomSection: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.m,
        flexDirection: 'row',
        alignItems: 'center', // Center vertically
        gap: SPACING.s,
        // Remove marginBottom as we use padding in parent or absolute positioning
    },
    inputContainer: {
        flex: 1,
        backgroundColor: 'rgba(20, 20, 20, 0.85)',
        borderRadius: 25, // More rounded to match button
        paddingHorizontal: SPACING.m,
        height: 50, // Fixed height to match button
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    input: {
        color: 'white',
        fontSize: 16,
        ...FONTS.regular,
        paddingTop: 0, // Remove default padding
        paddingBottom: 0,
    },
    sendButton: {
        width: 120,
        height: 50,
        borderRadius: 25, // Match input radius
        marginBottom: 0,
    },
});

export default AgentPreviewScreen;
