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
  MapPin, 
  Clock, 
  DollarSign, 
  ChevronRight, 
  Search,
  Filter,
  SlidersHorizontal,
  Zap
} from "lucide-react-native";
import QuestionCard from '@/components/ui/QuestionCard';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'high', 'medium', 'low', 'nearby'
  const [showFilters, setShowFilters] = useState(false);

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

  const filteredQuestions = questions.filter(question => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      question.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      question.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Urgency filter
    const matchesFilter = selectedFilter === 'all' ||
      (selectedFilter === 'nearby' && parseFloat(question.distance.split(' ')[0]) < 1) ||
      question.urgency === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const filterOptions = [
    { key: 'all', label: 'All Questions', count: questions.length },
    { key: 'high', label: 'High Priority', count: questions.filter(q => q.urgency === 'high').length },
    { key: 'nearby', label: 'Nearby (<1mi)', count: questions.filter(q => parseFloat(q.distance.split(' ')[0]) < 1).length },
    { key: 'medium', label: 'Medium Priority', count: questions.filter(q => q.urgency === 'medium').length },
  ];

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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
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
              {filteredQuestions.length} available
            </Text>
          </View>
          
          <Button
            variant="secondary"
            size="small"
            icon={<SlidersHorizontal size={16} color="#3B82F6" />}
            onPress={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
        </View>
        
        {/* Search Bar */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#F3F4F6',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginBottom: showFilters ? 16 : 0,
        }}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={{
              flex: 1,
              fontSize: 16,
              color: '#111827',
              marginLeft: 12,
            }}
            placeholder="Search questions or locations..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        {/* Filter Chips */}
        {showFilters && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: -16 }}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {filterOptions.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setSelectedFilter(filter.key)}
                style={{
                  backgroundColor: selectedFilter === filter.key ? '#3B82F6' : '#F3F4F6',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginRight: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: selectedFilter === filter.key ? '#FFFFFF' : '#4B5563',
                }}>
                  {filter.label}
                </Text>
                <View style={{
                  marginLeft: 6,
                  backgroundColor: selectedFilter === filter.key ? 'rgba(255,255,255,0.3)' : '#E5E7EB',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 10,
                }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: selectedFilter === filter.key ? '#FFFFFF' : '#6B7280',
                  }}>
                    {filter.count}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Questions List */}
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <LoadingSpinner 
            text="Finding nearby questions..."
            style={{ paddingVertical: 40 }}
          />
        ) : filteredQuestions.length === 0 ? (
          <EmptyState
            variant="search"
            title={searchQuery ? "No matching questions" : "No questions nearby"}
            description={searchQuery 
              ? "Try adjusting your search or filter settings"
              : "Be the first to ask a question in this area!"
            }
            actionLabel={!searchQuery ? "Ask a Question" : undefined}
            onAction={!searchQuery ? () => router.push('/ask') : undefined}
          />
        ) : (
          <View style={{ padding: 16 }}>
            {filteredQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onPress={(q) => handleQuestionPress(q.id)}
                showDistance={true}
              />
            ))}
          </View>
        )}

        {/* Help text */}
        {filteredQuestions.length > 0 && (
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
        )}
      </ScrollView>
    </View>
  );
}
