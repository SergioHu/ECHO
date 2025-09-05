import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { 
  User, 
  Star, 
  DollarSign, 
  MessageCircle, 
  Settings, 
  HelpCircle, 
  LogOut,
  Camera,
  MapPin
} from 'lucide-react-native';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  
  // Mock user data
  const [user] = useState({
    name: "Jordan Smith",
    username: "@jordan_s",
    rating: 4.8,
    totalEarnings: 127.50,
    questionsAsked: 15,
    questionsAnswered: 23,
    memberSince: "March 2024"
  });

  const menuItems = [
    {
      icon: Settings,
      title: "Account Settings",
      subtitle: "Update your profile and preferences",
      onPress: () => Alert.alert("Coming Soon", "Account settings will be available soon")
    },
    {
      icon: DollarSign,
      title: "Payment & Earnings",
      subtitle: "Manage your payment methods and view earnings",
      onPress: () => Alert.alert("Coming Soon", "Payment settings will be available soon")
    },
    {
      icon: HelpCircle,
      title: "Help & Support",
      subtitle: "Get help or contact support",
      onPress: () => Alert.alert("Help", "For support, please email help@echoapp.com")
    }
  ];

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: () => {
            // TODO: Implement sign out
            console.log("Signing out...");
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={{ 
        backgroundColor: '#fff', 
        paddingTop: insets.top + 16, 
        paddingHorizontal: 20, 
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB'
      }}>
        {/* Profile Info */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#E5E7EB',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12
          }}>
            <User size={40} color="#6B7280" />
          </View>
          
          <Text style={{
            fontSize: 22,
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: 4
          }}>
            {user.name}
          </Text>
          
          <Text style={{
            fontSize: 16,
            color: '#6B7280',
            marginBottom: 8
          }}>
            {user.username}
          </Text>

          {/* Rating */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FEF3C7',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20
          }}>
            <Star size={16} color="#D97706" fill="#D97706" />
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#92400E',
              marginLeft: 4
            }}>
              {user.rating.toFixed(1)} rating
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB'
        }}>
          <View style={{ alignItems: 'center' }}>
            <DollarSign size={20} color="#10B981" />
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#111827',
              marginTop: 4
            }}>
              ${user.totalEarnings.toFixed(2)}
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>
              Total Earned
            </Text>
          </View>

          <View style={{ alignItems: 'center' }}>
            <Camera size={20} color="#3B82F6" />
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#111827',
              marginTop: 4
            }}>
              {user.questionsAnswered}
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>
              Answered
            </Text>
          </View>

          <View style={{ alignItems: 'center' }}>
            <MessageCircle size={20} color="#8B5CF6" />
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#111827',
              marginTop: 4
            }}>
              {user.questionsAsked}
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>
              Asked
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 20 }}>
          {/* Member Since */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <MapPin size={20} color="#6B7280" />
            <Text style={{
              fontSize: 16,
              color: '#374151',
              marginLeft: 12
            }}>
              Echo member since {user.memberSince}
            </Text>
          </View>

          {/* Menu Items */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            marginBottom: 20
          }}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={item.onPress}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                  borderBottomColor: '#E5E7EB'
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12
                }}>
                  <item.icon size={20} color="#6B7280" />
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: 2
                  }}>
                    {item.title}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#6B7280'
                  }}>
                    {item.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <LogOut size={20} color="#EF4444" />
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#EF4444',
              marginLeft: 8
            }}>
              Sign Out
            </Text>
          </TouchableOpacity>

          {/* Version Info */}
          <Text style={{
            fontSize: 12,
            color: '#9CA3AF',
            textAlign: 'center',
            marginTop: 32,
            marginBottom: 20
          }}>
            Echo v1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}