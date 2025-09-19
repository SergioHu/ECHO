import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, router } from "expo-router";
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Camera,
  MessageCircle,
  Send,
  Clock,
  CheckCircle2,
  Navigation,
  AlertTriangle,
  Shield,
} from "lucide-react-native";
import * as Location from "expo-location";
import EchoCameraUnified from "@/components/EchoCameraUnified";
import EchoCameraWeb from "@/components/camera/EchoCameraWeb";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

export default function RespondScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [response, setResponse] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [cameraResult, setCameraResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [testingMode, setTestingMode] = useState(false);

  // Location verification state
  const [locationStatus, setLocationStatus] = useState("checking"); // 'checking', 'verified', 'too_far', 'error'
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Mock question data - in real app, fetch based on id
  const question = {
    id: id,
    question:
      "Is the coffee shop on Main Street currently open? I need to know if they have seating available.",
    location: "123 Main Street, Downtown",
    coordinates: {
      // FOR TESTING: Updated to Amadora, Portugal coordinates for testing
      latitude: 38.7555, // Amadora, Portugal
      longitude: -9.2337,
    },
    reward: 2.5,
    postedAt: "2 hours ago",
    userId: "user123",
  };

  // Calculate distance between two coordinates in meters
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const ?1 = (lat1 * Math.PI) / 180;
    const ?2 = (lat2 * Math.PI) / 180;
    const ?? = ((lat2 - lat1) * Math.PI) / 180;
    const ?? = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(?? / 2) * Math.sin(?? / 2) +
      Math.cos(?1) * Math.cos(?2) * Math.sin(?? / 2) * Math.sin(?? / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Verify user location
  const verifyLocation = useCallback(async () => {
    try {
      setGettingLocation(true);
      setLocationError(null);
      setLocationStatus("checking");

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        const message =
          Platform.OS === "web"
            ? "Allow location access in your browser settings or enable Testing Mode to continue without verification."
            : "We need your location to verify you're at the question location.";
        setLocationError(message);
        setLocationStatus("error");
        Alert.alert("Location Required", message);
        return;
      }

      // Get current location
      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
        maximumAge: 60000,
      });

      const userLat = locationData.coords.latitude;
      const userLon = locationData.coords.longitude;
      const questionLat = question.coordinates.latitude;
      const questionLon = question.coordinates.longitude;

      // Calculate distance
      const distanceInMeters = calculateDistance(
        userLat,
        userLon,
        questionLat,
        questionLon,
      );
      setDistance(Math.round(distanceInMeters));
      setCurrentLocation({
        latitude: userLat,
        longitude: userLon,
      });

      // Check if user is within acceptable range (200 meters)
      const maxDistance = 200;
      if (distanceInMeters <= maxDistance) {
        setLocationStatus("verified");
      } else {
        setLocationStatus("too_far");
      }
    } catch (error) {
      console.error("Error verifying location:", error);
      let message = "Could not verify your location. Please check your GPS and try again.";
      if (error?.code === 1) {
        message = "Location permission was denied. Enable access in your device or browser settings, or turn on Testing Mode.";
      } else if (error?.code === 2) {
        message = "We couldn't determine your position. Try moving to an open area or toggling airplane mode.";
      } else if (error?.code === 3) {
        message = "Location request timed out. Please try again.";
      } else if (Platform.OS === "web" && typeof error?.message === "string" && error.message.toLowerCase().includes("secure")) {
        message = "The browser blocked location services on this connection. Use https:// or enable Testing Mode for manual capture.";
      }
      setLocationError(message);
      setLocationStatus("error");
      Alert.alert("Location Error", message);
    } finally {
      setGettingLocation(false);
    }
  }, [question.coordinates]);

  // Verify location on mount
  useEffect(() => {
    verifyLocation();
  }, []); // Remove verifyLocation from dependency array to prevent infinite loop

  const handleStartCamera = () => {
    console.log("Camera button pressed:", {
      locationStatus,
      testingMode,
      disabled: locationStatus !== "verified" && !testingMode,
      shouldEnable: locationStatus === "verified" || testingMode,
      existingCameraResult: cameraResult, // Log existing result
    });

    if (locationStatus !== "verified" && !testingMode) {
      Alert.alert(
        "Location Required",
        locationStatus === "too_far"
          ? `You are ${distance || 0}m away from the question location. You need to be within 200m to respond.`
          : "Please verify your location first.",
      );
      return;
    }
    setShowCamera(true);
  };

  const handleCameraComplete = useCallback((result) => {
    console.log('Camera result received:', result); // Debug log
    
    // Extract the URI from various possible sources
    let imageUri = result.imageUrl || result.localUri || result.uri || result.publicUrl;
    
    // Handle data URIs that might be malformed
    if (imageUri && imageUri.startsWith('data:image')) {
      // Ensure data URI is properly formatted
      if (!imageUri.includes('base64,')) {
        console.error('Invalid data URI format:', imageUri.substring(0, 50));
        imageUri = null;
      }
    }
    
    // For development, use a placeholder if no valid URI
    if (!imageUri && __DEV__) {
      console.warn('No valid image URI, using placeholder');
      imageUri = 'https://via.placeholder.com/600x800/3B82F6/FFFFFF?text=Photo+Captured';
    }
    
    // Normalize the result to ensure we have the correct URI property
    const normalizedResult = {
      ...result,
      imageUrl: imageUri,
      localUri: imageUri,
      // Store original URI for debugging
      originalUri: result.imageUrl || result.localUri || result.uri || result.publicUrl,
    };
    
    console.log('Normalized result with URI:', imageUri);
    console.log('Full normalized result:', normalizedResult);
    
    setCameraResult(normalizedResult);
    setShowCamera(false);
    // Removed redundant Alert - the UI will show the success state with image
  }, []);

  const handleCameraCancel = useCallback(() => {
    setShowCamera(false);
  }, []);

  const submitResponse = async () => {
    if (locationStatus !== "verified" && !testingMode) {
      Alert.alert("Location Required", "Please verify your location first.");
      return;
    }

    if (!cameraResult) {
      Alert.alert("Missing Photo", "Please take the required photo first.");
      return;
    }

    if (!response.trim()) {
      Alert.alert(
        "Missing Text",
        "Please provide a text explanation with your photo.",
      );
      return;
    }

    setSubmitting(true);
    try {
      // TODO: Submit to API
      const responseData = {
        questionId: id,
        textResponse: response.trim(),
        imageUrl: cameraResult.imageUrl,
        challengeCode: cameraResult.challengeCode,
        timestamp: cameraResult.timestamp,
        userLocation: currentLocation,
        distanceFromQuestion: distance,
        testingMode: testingMode, // Include testing mode flag
      };

      console.log("Submitting response:", responseData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      Alert.alert(
        "Response Submitted!",
        testingMode
          ? "Test response submitted successfully! This was in testing mode."
          : `You'll receive $${question.reward.toFixed(2)} once the questioner confirms your response.`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      console.error("Error submitting response:", error);
      Alert.alert("Error", "Failed to submit response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Location status component
  const LocationStatus = () => {
    const getStatusConfig = () => {
      switch (locationStatus) {
        case "checking":
          return {
            color: "#F59E0B",
            bgColor: "#FEF3C7",
            icon: <Navigation size={16} color="#D97706" />,
            title: "Checking Location",
            message: gettingLocation
              ? "Getting your current location"
              : "Verifying position",
          };
        case "verified":
          return {
            color: "#10B981",
            bgColor: "#D1FAE5",
            icon: <CheckCircle2 size={16} color="#059669" />,
            title: "Location Verified",
            message: `You're ${distance || 0}m from the question location`,
          };
        case "too_far":
          return {
            color: "#EF4444",
            bgColor: "#FEE2E2",
            icon: <AlertTriangle size={16} color="#DC2626" />,
            title: "Too Far Away",
            message: `You're ${distance || 0}m away (max 200m allowed)`,
          };
        case "error":
          return {
            color: "#EF4444",
            bgColor: "#FEE2E2",
            icon: <AlertTriangle size={16} color="#DC2626" />,
            title: "Location Error",
            message: "Could not verify your location",
          };
        default:
          return {
            color: "#6B7280",
            bgColor: "#F3F4F6",
            icon: <Navigation size={16} color="#6B7280" />,
            title: "Unknown Status",
            message: "Please try again",
          };
      }
    };

    const config = getStatusConfig();

    return (
      <View
        style={{
          backgroundColor: config.bgColor,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: config.color + "40",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          {config.icon}
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: config.color,
              marginLeft: 8,
            }}
          >
            {config.title}
          </Text>
        </View>
        <Text style={{ fontSize: 14, color: config.color, lineHeight: 20 }}>
          {config.message}
        </Text>

        {(locationStatus === "too_far" || locationStatus === "error") && (
          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <TouchableOpacity
              onPress={verifyLocation}
              disabled={gettingLocation}
              style={{
                backgroundColor: config.color,
                borderRadius: 8,
                paddingVertical: 8,
                paddingHorizontal: 12,
                opacity: gettingLocation ? 0.6 : 1,
              }}
            >
              <Text style={{ fontSize: 14, color: "#fff", fontWeight: "500" }}>
                {gettingLocation ? "Checking" : "Try Again"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                console.log("Toggle testing mode:", {
                  before: testingMode,
                  after: !testingMode,
                });
                setTestingMode(!testingMode);
              }}
              style={{
                backgroundColor: testingMode ? "#10B981" : "#6B7280",
                borderRadius: 8,
                paddingVertical: 8,
                paddingHorizontal: 12,
                marginLeft: 12,
              }}
            >
              <Text style={{ fontSize: 14, color: "#fff", fontWeight: "500" }}>
                {testingMode ? "Testing ON" : "Enable Testing"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {testingMode && (
          <View
            style={{
              backgroundColor: "#FEF3C7",
              borderRadius: 8,
              padding: 12,
              marginTop: 12,
              borderWidth: 1,
              borderColor: "#F59E0B",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#D97706",
                marginBottom: 4,
              }}
            >
              Testing Mode Active
            </Text>
            <Text style={{ fontSize: 13, color: "#D97706", lineHeight: 18 }}>
              Location verification bypassed for testing. You can now use the
              camera regardless of your location.
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          backgroundColor: "#fff",
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
          zIndex: 1000,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 16 }}
          >
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: "#111827",
              flex: 1,
            }}
          >
            Respond to Question
          </Text>
          {/* Debug: Show testing mode state */}
          <Text style={{ fontSize: 10, color: "#EF4444" }}>
            {`DEBUG: testing=${testingMode ? "ON" : "OFF"}`}
          </Text>
        </View>

        {/* Question Preview */}
        <View
          style={{
            backgroundColor: "#F0F9FF",
            borderRadius: 12,
            padding: 16,
            borderLeftWidth: 4,
            borderLeftColor: "#3B82F6",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: "#1E40AF",
              fontWeight: "500",
              marginBottom: 12,
            }}
          >
            {question.question}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <MapPin size={14} color="#6B7280" />
            <Text
              style={{ fontSize: 14, color: "#6B7280", marginLeft: 6, flex: 1 }}
            >
              {question.location}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <DollarSign size={14} color="#059669" />
              <Text
                style={{
                  fontSize: 14,
                  color: "#059669",
                  fontWeight: "600",
                  marginLeft: 2,
                }}
              >
                {`$${question.reward.toFixed(2)} reward`}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Clock size={14} color="#6B7280" />
              <Text style={{ fontSize: 12, color: "#6B7280", marginLeft: 4 }}>
                {question.postedAt}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ padding: 20 }}>
            {/* Location Verification */}
            <LocationStatus />

            {/* Step 1: Photos */}
            <View style={{ marginBottom: 32 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: cameraResult
                      ? "#10B981"
                      : locationStatus === "verified" || testingMode
                        ? "#3B82F6"
                        : "#9CA3AF",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  {cameraResult ? (
                    <CheckCircle2 size={16} color="#fff" />
                  ) : (
                    <Text
                      style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}
                    >
                      1
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  Capture Privacy-Safe Photo
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 14,
                  color: "#6B7280",
                  marginBottom: 16,
                  lineHeight: 20,
                }}
              >
                {`Take a privacy-safe photo using our real-time face blurring camera. Faces are automatically blurred before the photo is captured.`}
              </Text>

              {!cameraResult ? (
                <TouchableOpacity
                  onPress={handleStartCamera}
                  disabled={locationStatus !== "verified" && !testingMode}
                  style={{
                    backgroundColor:
                      locationStatus === "verified" || testingMode
                        ? "#3B82F6"
                        : "#9CA3AF",
                    borderRadius: 12,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Camera size={20} color="#fff" />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#fff",
                      marginLeft: 8,
                    }}
                  >
                    {locationStatus === "verified" || testingMode
                      ? "Start Camera"
                      : "Verify Location First"}
                  </Text>
                  {testingMode && (
                    <Text
                      style={{ fontSize: 10, color: "#fff", marginLeft: 8 }}
                    >
                      TEST
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 16,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    ...Platform.select({
                      ios: {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                      },
                      android: {
                        elevation: 3,
                      },
                      web: {
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                      },
                    }),
                  }}
                >
                  {/* Captured Photo Display - PRIMARY ELEMENT */}
                  <View style={{ position: "relative" }}>
                    {(cameraResult?.imageUrl || cameraResult?.localUri) ? (
                      <>
                        <Image
                          source={{ uri: cameraResult.imageUrl || cameraResult.localUri }}
                          style={{
                            width: "100%",
                            height: 240,
                            backgroundColor: "#F3F4F6",
                          }}
                          resizeMode="cover"
                          onError={(e) => {
                            console.error('[IMAGE ERROR] Failed to load image:', {
                              error: e.nativeEvent?.error,
                              uri: cameraResult.imageUrl || cameraResult.localUri,
                              cameraResult: JSON.stringify(cameraResult, null, 2)
                            });
                          }}
                          onLoad={() => {
                            console.log('[IMAGE SUCCESS] Image loaded successfully:', cameraResult.imageUrl || cameraResult.localUri);
                          }}
                          onLoadStart={() => {
                            console.log('[IMAGE START] Loading image from:', cameraResult.imageUrl || cameraResult.localUri);
                          }}
                          onLoadEnd={() => {
                            console.log('[IMAGE END] Image loading finished');
                          }}
                        />
                        {/* Loading indicator overlay */}
                        <View style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          display: 'none' // This would need state management to show/hide properly
                        }}>
                          <ActivityIndicator size="large" color="#3B82F6" />
                          <Text style={{ marginTop: 8, color: '#6B7280' }}>{'Loading image'}</Text>
                        </View>
                      </>
                    ) : (
                      <View
                        style={{
                          width: "100%",
                          height: 240,
                          backgroundColor: "#F3F4F6",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Camera size={48} color="#9CA3AF" />
                        <Text
                          style={{
                            marginTop: 12,
                            fontSize: 14,
                            color: "#6B7280",
                          }}
                        >
                          No photo available
                        </Text>
                      </View>
                    )}
                    {/* Privacy Badge Overlay - Only show when image exists */}
                    {(cameraResult?.imageUrl || cameraResult?.localUri) && (
                      <View
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          backgroundColor: "rgba(16, 185, 129, 0.95)",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 20,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Shield size={14} color="#fff" />
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: "600",
                            marginLeft: 4,
                          }}
                        >
                          Privacy Protected
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Success Information */}
                  <View style={{ padding: 16 }}>
                    {/* Success Header */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 16,
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: "#D1FAE5",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <CheckCircle2 size={20} color="#10B981" />
                      </View>
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: "700",
                            color: "#111827",
                          }}
                        >
                          Photo Captured Successfully
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: "#6B7280",
                            marginTop: 2,
                          }}
                        >
                          Ready to submit with your response
                        </Text>
                      </View>
                    </View>

                    {/* Protection Details */}
                    <View
                      style={{
                        backgroundColor: "#F0FDF4",
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 16,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: "#15803D",
                          marginBottom: 8,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        Protection Applied
                      </Text>
                      <View style={{ flexDirection: "row", marginBottom: 6, alignItems: "flex-start" }}>
                        <CheckCircle2 size={14} color="#15803D" style={{ marginTop: 2 }} />
                        <Text style={{ fontSize: 14, color: "#15803D", marginLeft: 8, flex: 1 }}>
                          Faces automatically blurred in real-time
                        </Text>
                      </View>
                      {cameraResult?.challengeCode && cameraResult.challengeCode.trim() && (
                        <View style={{ flexDirection: "row", marginBottom: 6, alignItems: "flex-start" }}>
                          <CheckCircle2 size={14} color="#15803D" style={{ marginTop: 2 }} />
                          <Text style={{ fontSize: 14, color: "#15803D", marginLeft: 8, flex: 1 }}>
                            {`Challenge verified: ${cameraResult.challengeCode || 'N/A'}`}
                          </Text>
                        </View>
                      )}
                      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                        <CheckCircle2 size={14} color="#15803D" style={{ marginTop: 2 }} />
                        <Text style={{ fontSize: 14, color: "#15803D", marginLeft: 8, flex: 1 }}>
                          {`Location confirmed: ${distance || 0}m away`}
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={{ flexDirection: "row" }}>
                      <TouchableOpacity
                        onPress={() => {
                          setCameraResult(null); // Clear previous result before retaking
                          handleStartCamera();
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: "#fff",
                          borderWidth: 1,
                          borderColor: "#D1D5DB",
                          borderRadius: 12,
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Camera size={18} color="#6B7280" />
                        <Text
                          style={{
                            fontSize: 15,
                            color: "#6B7280",
                            fontWeight: "600",
                            marginLeft: 8,
                          }}
                        >
                          Retake Photo
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Step 2: Text Response */}
            <View style={{ marginBottom: 32 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: response.trim()
                      ? "#10B981"
                      : cameraResult
                        ? "#3B82F6"
                        : "#9CA3AF",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  {response.trim() ? (
                    <CheckCircle2 size={16} color="#fff" />
                  ) : (
                    <Text
                      style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}
                    >
                      2
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  Add Text Explanation
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 14,
                  color: "#6B7280",
                  marginBottom: 16,
                  lineHeight: 20,
                }}
              >
                {`Describe what your photo shows. Be specific and helpful to answer the question completely.`}
              </Text>

              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  padding: 4,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    padding: 12,
                  }}
                >
                  <MessageCircle
                    size={20}
                    color="#6B7280"
                    style={{ marginTop: 2, marginRight: 12 }}
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: "#111827",
                      minHeight: 100,
                      textAlignVertical: "top",
                    }}
                    placeholder="Describe what you can see that answers their question"
                    placeholderTextColor="#9CA3AF"
                    value={response}
                    onChangeText={setResponse}
                    multiline
                    maxLength={500}
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                    Be specific and helpful
                  </Text>
                  <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
                    {`${response.length}/500`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Privacy Notice */}
            <View
              style={{
                backgroundColor: "#EBF5FF",
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#1E40AF",
                  marginBottom: 8,
                }}
              >
                Privacy Protection Active
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#1E40AF",
                  lineHeight: 18,
                }}
              >
                {`Your photo is processed on-device with real-time face blurring. All faces are automatically blurred before the photo is captured, ensuring complete privacy protection.`}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
            padding: 20,
            paddingBottom: insets.bottom + 20,
          }}
        >
          <TouchableOpacity
            onPress={submitResponse}
            disabled={submitting || !cameraResult || !response.trim()}
            style={{
              backgroundColor:
                submitting || !cameraResult || !response.trim()
                  ? "#9CA3AF"
                  : "#10B981",
              borderRadius: 12,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {submitting ? (
              <>
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: "#fff",
                    borderTopColor: "transparent",
                    marginRight: 8,
                  }}
                />
                <Text
                  style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}
                >
                  Submitting Response
                </Text>
              </>
            ) : (
              <>
                <Send size={20} color="#fff" />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#fff",
                    marginLeft: 8,
                  }}
                >
                  {`Submit Response ($${question.reward.toFixed(2)})`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingAnimatedView>

      {/* Camera Modal */}
      <Modal
        visible={showCamera}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {Platform.OS === 'web' ? (
          <EchoCameraWeb
            userId="current-user"
            requestId={id}
            onComplete={handleCameraComplete}
            onCancel={handleCameraCancel}
          />
        ) : (
          <EchoCameraUnified
            userId="current-user"
            requestId={id}
            onComplete={handleCameraComplete}
            onCancel={handleCameraCancel}
          />
        )}
      </Modal>
    </View>
  );
}




