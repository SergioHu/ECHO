import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import EchoButton from '../components/EchoButton';

const PreviewScreen = ({ route, navigation }) => {
    const { photoUri } = route.params;

    return (
        <View style={styles.container}>
            <Image source={{ uri: photoUri }} style={styles.image} />

            <View style={styles.overlay}>
                <TouchableOpacity style={styles.retakeButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="close-circle" size={40} color={COLORS.textPrimary} />
                    <Text style={styles.retakeText}>Retake</Text>
                </TouchableOpacity>

                <EchoButton
                    title="SEND PHOTO"
                    onPress={() => navigation.navigate('PhotoViewer', { photoUri })}
                    style={styles.sendButton}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    image: {
        flex: 1,
        resizeMode: 'contain',
    },
    overlay: {
        position: 'absolute',
        bottom: 40,
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    retakeButton: {
        alignItems: 'center',
    },
    retakeText: {
        color: COLORS.textPrimary,
        marginTop: 5,
        ...FONTS.medium,
    },
    sendButton: {
        width: 160,
    },
});

export default PreviewScreen;
