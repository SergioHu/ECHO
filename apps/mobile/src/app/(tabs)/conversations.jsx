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
import {
  MessageCircle,
  Clock,
  MapPin,
  CheckCircle,
  Camera,
  DollarSign,
  ChevronRight,
} from "lucide-react-native";

export default function ConversationsScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Sample questions available for response
  const [availableQuestions] = useState([
    {
      id: "1",
      question:
        "Is the coffee shop on Main Street currently open? I need to know if they have seating available.",
      location: "123 Main Street, Downtown",
      reward: 2.5,
      postedAt: "2 hours ago",
      urgent: false,
    },
    {
      id: "2",
      question:
        "What's the current wait time at the DMV? Are there many people in line?",
      location: "DMV Office, City Center",
      reward: 3.0,
      postedAt: "45 minutes ago",
      urgent: true,
    },
  ]);

  // Mock data for conversations
  const [conversations] = useState([
    {
      id: 1,
      type: "seeker", // User is the one who asked the question
      question: "What does the line look like at Shake Shack right now?",
      location: "Union Square, NYC",
      otherUser: "Alex M.",
      lastMessage: "Here's the photo showing the line is about 5 people long",
      timestamp: "2 min ago",
      status: "answered",
      unreadCount: 1,
      reward: 3.0,
    },
    {
      id: 2,
      type: "echo", // User is the one answering
      question: "Are the cherry blossoms blooming in Central Park today?",
      location: "Central Park, NYC",
      otherUser: "Sarah K.",
      lastMessage: "Perfect! Thank you so much for the photos",
      timestamp: "1 hour ago",
      status: "completed",
      unreadCount: 0,
      reward: 2.5,
    },
    {
      id: 3,
      type: "seeker",
      question: "Is the new mural on this wall finished?",
      location: "Brooklyn Heights",
      otherUser: "Mike R.",
      lastMessage: "I can head over there now to check",
      timestamp: "2 hours ago",
      status: "in_progress",
      unreadCount: 2,
      reward: 1.5,
    },
  ]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "answered":
        return "#10B981";
      case "completed":
        return "#6B7280";
      case "in_progress":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "answered":
        return "Answered";
      case "completed":
        return "Completed";
      case "in_progress":
        return "In Progress";
      default:
        return "Active";
    }
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
          Messages
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "#6B7280",
            marginTop: 4,
          }}
        >
          Your conversations & available questions
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Available Questions Section */}
        {availableQuestions.length > 0 && (
          <View style={{ padding: 16, paddingBottom: 0 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Camera size={20} color="#3B82F6" />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "#111827",
                  marginLeft: 8,
                }}
              >
                Help Others & Earn
              </Text>
            </View>

            {availableQuestions.map((question) => (
              <TouchableOpacity
                key={question.id}
                onPress={() => router.push(`/respond/${question.id}`)}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: question.urgent ? 2 : 0,
                  borderColor: question.urgent ? "#F59E0B" : "transparent",
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
                {question.urgent && (
                  <View
                    style={{
                      backgroundColor: "#FEF3C7",
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      alignSelf: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: "#92400E",
                      }}
                    >
                      🔥 URGENT
                    </Text>
                  </View>
                )}

                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "500",
                    color: "#111827",
                    marginBottom: 8,
                    lineHeight: 22,
                  }}
                >
                  {question.question}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <MapPin size={14} color="#6B7280" />
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#6B7280",
                      marginLeft: 4,
                      flex: 1,
                    }}
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
                    <DollarSign size={16} color="#059669" />
                    <Text
                      style={{
                        fontSize: 16,
                        color: "#059669",
                        fontWeight: "600",
                        marginLeft: 2,
                        marginRight: 16,
                      }}
                    >
                      {question.reward.toFixed(2)}
                    </Text>

                    <Clock size={14} color="#9CA3AF" />
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#9CA3AF",
                        marginLeft: 4,
                      }}
                    >
                      {question.postedAt}
                    </Text>
                  </View>

                  <ChevronRight size={20} color="#3B82F6" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Your Conversations Section */}
        <View style={{ padding: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <MessageCircle size={20} color="#6B7280" />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#111827",
                marginLeft: 8,
              }}
            >
              Your Conversations
            </Text>
          </View>

          {conversations.length === 0 ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 40,
              }}
            >
              <MessageCircle size={48} color="#9CA3AF" />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: "#6B7280",
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                No conversations yet
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#9CA3AF",
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                Ask a question or help answer one to start chatting
              </Text>
            </View>
          ) : (
            conversations.map((conversation) => (
              <TouchableOpacity
                key={conversation.id}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
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
                {/* Header Row */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color:
                          conversation.type === "seeker"
                            ? "#3B82F6"
                            : "#10B981",
                        marginBottom: 2,
                      }}
                    >
                      {conversation.type === "seeker"
                        ? "YOUR QUESTION"
                        : "HELPING OUT"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#111827",
                        lineHeight: 22,
                      }}
                    >
                      {conversation.question}
                    </Text>
                  </View>

                  {conversation.unreadCount > 0 && (
                    <View
                      style={{
                        backgroundColor: "#EF4444",
                        borderRadius: 12,
                        minWidth: 24,
                        height: 24,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: "#fff",
                        }}
                      >
                        {conversation.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Location */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <MapPin size={14} color="#6B7280" />
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#6B7280",
                      marginLeft: 4,
                    }}
                  >
                    {conversation.location}
                  </Text>
                </View>

                {/* Last Message */}
                <Text
                  style={{
                    fontSize: 14,
                    color: "#374151",
                    marginBottom: 12,
                    lineHeight: 20,
                  }}
                >
                  <Text style={{ fontWeight: "500" }}>
                    {conversation.otherUser}:
                  </Text>{" "}
                  {conversation.lastMessage}
                </Text>

                {/* Bottom Row */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Clock size={12} color="#9CA3AF" />
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#9CA3AF",
                        marginLeft: 4,
                      }}
                    >
                      {conversation.timestamp}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {/* Status */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: `${getStatusColor(conversation.status)}15`,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        marginRight: 8,
                      }}
                    >
                      <CheckCircle
                        size={12}
                        color={getStatusColor(conversation.status)}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "500",
                          color: getStatusColor(conversation.status),
                          marginLeft: 4,
                        }}
                      >
                        {getStatusText(conversation.status)}
                      </Text>
                    </View>

                    {/* Reward */}
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      ${conversation.reward.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
