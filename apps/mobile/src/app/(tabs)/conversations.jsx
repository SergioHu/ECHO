import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  TextInput,
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
  Search,
  Filter,
} from "lucide-react-native";
import QuestionCard from '@/components/ui/QuestionCard';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function ConversationsScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('conversations'); // 'conversations', 'available'

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

  const filteredConversations = conversations.filter(conv => 
    searchQuery === '' ||
    conv.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherUser.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAvailableQuestions = availableQuestions.filter(q => 
    searchQuery === '' ||
    q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            marginBottom: 16,
          }}
        >
          Messages
        </Text>
        
        {/* Tab Navigation */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: '#F3F4F6',
          borderRadius: 12,
          padding: 4,
          marginBottom: 16,
        }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: activeTab === 'conversations' ? '#FFFFFF' : 'transparent',
            }}
            onPress={() => setActiveTab('conversations')}
          >
            <Text style={{
              textAlign: 'center',
              fontSize: 14,
              fontWeight: '600',
              color: activeTab === 'conversations' ? '#111827' : '#6B7280',
            }}>
              Conversations ({filteredConversations.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: activeTab === 'available' ? '#FFFFFF' : 'transparent',
            }}
            onPress={() => setActiveTab('available')}
          >
            <Text style={{
              textAlign: 'center',
              fontSize: 14,
              fontWeight: '600',
              color: activeTab === 'available' ? '#111827' : '#6B7280',
            }}>
              Available ({filteredAvailableQuestions.length})
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Search Bar */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#F3F4F6',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={{
              flex: 1,
              fontSize: 16,
              color: '#111827',
              marginLeft: 12,
            }}
            placeholder={activeTab === 'conversations' ? "Search conversations..." : "Search available questions..."}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <LoadingSpinner 
            text={activeTab === 'conversations' ? "Loading conversations..." : "Loading available questions..."}
            style={{ paddingVertical: 40 }}
          />
        ) : (
          <View style={{ padding: 16 }}>
            {activeTab === 'conversations' ? (
              // Conversations Tab
              filteredConversations.length === 0 ? (
                <EmptyState
                  variant="messages"
                  title={searchQuery ? "No matching conversations" : "No conversations yet"}
                  description={searchQuery 
                    ? "Try adjusting your search query"
                    : "Start by responding to available questions or ask your own!"
                  }
                  actionLabel={!searchQuery ? "Ask a Question" : undefined}
                  onAction={!searchQuery ? () => router.push('/ask') : undefined}
                />
              ) : (
                filteredConversations.map((conversation) => (
                  <QuestionCard
                    key={conversation.id}
                    question={{
                      ...conversation,
                      title: conversation.question,
                    }}
                    onPress={(conv) => router.push(`/respond/${conv.id}`)}
                    showUser={true}
                    showDistance={false}
                    showStatus={true}
                    variant="conversation"
                  />
                ))
              )
            ) : (
              // Available Questions Tab
              filteredAvailableQuestions.length === 0 ? (
                <EmptyState
                  variant="create"
                  title={searchQuery ? "No matching questions" : "No questions available"}
                  description={searchQuery 
                    ? "Try adjusting your search query"
                    : "Check back later for new questions to answer!"
                  }
                  actionLabel={!searchQuery ? "Ask a Question" : undefined}
                  onAction={!searchQuery ? () => router.push('/ask') : undefined}
                />
              ) : (
                <View>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 16,
                    paddingHorizontal: 4,
                  }}>
                    <Camera size={20} color="#10B981" />
                    <Text style={{
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: '#111827',
                      marginLeft: 8,
                    }}>
                      Help Others & Earn
                    </Text>
                  </View>
                  
                  {filteredAvailableQuestions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={{
                        ...question,
                        title: question.question,
                        timeAgo: question.postedAt,
                        urgency: question.urgent ? 'high' : 'medium',
                      }}
                      onPress={(q) => router.push(`/respond/${q.id}`)}
                      showDistance={false}
                    />
                  ))}
                </View>
              )
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
