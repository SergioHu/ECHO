import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  ChevronRight, 
  AlertTriangle,
  User,
  Navigation
} from 'lucide-react-native';
import Card from './Card';

const QuestionCard = ({
  question,
  onPress,
  showUser = false,
  showDistance = true,
  showStatus = false,
  variant = 'default', // 'default', 'conversation', 'compact'
  style,
}) => {
  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'answered':
        return '#10B981';
      case 'completed':
        return '#6B7280';
      case 'in_progress':
        return '#F59E0B';
      case 'pending':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'answered':
        return 'Answered';
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      default:
        return 'Active';
    }
  };

  const isCompact = variant === 'compact';
  const isConversation = variant === 'conversation';

  return (
    <Card
      style={[
        { marginBottom: 12 },
        isCompact && { padding: 12 },
        style,
      ]}
      shadow={!isCompact}
    >
      <TouchableOpacity
        onPress={() => onPress && onPress(question)}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
        }}
      >
        <View style={{ flex: 1 }}>
          {/* Header with urgency indicator */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: 8 
          }}>
            {question.urgency && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: `${getUrgencyColor(question.urgency)}15`,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  alignSelf: 'flex-start',
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: getUrgencyColor(question.urgency),
                    marginRight: 6,
                  }}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: getUrgencyColor(question.urgency),
                    textTransform: 'uppercase',
                  }}
                >
                  {question.urgency}
                </Text>
              </View>
            )}

            {showStatus && question.status && (
              <View
                style={{
                  backgroundColor: `${getStatusColor(question.status)}15`,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: getStatusColor(question.status),
                  }}
                >
                  {getStatusText(question.status)}
                </Text>
              </View>
            )}
          </View>

          {/* Question Title */}
          <Text
            style={{
              fontSize: isCompact ? 15 : 16,
              fontWeight: '600',
              color: '#111827',
              lineHeight: isCompact ? 20 : 22,
              marginBottom: 8,
            }}
            numberOfLines={isCompact ? 2 : 3}
          >
            {question.title || question.question}
          </Text>

          {/* User Info (for conversation variant) */}
          {showUser && question.otherUser && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 8,
            }}>
              <User size={14} color="#6B7280" />
              <Text style={{
                fontSize: 14,
                color: '#6B7280',
                marginLeft: 6,
              }}>
                with {question.otherUser}
              </Text>
            </View>
          )}

          {/* Location and Details Row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              {/* Location */}
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MapPin size={14} color="#6B7280" />
                <Text
                  style={{
                    fontSize: 14,
                    color: '#6B7280',
                    marginLeft: 4,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {question.location}
                </Text>
              </View>

              {/* Distance */}
              {showDistance && question.distance && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
                  <Navigation size={14} color="#6B7280" />
                  <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 4 }}>
                    {question.distance}
                  </Text>
                </View>
              )}
            </View>

            {/* Reward and Time */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Time */}
              {question.timeAgo && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Clock size={14} color="#6B7280" />
                  <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 4 }}>
                    {question.timeAgo}
                  </Text>
                </View>
              )}

              {/* Reward */}
              {question.reward && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FEF3C7',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    marginLeft: question.timeAgo ? 12 : 0,
                  }}
                >
                  <DollarSign size={14} color="#D97706" />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#92400E',
                      marginLeft: 2,
                    }}
                  >
                    {question.reward.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Last Message for conversation variant */}
          {isConversation && question.lastMessage && (
            <View style={{
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: '#F3F4F6',
            }}>
              <Text style={{
                fontSize: 14,
                color: '#4B5563',
                fontStyle: 'italic',
              }} numberOfLines={2}>
                "{question.lastMessage}"
              </Text>
            </View>
          )}

          {/* Unread indicator for conversations */}
          {isConversation && question.unreadCount > 0 && (
            <View style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#EF4444',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#FFFFFF',
              }}>
                {question.unreadCount > 9 ? '9+' : question.unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* Arrow indicator */}
        <ChevronRight size={20} color="#9CA3AF" style={{ marginLeft: 12, marginTop: 4 }} />
      </TouchableOpacity>
    </Card>
  );
};

export default QuestionCard;
