// src/navigation/AppNavigator.js - COMPLETE FIXED VERSION
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';

// Import navigators
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';

// Import all additional screens that need to be accessible globally
import GiftVoucherScreen from '../screens/main/GiftVoucherScreen';
import CarbonOffsetScreen from '../screens/main/CarbonOffsetScreen';
import PaymentScreen from '../screens/main/PaymentScreen';

const Stack = createStackNavigator();
const MainStack = createStackNavigator();

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
        },
      },
      Main: {
        screens: {
          MainTabs: {
            screens: {
              Home: 'home',
              Track: 'track',
              Leaderboard: 'leaderboard',
              Challenges: 'challenges',
              Profile: 'profile',
            },
          },
          PaymentScreen: 'payment',
          GiftVoucher: 'gift-voucher',
          CarbonOffset: 'carbon-offset',
        },
      },
    },
  },
};

// Main Navigator that includes tabs and standalone screens
function MainNavigator() {
  return (
    <MainStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        presentation: 'card' 
      }}
    >
      {/* Main Tab Navigator */}
      <MainStack.Screen 
        name="MainTabs" 
        component={TabNavigator} 
      />
      
      {/* Payment Screen - Accessible from anywhere */}
      <MainStack.Screen 
        name="PaymentScreen" 
        component={PaymentScreen}
        options={{
          headerShown: true,
          title: 'Payment',
          headerBackTitleVisible: false,
          headerStyle: {
            backgroundColor: '#10B981',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      
      {/* Gift Voucher Screen */}
      <MainStack.Screen 
        name="GiftVoucher" 
        component={GiftVoucherScreen}
        options={{
          headerShown: true,
          title: 'Gift Vouchers',
          headerBackTitleVisible: false,
        }}
      />
      
      {/* Carbon Offset Screen */}
      <MainStack.Screen 
        name="CarbonOffset" 
        component={CarbonOffsetScreen}
        options={{
          headerShown: true,
          title: 'Carbon Offsets',
          headerBackTitleVisible: false,
        }}
      />
    </MainStack.Navigator>
  );
}

export default function AppNavigator({ isAuthenticated }) {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}