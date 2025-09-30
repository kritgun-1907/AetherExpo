// src/navigation/TabNavigator.js - FIXED VERSION
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens - CORRECTED PATHS
import HomeScreen from '../../HomeScreen'; // Go up 2 levels to root
import TrackingScreen from '../../TrackingScreen'; // Go up 2 levels to root
import LeaderboardScreen from '../screens/main/LeaderboardScreen'; // Go up 1, then into screens/main
import ChallengesScreen from '../screens/main/ChallengesScreen'; // Go up 1, then into screens/main
import ProfileScreen from '../../ProfileScreen'; // Go up 2 levels to root
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
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60
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