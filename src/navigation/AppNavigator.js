// src/navigation/AppNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';

// Import navigators
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';

// Import additional screens
import GiftVoucherScreen from '../screens/main/GiftVoucherScreen';
import CarbonOffsetScreen from '../screens/main/CarbonOffsetScreen';

const Stack = createStackNavigator();
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
          Tabs: {
            screens: {
              Home: 'home',
              Track: 'track',
              Leaderboard: 'leaderboard',
              Challenges: 'challenges',
              Profile: 'profile',
            },
          },
          GiftVoucher: 'gift-voucher',
          CarbonOffset: 'carbon-offset',
        },
      },
    },
  },
};

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

function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen 
        name="GiftVoucher" 
        component={GiftVoucherScreen}
        options={{
          headerShown: true,
          title: 'Gift Vouchers',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name="CarbonOffset" 
        component={CarbonOffsetScreen}
        options={{
          headerShown: true,
          title: 'Carbon Offsets',
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}