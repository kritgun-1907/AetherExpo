// src/navigation/TabNavigator.js - FIXED WITH DARK THEME
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';

// Import screens
import HomeScreen from '../../HomeScreen';
import TrackingScreen from '../../TrackingScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import ChallengesScreen from '../screens/main/ChallengesScreen';
import ProfileScreen from '../../ProfileScreen';
import PaymentScreen from '../screens/main/PaymentScreen';
import GiftVoucherScreen from '../screens/main/GiftVoucherScreen';
import CarbonOffsetScreen from '../screens/main/CarbonOffsetScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Create a stack navigator for Profile and related screens
const ProfileStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen 
        name="PaymentScreen" 
        component={PaymentScreen}
        options={{
          headerShown: true,
          title: 'Payment',
          headerStyle: {
            backgroundColor: '#10B981',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen 
        name="GiftVoucher" 
        component={GiftVoucherScreen}
        options={{
          headerShown: true,
          title: 'Gift Vouchers',
        }}
      />
      <Stack.Screen 
        name="CarbonOffset" 
        component={CarbonOffsetScreen}
        options={{
          headerShown: true,
          title: 'Carbon Offsets',
        }}
      />
    </Stack.Navigator>
  );
};

const TabNavigator = () => {
  const { theme, isDarkMode } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#10B981', // Green active color
        tabBarInactiveTintColor: isDarkMode ? '#9CA3AF' : '#6B7280', // Gray inactive
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF', // Dark gray background for dark mode
          borderTopWidth: 1,
          borderTopColor: isDarkMode ? '#374151' : '#E5E7EB',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDarkMode ? 0.3 : 0.1,
          shadowRadius: 3,
          elevation: isDarkMode ? 8 : 5,
        }
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" color={color} size={size} />
          ),
          headerShown: false
        }}
      />
      
      <Tab.Screen
        name="Track"
        component={TrackingScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="plus-circle" color={color} size={size} />
          ),
          headerShown: false
        }}
      />
      
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="trophy" color={color} size={size} />
          ),
          headerShown: false
        }}
      />
      
      <Tab.Screen
        name="Challenges"
        component={ChallengesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="target" color={color} size={size} />
          ),
          headerShown: false
        }}
      />
      
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" color={color} size={size} />
          ),
          headerShown: false
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;