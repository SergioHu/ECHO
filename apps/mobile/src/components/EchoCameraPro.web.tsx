import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface EchoCameraProProps {
  userId: string;
  requestId: string;
  onComplete: (result: {
    imageUrl: string;
    localUri: string;
    challengeCode: string;
    timestamp: number;
  }) => void;
  onCancel: () => void;
}

// This is a web stub - VisionCamera is not supported on web
export default function EchoCameraPro(props: EchoCameraProProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>VisionCamera is not supported on web</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
});