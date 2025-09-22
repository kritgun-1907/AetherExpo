import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens
import HomeScreen from '../screens/main/HomeScreen';
import TrackingScreen from '../screens/main/TrackingScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import ChallengesScreen from '../screens/main/ChallengesScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator();

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
        component={ProfileScreen}
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