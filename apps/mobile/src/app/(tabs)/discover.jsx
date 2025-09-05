import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from "react-native";
import { useState, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { MapPin, Clock, DollarSign, ChevronRight } from "lucide-react-native";

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Mock data for now - will be replaced with real data later
  const [questions] = useState([
    {
      id: 1,
      title: "What does the line look like at Shake Shack right now?",
      location: "Union Square, NYC",
      reward: 3.0,
      timeAgo: "5 min ago",
      distance: "0.3 miles",
      urgency: "high",
    },
    {
      id: 2,
      title: "Are the cherry blossoms blooming in Central Park today?",
      location: "Central Park, NYC",
      reward: 2.5,
      timeAgo: "12 min ago",
      distance: "0.8 miles",
      urgency: "medium",
    },
    {
      id: 3,
      title: "Is the new mural on this wall finished?",
      location: "Brooklyn Heights",
      reward: 1.5,
      timeAgo: "25 min ago",
      distance: "1.2 miles",
      urgency: "low",
    },
    {
      id: 4,
      title: "Is the coffee shop on Main Street currently open?",
      location: "123 Main Street, Downtown",
      reward: 2.5,
      timeAgo: "1 hour ago",
      distance: "0.5 miles",
      urgency: "medium",
    },
    {
      id: 5,
      title: "Can you check if there are available parking spots at the mall?",
      location: "Westfield Shopping Center",
      reward: 4.0,
      timeAgo: "30 min ago",
      distance: "0.7 miles",
      urgency: "high",
    },
    {
      id: 6,
      title: "How crowded is the farmer's market right now?",
      location: "Grand Army Plaza",
      reward: 1.5,
      timeAgo: "45 min ago",
      distance: "0.9 miles",
      urgency: "low",
    },
    {
      id: 7,
      title: "Is the ATM at Chase Bank working or out of order?",
      location: "42nd Street & Broadway",
      reward: 2.0,
      timeAgo: "20 min ago",
      distance: "0.4 miles",
      urgency: "medium",
    },
    {
      id: 8,
      title: "What's the current gas price at the Shell station?",
      location: "5th Avenue Gas Station",
      reward: 1.0,
      timeAgo: "1 hour ago",
      distance: "1.5 miles",
      urgency: "low",
    },
    {
      id: 9,
      title: "Are there shopping carts available at Whole Foods entrance?",
      location: "Columbus Circle Whole Foods",
      reward: 1.5,
      timeAgo: "35 min ago",
      distance: "0.6 miles",
      urgency: "medium",
    },
    {
      id: 10,
      title:
        "Is the outdoor seating area at the restaurant dry after the rain?",
      location: "Madison Square Park Café",
      reward: 2.0,
      timeAgo: "15 min ago",
      distance: "0.8 miles",
      urgency: "medium",
    },
    {
      id: 11,
      title: "How long is the wait at the DMV right now?",
      location: "Downtown DMV Office",
      reward: 5.0,
      timeAgo: "10 min ago",
      distance: "1.1 miles",
      urgency: "high",
    },
    {
      id: 12,
      title: "Are there available courts at the tennis center?",
      location: "Central Park Tennis Center",
      reward: 3.0,
      timeAgo: "40 min ago",
      distance: "1.0 miles",
      urgency: "medium",
    },
  ]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case "high":
        return "#EF4444";
      case "medium":
        return "#F59E0B";
      case "low":
        return "#10B981";
      default:
        return "#6B7280";
    }
  };

  const handleQuestionPress = (questionId) => {
    router.push(`/respond/${questionId}`);
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
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "bold",
            color: "#111827",
          }}
        >
          Nearby Questions
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "#6B7280",
            marginTop: 4,
          }}
        >
          Help others and earn money
        </Text>
      </View>

      {/* Questions List */}
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ padding: 16 }}>
          {questions.map((question) => (
            <TouchableOpacity
              key={question.id}
              onPress={() => handleQuestionPress(question.id)}
              style={{
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: getUrgencyColor(question.urgency),
                ...Platform.select({
                  ios: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  },
                  android: {
                    elevation: 2,
                  },
                  web: {
                    boxShadow: "0px 1px 4px rgba(0, 0, 0, 0.1)",
                  },
                }),
              }}
            >
              {/* Question Title */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#111827",
                    lineHeight: 22,
                    flex: 1,
                  }}
                >
                  {question.title}
                </Text>
                <ChevronRight
                  size={20}
                  color="#9CA3AF"
                  style={{ marginLeft: 8, marginTop: 1 }}
                />
              </View>

              {/* Location */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <MapPin size={16} color="#6B7280" />
                <Text
                  style={{
                    fontSize: 14,
                    color: "#6B7280",
                    marginLeft: 6,
                  }}
                >
                  {question.location} • {question.distance}
                </Text>
              </View>

              {/* Bottom Row */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {/* Time */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Clock size={14} color="#6B7280" />
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#6B7280",
                      marginLeft: 4,
                    }}
                  >
                    {question.timeAgo}
                  </Text>
                </View>

                {/* Reward */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#F0FDF4",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <DollarSign size={16} color="#16A34A" />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: "#16A34A",
                      marginLeft: 2,
                    }}
                  >
                    {question.reward.toFixed(2)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Empty state or loading indicator could go here */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <Text
            style={{
              fontSize: 14,
              color: "#9CA3AF",
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            Pull down to refresh for new questions
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
