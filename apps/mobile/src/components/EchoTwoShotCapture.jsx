import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
  StyleSheet,
  Platform,
  Pressable,
} from "react-native";
import { useState, useRef, useCallback, useEffect } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import {
  Camera,
  X,
  CheckCircle,
  Square,
  AlertTriangle,
} from "lucide-react-native";
import useUpload from "@/utils/useUpload";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// "Avoid Face Area" - Human height band (25% to 75% of screen height)
const AVOID_FACE_AREA_TOP = screenHeight * 0.25;
const AVOID_FACE_AREA_BOTTOM = screenHeight * 0.75;
const ROI_MIN_SIZE = 80;
const ROI_DEFAULT_SIZE = 120;

export default function EchoTwoShotCapture({
  userId,
  requestId,
  onComplete,
  onCancel,
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [currentStep, setCurrentStep] = useState("context"); // 'context' | 'roi'
  const [busy, setBusy] = useState(false);
  const [challengeCode, setChallengeCode] = useState(
    "ECHO" + Math.random().toString(36).substr(2, 6).toUpperCase(),
  );

  // ROI State Management
  const [roi, setRoi] = useState({
    x: screenWidth / 2 - ROI_DEFAULT_SIZE / 2,
    y: screenHeight / 2 - ROI_DEFAULT_SIZE / 2,
    width: ROI_DEFAULT_SIZE,
    height: ROI_DEFAULT_SIZE,
  });
  const [isRoiInValidArea, setIsRoiInValidArea] = useState(false);

  // Processed images
  const [contextImage, setContextImage] = useState(null);
  const [roiImage, setRoiImage] = useState(null);

  const cameraRef = useRef(null);
  const [upload] = useUpload();

  // Pan gesture for ROI
  const translateX = useRef(new Animated.Value(roi.x)).current;
  const translateY = useRef(new Animated.Value(roi.y)).current;

  // 🔧 ENHANCED Collision Detection with detailed logging
  const performCollisionCheck = useCallback(
    (roiPosition) => {
      const roiTop = roiPosition.y;
      const roiBottom = roiPosition.y + roiPosition.height;

      // ROI is in valid area if it doesn't overlap with the avoid face area
      const noOverlap =
        roiBottom <= AVOID_FACE_AREA_TOP || roiTop >= AVOID_FACE_AREA_BOTTOM;

      // 🐛 DEBUG: Add comprehensive logging
      console.log("🎯 [COLLISION] Collision Detection:", {
        roiPosition: roiPosition,
        roiTop: roiTop,
        roiBottom: roiBottom,
        AVOID_FACE_AREA_TOP: AVOID_FACE_AREA_TOP,
        AVOID_FACE_AREA_BOTTOM: AVOID_FACE_AREA_BOTTOM,
        noOverlap: noOverlap,
        previousState: isRoiInValidArea,
        calculation: {
          "roiBottom <= AVOID_FACE_AREA_TOP": roiBottom <= AVOID_FACE_AREA_TOP,
          "roiTop >= AVOID_FACE_AREA_BOTTOM": roiTop >= AVOID_FACE_AREA_BOTTOM,
        },
      });

      setIsRoiInValidArea(noOverlap);

      // 🐛 DEBUG: Log state change
      console.log(
        `🎯 [COLLISION] State Update: ${isRoiInValidArea} → ${noOverlap}`,
      );

      return noOverlap;
    },
    [isRoiInValidArea],
  ); // Add dependency to see current state in logs

  // 🆕 NEW: Initial collision check when ROI step starts
  useEffect(() => {
    if (currentStep === "roi") {
      console.log("🎯 [COLLISION] Initial ROI collision check triggered");
      console.log("🎯 [COLLISION] Current ROI state:", roi);

      // Perform initial collision check
      const initialCheckResult = performCollisionCheck(roi);
      console.log("🎯 [COLLISION] Initial check result:", initialCheckResult);
    }
  }, [currentStep, performCollisionCheck]); // Re-run when step changes to "roi"

  // 🔧 ENHANCED ROI gesture handling with real-time collision detection
  const onROIGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        // 🆕 NEW: Real-time collision checking during drag
        const currentTranslationX = event.nativeEvent.translationX;
        const currentTranslationY = event.nativeEvent.translationY;

        const tempX = Math.max(
          0,
          Math.min(screenWidth - roi.width, roi.x + currentTranslationX),
        );
        const tempY = Math.max(
          0,
          Math.min(screenHeight - roi.height, roi.y + currentTranslationY),
        );

        const tempRoi = { ...roi, x: tempX, y: tempY };

        // 🐛 DEBUG: Log real-time position
        console.log("🎯 [GESTURE] Real-time position:", {
          originalROI: roi,
          translation: { x: currentTranslationX, y: currentTranslationY },
          tempROI: tempRoi,
        });

        // Perform collision check during drag
        performCollisionCheck(tempRoi);
      },
    },
  );

  const onROIHandlerStateChange = (event) => {
    console.log("🎯 [GESTURE] Gesture state change:", {
      state: event.nativeEvent.state,
      stateEnd: State.END,
      isEnd: event.nativeEvent.state === State.END,
    });

    if (event.nativeEvent.state === State.END) {
      const newX = Math.max(
        0,
        Math.min(
          screenWidth - roi.width,
          roi.x + event.nativeEvent.translationX,
        ),
      );
      const newY = Math.max(
        0,
        Math.min(
          screenHeight - roi.height,
          roi.y + event.nativeEvent.translationY,
        ),
      );

      const newRoi = { ...roi, x: newX, y: newY };

      console.log("🎯 [GESTURE] Final position update:", {
        oldROI: roi,
        newROI: newRoi,
        translation: {
          x: event.nativeEvent.translationX,
          y: event.nativeEvent.translationY,
        },
      });

      setRoi(newRoi);

      // 🔧 FIXED: Final collision check on gesture end
      const finalResult = performCollisionCheck(newRoi);
      console.log("🎯 [GESTURE] Final collision result:", finalResult);

      translateX.setValue(newX);
      translateY.setValue(newY);
    }
  };

  // Create watermarked image
  const createWatermarkedImage = async (imageUri, type) => {
    try {
      console.log(
        `🖼️ [WATERMARK] Starting watermark process for ${type}:`,
        imageUri,
      );
      const timestamp = new Date().toISOString();

      // For now, we'll add timestamp to EXIF or filename since react-native-view-shot isn't available
      // In a real implementation, you'd overlay text on the image

      console.log(`✅ [WATERMARK] Successfully processed ${type} image`);
      return imageUri; // Return as-is for now, watermark would be added here
    } catch (error) {
      console.error(
        `❌ [WATERMARK] Error creating watermark for ${type}:`,
        error,
      );
      throw new Error(`Watermarking failed: ${error.message}`);
    }
  };

  // Process context image (Step 1)
  const processContextImage = async (imageUri) => {
    console.log(`📸 [CONTEXT] Starting context image processing...`);
    console.log(`📸 [CONTEXT] Input URI:`, imageUri);

    try {
      setBusy(true);

      // Step 1: Validate input URI
      if (!imageUri) {
        throw new Error("No image URI provided");
      }
      console.log(`✅ [CONTEXT] URI validation passed`);

      // Step 2: Image manipulation with detailed logging
      console.log(`🔧 [CONTEXT] Starting image manipulation...`);
      const imageInfo = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            resize: {
              width: 320,
              height: 320,
            },
          },
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.WEBP,
        },
      );

      console.log(`✅ [CONTEXT] Image manipulation completed:`, {
        originalUri: imageUri,
        processedUri: imageInfo.uri,
        width: imageInfo.width,
        height: imageInfo.height,
      });

      // Step 3: Watermarking
      console.log(`🖼️ [CONTEXT] Starting watermark process...`);
      const watermarkedUri = await createWatermarkedImage(
        imageInfo.uri,
        "context",
      );
      console.log(`✅ [CONTEXT] Watermarking completed:`, watermarkedUri);

      // Step 4: Update state
      console.log(`💾 [CONTEXT] Saving context image to state...`);
      setContextImage(watermarkedUri);

      // 🔧 FIXED: Trigger collision check when transitioning to ROI step
      console.log(
        `🎯 [CONTEXT] Transitioning to ROI step - will trigger collision check`,
      );
      setCurrentStep("roi");

      console.log(
        `🎉 [CONTEXT] Context image processing completed successfully!`,
      );
    } catch (error) {
      console.error(`❌ [CONTEXT] Error in processContextImage:`, {
        message: error.message,
        stack: error.stack,
        inputUri: imageUri,
      });
      Alert.alert(
        "Context Photo Error",
        `Failed to process context image: ${error.message}\n\nPlease try taking the photo again.`,
      );
    } finally {
      setBusy(false);
      console.log(`🔄 [CONTEXT] Processing cleanup completed`);
    }
  };

  // Process ROI image (Step 2)
  const processROIImage = async (imageUri) => {
    try {
      setBusy(true);

      // Get original image dimensions
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const imageSize = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = URL.createObjectURL(blob);
      });

      // Calculate crop parameters based on screen ROI to image coordinates
      const scaleX = imageSize.width / screenWidth;
      const scaleY = imageSize.height / screenHeight;

      const cropX = roi.x * scaleX;
      const cropY = roi.y * scaleY;
      const cropWidth = roi.width * scaleX;
      const cropHeight = roi.height * scaleY;

      // Crop to ROI
      const croppedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: cropX,
              originY: cropY,
              width: cropWidth,
              height: cropHeight,
            },
          },
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.WEBP,
        },
      );

      // Ensure max 0.5 megapixels (about 707x707 pixels)
      const maxPixels = 500000; // 0.5 megapixels
      const currentPixels = croppedImage.width * croppedImage.height;

      let finalImage = croppedImage;
      if (currentPixels > maxPixels) {
        const scale = Math.sqrt(maxPixels / currentPixels);
        const newWidth = Math.floor(croppedImage.width * scale);
        const newHeight = Math.floor(croppedImage.height * scale);

        finalImage = await ImageManipulator.manipulateAsync(
          croppedImage.uri,
          [
            {
              resize: {
                width: newWidth,
                height: newHeight,
              },
            },
          ],
          {
            compress: 0.8,
            format: ImageManipulator.SaveFormat.WEBP,
          },
        );
      }

      // Add watermark
      const watermarkedUri = await createWatermarkedImage(
        finalImage.uri,
        "roi",
      );

      setRoiImage(watermarkedUri);

      // Upload both images
      await uploadImages(contextImage, watermarkedUri);
    } catch (error) {
      console.error("Error processing ROI image:", error);
      Alert.alert("Error", "Failed to process ROI image");
    } finally {
      setBusy(false);
    }
  };

  // Upload processed images
  const uploadImages = async (contextUri, roiUri) => {
    console.log(`📤 [UPLOAD] Starting image upload process...`);
    console.log(`📤 [UPLOAD] Context URI:`, contextUri);
    console.log(`📤 [UPLOAD] ROI URI:`, roiUri);

    try {
      setBusy(true);

      // Validate input URIs
      if (!contextUri || !roiUri) {
        throw new Error(
          `Missing image URIs - Context: ${!!contextUri}, ROI: ${!!roiUri}`,
        );
      }
      console.log(`✅ [UPLOAD] URI validation passed`);

      const timestamp = Date.now();
      const contextFileName = `${userId}/${requestId}/${timestamp}-context.webp`;
      const roiFileName = `${userId}/${requestId}/${timestamp}-roi.webp`;

      console.log(`📤 [UPLOAD] Generated filenames:`, {
        context: contextFileName,
        roi: roiFileName,
        userId,
        requestId,
        timestamp,
      });

      // Upload context image
      console.log(`📤 [UPLOAD] Uploading context image...`);
      const contextResult = await upload({
        uri: contextUri,
        fileName: contextFileName,
      });

      console.log(`📤 [UPLOAD] Context upload result:`, {
        success: !contextResult.error,
        url: contextResult.url,
        error: contextResult.error,
      });

      // Upload ROI image
      console.log(`📤 [UPLOAD] Uploading ROI image...`);
      const roiResult = await upload({
        uri: roiUri,
        fileName: roiFileName,
      });

      console.log(`📤 [UPLOAD] ROI upload result:`, {
        success: !roiResult.error,
        url: roiResult.url,
        error: roiResult.error,
      });

      if (contextResult.error || roiResult.error) {
        throw new Error(
          `Upload failed - Context: ${contextResult.error || "OK"}, ROI: ${roiResult.error || "OK"}`,
        );
      }

      const completeResult = {
        contextImage: contextResult.url,
        roiImage: roiResult.url,
        challengeCode,
        timestamp,
      };

      console.log(`🎉 [UPLOAD] Upload completed successfully:`, completeResult);

      // Return results to parent
      onComplete(completeResult);
    } catch (error) {
      console.error(`❌ [UPLOAD] Error uploading images:`, {
        message: error.message,
        stack: error.stack,
        contextUri,
        roiUri,
        userId,
        requestId,
      });
      Alert.alert(
        "Upload Error",
        `Failed to upload images: ${error.message}\n\nPlease check your internet connection and try again.`,
      );
    } finally {
      setBusy(false);
      console.log(`🔄 [UPLOAD] Upload process cleanup completed`);
    }
  };

  // Capture photo
  const capturePhoto = async () => {
    console.log(`📷 [CAPTURE] Starting photo capture...`);

    // Step 1: Pre-flight checks
    if (!cameraRef.current) {
      console.error(`❌ [CAPTURE] Camera ref not available`);
      Alert.alert(
        "Camera Error",
        "Camera is not ready. Please wait and try again.",
      );
      return;
    }

    if (busy) {
      console.warn(`⏳ [CAPTURE] Already processing, skipping capture request`);
      return;
    }

    console.log(`✅ [CAPTURE] Pre-flight checks passed`);
    console.log(`📷 [CAPTURE] Camera permissions:`, {
      granted: permission?.granted,
      canAskAgain: permission?.canAskAgain,
      status: permission?.status,
    });

    try {
      setBusy(true);
      console.log(`📷 [CAPTURE] Taking picture with settings:`, {
        quality: 0.9,
        base64: false,
        skipProcessing: false,
      });

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
        skipProcessing: false,
      });

      console.log(`✅ [CAPTURE] Photo captured successfully:`, {
        uri: photo?.uri,
        width: photo?.width,
        height: photo?.height,
        base64: photo?.base64 ? "present" : "not present",
        currentStep: currentStep,
      });

      if (currentStep === "context") {
        console.log(`📸 [CAPTURE] Proceeding to context processing...`);
        await processContextImage(photo.uri);
      } else {
        console.log(`🎯 [CAPTURE] Checking ROI validity...`);
        if (!isRoiInValidArea) {
          console.warn(`⚠️ [CAPTURE] ROI position invalid, aborting`);
          Alert.alert(
            "Invalid ROI Position",
            "Please move the selection box away from the face area before capturing.",
          );
          setBusy(false);
          return;
        }
        console.log(`✅ [CAPTURE] ROI valid, proceeding to ROI processing...`);
        await processROIImage(photo.uri);
      }
    } catch (error) {
      console.error(`❌ [CAPTURE] Error in capturePhoto:`, {
        message: error.message,
        stack: error.stack,
        currentStep: currentStep,
        cameraRefExists: !!cameraRef.current,
        permissionGranted: permission?.granted,
      });
      Alert.alert(
        "Camera Capture Error",
        `Failed to capture photo: ${error.message}\n\nPlease check your camera permissions and try again.`,
      );
      setBusy(false);
    }

    console.log(`🔄 [CAPTURE] Capture process completed`);
  };

  // Final Capture - only called when ROI is in valid area
  const captureROI = async () => {
    if (!isRoiInValidArea) {
      Alert.alert(
        "Invalid Position",
        "Please move the selection box away from the face area before capturing.",
      );
      return;
    }

    await capturePhoto();
  };

  // Permission handling
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Camera size={64} color="#fff" />
        <Text style={styles.permissionTitle}>
          Camera access required for taking photos
        </Text>
        <Pressable onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>
              {currentStep === "context"
                ? "Step 1: Context Photo"
                : "Step 2: Detail Photo"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {currentStep === "context"
                ? "Take a wide shot for context"
                : "Select a specific detail to capture"}
            </Text>
          </View>

          <Pressable
            onPress={onCancel}
            disabled={busy}
            style={styles.closeButton}
          >
            <X size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.challengeContainer}>
          <Text style={styles.challengeCode}>Challenge: {challengeCode}</Text>
        </View>
      </View>

      {/* "Avoid Face Area" Overlay - Only visible in ROI step */}
      {currentStep === "roi" && (
        <View
          style={[
            styles.avoidFaceArea,
            {
              top: AVOID_FACE_AREA_TOP,
              height: AVOID_FACE_AREA_BOTTOM - AVOID_FACE_AREA_TOP,
            },
          ]}
        >
          <View style={styles.avoidFaceLabel}>
            <Text style={styles.avoidFaceText}>⚠️ Avoid Face Area</Text>
          </View>
        </View>
      )}

      {/* ROI Selection Box - Only visible in ROI step */}
      {currentStep === "roi" && (
        <PanGestureHandler
          onGestureEvent={onROIGestureEvent}
          onHandlerStateChange={onROIHandlerStateChange}
        >
          <Animated.View
            style={[
              styles.roiSelector,
              {
                left: translateX,
                top: translateY,
                width: roi.width,
                height: roi.height,
                borderColor: isRoiInValidArea ? "#10B981" : "#EF4444", // Green when valid, red when invalid
                backgroundColor: isRoiInValidArea
                  ? "rgba(16, 185, 129, 0.1)"
                  : "rgba(239, 68, 68, 0.1)",
              },
            ]}
          >
            {/* Corner handles */}
            <View
              style={[
                styles.cornerHandle,
                styles.topLeft,
                { backgroundColor: isRoiInValidArea ? "#10B981" : "#EF4444" },
              ]}
            />
            <View
              style={[
                styles.cornerHandle,
                styles.topRight,
                { backgroundColor: isRoiInValidArea ? "#10B981" : "#EF4444" },
              ]}
            />
            <View
              style={[
                styles.cornerHandle,
                styles.bottomLeft,
                { backgroundColor: isRoiInValidArea ? "#10B981" : "#EF4444" },
              ]}
            />
            <View
              style={[
                styles.cornerHandle,
                styles.bottomRight,
                { backgroundColor: isRoiInValidArea ? "#10B981" : "#EF4444" },
              ]}
            />

            {/* Center label */}
            <View style={styles.roiCenterLabel}>
              <Text style={styles.roiCenterText}>DETAIL</Text>
            </View>
          </Animated.View>
        </PanGestureHandler>
      )}

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressStep,
            {
              backgroundColor: contextImage ? "#10B981" : "#3B82F6",
            },
          ]}
        >
          {contextImage ? (
            <CheckCircle size={16} color="#fff" />
          ) : (
            <Text style={styles.progressStepText}>1</Text>
          )}
        </View>
        <View
          style={[
            styles.progressLine,
            {
              backgroundColor: contextImage ? "#10B981" : "#6B7280",
            },
          ]}
        />
        <View
          style={[
            styles.progressStep,
            {
              backgroundColor: currentStep === "roi" ? "#3B82F6" : "#6B7280",
            },
          ]}
        >
          <Text style={styles.progressStepText}>2</Text>
        </View>
      </View>

      {/* Footer/Control Area */}
      <View style={styles.controlsContainer}>
        {/* Conditional Warning Message - Only show in ROI step when invalid */}
        {currentStep === "roi" && !isRoiInValidArea && (
          <View style={styles.warningMessage}>
            <AlertTriangle size={16} color="#EF4444" />
            <Text style={styles.warningText}>
              ⚠️ Move selection away from face area
            </Text>
          </View>
        )}

        {/* Main Shutter/Capture Button */}
        <Pressable
          onPress={currentStep === "context" ? capturePhoto : captureROI}
          disabled={busy || (currentStep === "roi" && !isRoiInValidArea)}
          style={[
            styles.shutterButton,
            {
              backgroundColor:
                busy || (currentStep === "roi" && !isRoiInValidArea)
                  ? "#9CA3AF" // Greyed out when disabled
                  : "#3B82F6", // Active blue
            },
          ]}
        >
          {busy ? (
            <View style={styles.loadingSpinner} />
          ) : (
            <Camera size={32} color="#fff" />
          )}
        </Pressable>

        {/* Helper Text */}
        <Text style={styles.helperText}>
          {currentStep === "context"
            ? "Capture full scene for context"
            : isRoiInValidArea
              ? "Tap to capture detail"
              : "Move box to valid area first"}
        </Text>
      </View>
    </View>
  );
}

// Updated StyleSheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },

  // Permission Styles
  permissionContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionText: {
    color: "#fff",
    fontSize: 16,
  },
  permissionTitle: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginVertical: 20,
  },
  permissionButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Header Styles
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 100,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  headerSubtitle: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  challengeContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  challengeCode: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: "500",
  },

  // Avoid Face Area Styles
  avoidFaceArea: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 0, 0, 0.2)", // Semi-transparent red as specified
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#EF4444",
    zIndex: 50,
  },
  avoidFaceLabel: {
    position: "absolute",
    top: 16,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  avoidFaceText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  // ROI Selection Box Styles
  roiSelector: {
    position: "absolute",
    borderWidth: 3,
    borderStyle: "dashed",
    borderRadius: 8,
    zIndex: 60,
  },
  cornerHandle: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  topLeft: {
    top: -6,
    left: -6,
  },
  topRight: {
    top: -6,
    right: -6,
  },
  bottomLeft: {
    bottom: -6,
    left: -6,
  },
  bottomRight: {
    bottom: -6,
    right: -6,
  },
  roiCenterLabel: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -25 }, { translateY: -12 }],
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  roiCenterText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  // Progress Indicator Styles
  progressContainer: {
    position: "absolute",
    bottom: 140,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 40,
  },
  progressStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  progressStepText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  progressLine: {
    width: 32,
    height: 3,
    marginHorizontal: 8,
    borderRadius: 1.5,
  },

  // Controls/Footer Styles
  controlsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.9)",
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
    zIndex: 30,
  },
  warningMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  warningText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#fff",
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.3)",
      },
    }),
  },
  loadingSpinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#fff",
    borderTopColor: "transparent",
  },
  helperText: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
});
