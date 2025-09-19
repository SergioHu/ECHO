import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useSkiaFrameProcessor,
  useFaceDetector,
} from 'react-native-vision-camera';
import { Skia, PaintStyle } from '@shopify/react-native-skia';

export default function TestFaceDetection() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const [faceCount, setFaceCount] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  
  // Simple face detector
  const { detectFaces } = useFaceDetector({
    performanceMode: 'fast',
    contourMode: 'all',
    landmarkMode: 'all',
    classificationMode: 'all',
    trackingEnabled: true,
    minFaceSize: 0.1,
  });
  
  const paint = React.useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color('#00ff00'));
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(5);
    return p;
  }, []);
  
  const frameProcessor = useSkiaFrameProcessor(
    (frame) => {
      'worklet';
      
      // Render the camera frame
      frame.render();
      
      try {
        // Detect faces
        const { faces } = detectFaces(frame);
        
        // Update face count (every 30 frames)
        const currentFrame = frameCount + 1;
        if (currentFrame % 30 === 0) {
          console.log(`[TestFaceDetection] Frame ${currentFrame}: ${faces.length} faces detected`);
          if (faces.length > 0) {
            console.log('[TestFaceDetection] First face:', faces[0].bounds);
          }
        }
        
        // Draw green rectangles around detected faces
        for (const face of faces) {
          if (face.bounds) {
            const rect = Skia.XYWHRect(
              face.bounds.x,
              face.bounds.y,
              face.bounds.width,
              face.bounds.height
            );
            frame.drawRect(rect, paint);
          }
        }
        
      } catch (error) {
        console.error('[TestFaceDetection] Error:', error);
      }
    },
    [detectFaces, paint, frameCount]
  );
  
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);
  
  if (!hasPermission || !device) {
    return (
      <View style={styles.container}>
        <Text>No camera permission or device</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />
      <View style={styles.info}>
        <Text style={styles.infoText}>Test Face Detection</Text>
        <Text style={styles.infoText}>Green boxes = detected faces</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  info: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 10,
  },
  infoText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
});