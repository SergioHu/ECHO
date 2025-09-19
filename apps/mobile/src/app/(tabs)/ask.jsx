import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { useState, useRef, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  MapPin,
  DollarSign,
  Send,
  Target,
  X,
  Check,
  Map,
  AlertCircle,
  HelpCircle,
  Info,
} from "lucide-react-native";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Input from '@/components/ui/Input';
import { debugLog, debugError } from '@/utils/debug';

const { width, height } = Dimensions.get("window");

export default function AskScreen() {
  const insets = useSafeAreaInsets();
  const [question, setQuestion] = useState("");
  const [reward, setReward] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationAddress, setLocationAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [locationError, setLocationError] = useState(null);
  
  // Form validation
  const [errors, setErrors] = useState({
    question: '',
    reward: '',
  });
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 40.7589,
    longitude: -73.9851,
  });
  const [mapRegion, setMapRegion] = useState({
    latitude: 40.7589,
    longitude: -73.9851,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const modalAnimation = useRef(new Animated.Value(0)).current;
  const mapRef = useRef(null);

  // Form validation functions
  const validateQuestion = (text) => {
    if (!text.trim()) {
      return 'Please enter your question';
    }
    if (text.trim().length < 10) {
      return 'Question must be at least 10 characters long';
    }
    return '';
  };

  const validateReward = (amount) => {
    if (!amount) {
      return 'Please enter a reward amount';
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0.5) {
      return 'Minimum reward is $0.50';
    }
    if (numAmount > 1000) {
      return 'Maximum reward is $1000';
    }
    return '';
  };

  const handleQuestionChange = (text) => {
    setQuestion(text);
    if (errors.question) {
      setErrors(prev => ({ ...prev, question: validateQuestion(text) }));
    }
  };

  const handleRewardChange = (text) => {
    // Only allow numbers and decimal point
    const filteredText = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = filteredText.split('.');
    const cleanedText = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filteredText;
    
    setReward(cleanedText);
    if (errors.reward) {
      setErrors(prev => ({ ...prev, reward: validateReward(cleanedText) }));
    }
  };

    const getCurrentLocation = async () => {
    setGettingLocation(true);
    setLocationError(null);

    try {
      if (
        Platform.OS === "web" &&
        typeof window !== "undefined" &&
        window.location.protocol !== "https:" &&
        window.location.hostname !== "localhost"
      ) {
        const message =
          "Browsers require HTTPS to access location. Switch to https://localhost or enter the location manually.";
        setLocationError(message);
        Alert.alert("Location Unavailable", message);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        const message =
          Platform.OS === "web"
            ? "Allow location access in your browser settings or enter the address manually."
            : "Location permission is needed to get your location.";
        setLocationError(message);
        Alert.alert("Permission required", message);
        return;
      }

      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
        maximumAge: 60000,
      });
      const { latitude, longitude } = locationData.coords;

      const newLocation = { latitude, longitude };
      setCurrentLocation(newLocation);

      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(newRegion);

      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }

      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (addresses.length > 0) {
          const address = addresses[0];
          const formattedLocation =
            `${address.name || address.street || ""} ${address.city || ""}, ${address.region || ""}`.trim();
          setLocationAddress(formattedLocation);
          setSelectedLocation({
            latitude,
            longitude,
            address: formattedLocation,
          });
        }
      } catch (reverseError) {
        debugError("Error reverse geocoding:", reverseError);
        setLocationAddress("Current Location");
        setSelectedLocation({
          latitude,
          longitude,
          address: "Current Location",
        });
      }
    } catch (error) {
      debugError("Error getting location:", error);
      let message = "Could not get your current location. Please try again.";
      if (error?.code === 1) {
        message = "Location permission was denied. Allow access in your device or browser settings, or set the marker manually.";
      } else if (error?.code === 2) {
        message = "We could not determine your position. Move to an open area or adjust your GPS settings.";
      } else if (error?.code === 3) {
        message = "Location request timed out. Please try again.";
      } else if (Platform.OS === "web" && typeof error?.message === "string" && error.message.toLowerCase().includes("secure")) {
        message = "The browser blocked location on this connection. Use https:// or drag the map pin manually.";
      }
      setLocationError(message);
      Alert.alert("Error", message);
    } finally {
      setGettingLocation(false);
    }
  };


  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLocationError(null);

    setCurrentLocation({ latitude, longitude });

    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        const formattedLocation =
          `${address.name || address.street || ""} ${address.city || ""}, ${address.region || ""}`.trim();
        setLocationAddress(formattedLocation);
        setSelectedLocation({
          latitude,
          longitude,
          address: formattedLocation,
        });
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      setLocationAddress("Selected Location");
      setSelectedLocation({
        latitude,
        longitude,
        address: "Selected Location",
      });
    }
  };

  // Fallback function to simulate map selection
  const handleFallbackLocationSelect = () => {
    Alert.alert(
      "Select Location",
      "For demo purposes, would you like to use a sample location?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Use Sample",
          onPress: () => {
            const sampleLocation = {
              latitude: 40.7589,
              longitude: -73.9851,
              address: "Times Square, New York, NY",
            };
            setSelectedLocation(sampleLocation);
            setLocationAddress(sampleLocation.address);
            setCurrentLocation({
              latitude: sampleLocation.latitude,
              longitude: sampleLocation.longitude,
            });
          },
        },
      ],
    );
  };

  const confirmLocation = () => {
    if (!selectedLocation) {
      Alert.alert(
        "No location selected",
        "Please select a location on the map or use your current location.",
      );
      return;
    }

    // Animate modal in
    setShowModal(true);
    Animated.spring(modalAnimation, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      tension: 100,
      friction: 8,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      setShowModal(false);
    });
  };

  const submitQuestion = async () => {
    // Validate all fields
    const questionError = validateQuestion(question);
    const rewardError = validateReward(reward);
    
    const newErrors = {
      question: questionError,
      reward: rewardError,
    };
    
    setErrors(newErrors);
    
    // Check if there are any errors
    if (questionError || rewardError) {
      return;
    }

    if (!selectedLocation) {
      Alert.alert("Missing location", "Please select a location for your question.");
      return;
    }

    setLoading(true);
    try {
      // TODO: Submit to API
      debugLog("Submitting question:", {
        question: question.trim(),
        location: selectedLocation,
        reward: parseFloat(reward),
      });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      Alert.alert(
        "Success!",
        "Your question has been posted. You'll be notified when someone responds.",
        [
          {
            text: "OK",
            onPress: () => {
              // Reset form and close modal
              setQuestion("");
              setReward("");
              setSelectedLocation(null);
              setLocationAddress("");
              setErrors({ question: '', reward: '' });
              closeModal();
            },
          },
        ]
      );
    } catch (error) {
      debugError("Error submitting question:", error);
      Alert.alert("Error", "Could not post your question. Please try again.");
    }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          backgroundColor: "#fff",
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
          zIndex: 1000,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "bold",
            color: "#111827",
          }}
        >
          Ask a Question
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "#6B7280",
            marginTop: 4,
          }}
        >
          Select a location on the map
        </Text>
      </View>

      {/* Map Container */}
      <View style={{ flex: 1, position: "relative" }}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === "web" ? PROVIDER_GOOGLE : undefined}
          style={{ flex: 1 }}
          region={mapRegion}
          onRegionChangeComplete={setMapRegion}
          onPress={handleMapPress}
          onMapReady={() => {
            debugLog("Map is ready");
            setMapLoaded(true);
          }}
          onMapLoaded={() => {
            debugLog("Map loaded");
            setMapLoaded(true);
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          loadingEnabled={true}
          loadingIndicatorColor="#3B82F6"
          loadingBackgroundColor="#F9FAFB"
        >
          {selectedLocation && (
            <Marker
              coordinate={{
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
              }}
              title="Selected Location"
              description={selectedLocation.address}
            />
          )}
        </MapView>

        {/* Map Loading Fallback */}
        {!mapLoaded && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Map size={64} color="#9CA3AF" />
            <Text
              style={{
                fontSize: 18,
                color: "#6B7280",
                marginTop: 16,
                textAlign: "center",
              }}
            >
              Loading Map...
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#9CA3AF",
                marginTop: 8,
                textAlign: "center",
                paddingHorizontal: 40,
              }}
            >
              Maps may not work in Expo Go. Try using a development build.
            </Text>
            <TouchableOpacity
              onPress={handleFallbackLocationSelect}
              style={{
                backgroundColor: "#3B82F6",
                borderRadius: 12,
                paddingHorizontal: 20,
                paddingVertical: 12,
                marginTop: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#fff",
                }}
              >
                Use Sample Location
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Location Info Card */}
        {selectedLocation && (
          <View
            style={{
              position: "absolute",
              top: 20,
              left: 20,
              right: 20,
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 16,
              ...Platform.select({
                ios: {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                },
                android: {
                  elevation: 3,
                },
                web: {
                  boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                },
              }),
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Target size={16} color="#3B82F6" />
              <Text
                style={{
                  fontSize: 14,
                  color: "#1E40AF",
                  marginLeft: 8,
                  flex: 1,
                  fontWeight: "500",
                }}
              >
                {locationAddress}
              </Text>
            </View>
          </View>
        )}

        {/* Floating Action Buttons */}
        <View
          style={{
            position: "absolute",
            bottom: 20,
            right: 20,
            alignItems: "flex-end",
          }}
        >
          {/* Get Current Location Button */}
          <TouchableOpacity
            onPress={getCurrentLocation}
            disabled={gettingLocation}
            style={{
              backgroundColor: gettingLocation ? "#9CA3AF" : "#3B82F6",
              borderRadius: 25,
              width: 50,
              height: 50,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
              ...Platform.select({
                ios: {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                },
                android: {
                  elevation: 5,
                },
                web: {
                  boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.25)",
                },
              }),
            }}
          >
            <MapPin size={24} color="#fff" />
          </TouchableOpacity>

          {/* Confirm Location Button */}
          {selectedLocation && (
            <TouchableOpacity
              onPress={confirmLocation}
              style={{
                backgroundColor: "#10B981",
                borderRadius: 25,
                paddingHorizontal: 20,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                ...Platform.select({
                  ios: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                  },
                  android: {
                    elevation: 5,
                  },
                  web: {
                    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.25)",
                  },
                }),
              }}
            >
              <Check size={20} color="#fff" />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#fff",
                  marginLeft: 8,
                }}
              >
                Ask Here
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Question Details Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "flex-end",
            }}
          >
            <Animated.View
              style={{
                backgroundColor: "#fff",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                minHeight: height * 0.7,
                transform: [
                  {
                    translateY: modalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [height, 0],
                    }),
                  },
                ],
              }}
            >
              {/* Modal Header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "#E5E7EB",
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    color: "#111827",
                  }}
                >
                  Ask a Question
                </Text>
                <TouchableOpacity onPress={closeModal}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
              >
                <View style={{ padding: 20 }}>
                  {/* Selected Location */}
                  <View style={{ marginBottom: 24 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#111827",
                        marginBottom: 8,
                      }}
                    >
                      Location
                    </Text>
                    <View
                      style={{
                        backgroundColor: "#F0F9FF",
                        borderRadius: 12,
                        padding: 16,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <MapPin size={20} color="#3B82F6" />
                      <Text
                        style={{
                          fontSize: 14,
                          color: "#1E40AF",
                          marginLeft: 12,
                          flex: 1,
                        }}
                      >
                        {selectedLocation?.address || "Unknown location"}
                      </Text>
                    </View>
                  </View>

                  {/* Question Input */}
                  <Input
                    label="Your Question"
                    placeholder="What do you want to know? Be specific about what visual proof you need..."
                    value={question}
                    onChangeText={handleQuestionChange}
                    error={errors.question}
                    helperText="Be clear and specific to get the best responses"
                    multiline
                    numberOfLines={4}
                    maxLength={300}
                    leftIcon={<HelpCircle size={20} color="#6B7280" />}
                    required
                  />

                  {/* Reward */}
                  <Input
                    label="Reward Amount"
                    placeholder="0.50"
                    value={reward}
                    onChangeText={handleRewardChange}
                    error={errors.reward}
                    helperText="Minimum $0.50. Higher rewards get faster responses."
                    keyboardType="decimal-pad"
                    leftIcon={<DollarSign size={20} color="#6B7280" />}
                    required
                  />

                  {/* Info Box */}
                  <Card
                    variant="info"
                    style={{
                      backgroundColor: "#EBF5FF",
                      borderColor: "#BFDBFE",
                      borderWidth: 1,
                      marginBottom: 32,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
                      <View
                        style={{
                          backgroundColor: "#DBEAFE",
                          borderRadius: 20,
                          padding: 8,
                          marginRight: 12,
                        }}
                      >
                        <Info size={20} color="#3B82F6" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: "#1E40AF",
                            marginBottom: 6,
                          }}
                        >
                          How Echo Works
                        </Text>
                        <View>
                          <Text
                            style={{
                              fontSize: 14,
                              color: "#1E40AF",
                              lineHeight: 20,
                              marginBottom: 4,
                            }}
                          >
                            ? Your question will be posted at this location
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              color: "#1E40AF",
                              lineHeight: 20,
                              marginBottom: 4,
                            }}
                          >
                            ? Someone nearby (an Echo) will answer with photos
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              color: "#1E40AF",
                              lineHeight: 20,
                            }}
                          >
                            ? You'll get privacy-protected visual proof
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Card>
                </View>
              </ScrollView>

              {/* Submit Button */}
              <View
                style={{
                  padding: 20,
                  paddingBottom: insets.bottom + 20,
                  borderTopWidth: 1,
                  borderTopColor: "#E5E7EB",
                }}
              >
                <Button
                  title={loading ? "Posting Question..." : "Post Question"}
                  onPress={submitQuestion}
                  disabled={loading}
                  loading={loading}
                  size="large"
                  icon={loading ? undefined : <Send size={20} color="#fff" />}
                />
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingAnimatedView>
      </Modal>
    </View>
  );
}





