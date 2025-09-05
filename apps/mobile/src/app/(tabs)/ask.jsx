import {
  View,
  Text,
  TextInput,
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
  Camera,
  Target,
  X,
  Check,
  Map,
} from "lucide-react-native";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";

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

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Location permission is needed to get your location.",
        );
        setGettingLocation(false);
        return;
      }

      const locationData = await Location.getCurrentPositionAsync({});
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

      // Animate map to new location
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }

      // Reverse geocode to get address
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
        setLocationAddress("Current Location");
        setSelectedLocation({
          latitude,
          longitude,
          address: "Current Location",
        });
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert(
        "Error",
        "Could not get your current location. Please try again.",
      );
    }
    setGettingLocation(false);
  };

  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;

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
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
    });
  };

  const submitQuestion = async () => {
    if (!question.trim()) {
      Alert.alert("Missing information", "Please enter your question.");
      return;
    }

    if (!reward || parseFloat(reward) < 0.5) {
      Alert.alert("Invalid reward", "Minimum reward is $0.50.");
      return;
    }

    setLoading(true);
    try {
      // TODO: Submit to API
      console.log("Submitting question:", {
        question,
        location: selectedLocation,
        reward: parseFloat(reward),
      });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      Alert.alert(
        "Success!",
        "Your question has been posted. You'll be notified when someone responds.",
      );

      // Reset form and close modal
      setQuestion("");
      setReward("");
      setSelectedLocation(null);
      setLocationAddress("");
      closeModal();
    } catch (error) {
      console.error("Error submitting question:", error);
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
            console.log("Map is ready");
            setMapLoaded(true);
          }}
          onMapLoaded={() => {
            console.log("Map loaded");
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
                  <View style={{ marginBottom: 24 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#111827",
                        marginBottom: 8,
                      }}
                    >
                      Your Question
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: "#F9FAFB",
                        borderRadius: 12,
                        padding: 16,
                        fontSize: 16,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        minHeight: 120,
                        textAlignVertical: "top",
                      }}
                      placeholder="What do you want to know? Be specific about what visual proof you need..."
                      placeholderTextColor="#9CA3AF"
                      value={question}
                      onChangeText={setQuestion}
                      multiline
                      maxLength={300}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        textAlign: "right",
                        marginTop: 4,
                      }}
                    >
                      {question.length}/300
                    </Text>
                  </View>

                  {/* Reward */}
                  <View style={{ marginBottom: 24 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#111827",
                        marginBottom: 8,
                      }}
                    >
                      Reward Amount
                    </Text>
                    <View
                      style={{
                        backgroundColor: "#F9FAFB",
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        flexDirection: "row",
                        alignItems: "center",
                        paddingLeft: 16,
                      }}
                    >
                      <DollarSign size={20} color="#6B7280" />
                      <TextInput
                        style={{
                          flex: 1,
                          fontSize: 16,
                          padding: 16,
                          paddingLeft: 8,
                        }}
                        placeholder="0.50"
                        placeholderTextColor="#9CA3AF"
                        value={reward}
                        onChangeText={setReward}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        marginTop: 4,
                      }}
                    >
                      Minimum $0.50. Higher rewards get faster responses.
                    </Text>
                  </View>

                  {/* Info Box */}
                  <View
                    style={{
                      backgroundColor: "#EBF5FF",
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 32,
                    }}
                  >
                    <View style={{ flexDirection: "row", marginBottom: 8 }}>
                      <Camera size={20} color="#3B82F6" />
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: "#1E40AF",
                          marginLeft: 8,
                        }}
                      >
                        How it works
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#1E40AF",
                        lineHeight: 20,
                      }}
                    >
                      Someone nearby will take a photo to answer your question.
                      All photos are processed to protect privacy while
                      providing the visual proof you need.
                    </Text>
                  </View>
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
                <TouchableOpacity
                  onPress={submitQuestion}
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? "#9CA3AF" : "#3B82F6",
                    borderRadius: 12,
                    padding: 16,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#fff",
                    }}
                  >
                    {loading ? "Posting Question..." : "Post Question"}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingAnimatedView>
      </Modal>
    </View>
  );
}
