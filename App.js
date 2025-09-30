// App.js - Updated with Onboarding Flow
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme Provider
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

//navigation
import AppNavigator from './src/navigation/AppNavigator';
import TabNavigator from './src/navigation/TabNavigator'; 

// Import ALL screens including onboarding
import LoginScreen from './LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';

// Onboarding Screens
import WelcomeScreen from './src/screens/onboarding/WelcomeScreen';
import PermissionsScreen from './src/screens/onboarding/PermissionsScreen';
import SetupScreen from './src/screens/onboarding/SetupScreen';

// Main Screens
import HomeScreen from './HomeScreen';
import TrackingScreen from './TrackingScreen';
import ProfileScreen from './ProfileScreen'; 
import LeaderboardScreen from './src/screens/main/LeaderboardScreen';
import ChallengesScreen from './src/screens/main/ChallengesScreen';
import GiftVoucherScreen from './src/screens/main/GiftVoucherScreen';
import CarbonOffsetScreen from './src/screens/main/CarbonOffsetScreen';
import PaymentScreen from './src/screens/main/PaymentScreen';

// Import Supabase
import { supabase } from './src/api/supabase';

const prefix = Linking.createURL('/');
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Onboarding Stack
function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
      <Stack.Screen name="Setup" component={SetupScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// Auth Stack
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// In App.js, make sure MainTabs is rendered correctly
function MainTabs() {
  const { theme, isDarkMode } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Track') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Leaderboard') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Challenges') {
            iconName = focused ? 'ribbon' : 'ribbon-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.tabBarBackground,
          borderTopColor: theme.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Track" component={TrackingScreen} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Challenges" component={ChallengesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Main Stack Navigator
function MainStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
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

// App Content Component
function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();

  const linking = {
    prefixes: [prefix],
    config: {
      screens: {
        Onboarding: {
          screens: {
            Welcome: 'welcome',
            Permissions: 'permissions',
            Setup: 'setup',
          },
        },
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
            GiftVoucher: 'gift-voucher',
            CarbonOffset: 'carbon-offset',
          },
        },
      },
    },
  };

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      // Check if this is the first launch
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
      
      if (hasLaunched === null) {
        // First time launch
        await AsyncStorage.setItem('hasLaunched', 'true');
        setIsFirstLaunch(true);
      } else if (onboardingComplete !== 'true') {
        // Has launched but didn't complete onboarding
        setIsFirstLaunch(true);
      } else {
        // Not first launch and onboarding complete
        setIsFirstLaunch(false);
      }

      // Check the session state
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      
    } catch (error) {
      console.error('Error checking first launch:', error);
      setIsFirstLaunch(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Set up the real-time listener for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    // Cleanup the listener when the app closes
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: theme.background
      }}>
        <ActivityIndicator size="large" color={theme.accentText} />
        <Text style={{ color: theme.primaryText, marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking} fallback={<Text>Loading...</Text>}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isFirstLaunch ? (
          // Show onboarding for first-time users
          <Stack.Screen name="Onboarding" component={OnboardingStack} />
        ) : isLoggedIn ? (
          // Show main app for logged-in users
          <Stack.Screen name="Main" component={MainStackNavigator} />
        ) : (
          // Show auth for non-logged-in returning users
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Main App Component
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}