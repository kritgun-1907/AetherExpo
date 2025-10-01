// App.js - Fixed with proper imports and network timeout handling
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Theme Provider
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Import navigators
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

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

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

// Main Stack Navigator
function MainStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
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
       <Stack.Screen
        name="PaymentScreen"
        component={PaymentScreen}
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

// Load fonts with error handling
async function loadResourcesAsync() {
  try {
    await Font.loadAsync({
      // Only load fonts if you're actually using custom fonts
      // Otherwise, comment these out
      // 'custom-font': require('./assets/fonts/custom-font.ttf'),
    });
  } catch (e) {
    // We might want to provide this error information to an error reporting service
    console.warn('Error loading fonts:', e);
  }
}

// App Content Component
function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingComplete, setLoadingComplete] = useState(false);
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

  // Load resources on mount
  useEffect(() => {
    async function loadResources() {
      try {
        await loadResourcesAsync();
      } catch (e) {
        console.warn(e);
      } finally {
        setLoadingComplete(true);
        SplashScreen.hideAsync();
      }
    }

    loadResources();
  }, []);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      // Check AsyncStorage first (fast, no network required)
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
      
      if (hasLaunched === null) {
        // First time launch - exit early without checking Supabase
        await AsyncStorage.setItem('hasLaunched', 'true');
        setIsFirstLaunch(true);
        setIsLoggedIn(false);
        setIsLoading(false);
        return;
      } else if (onboardingComplete !== 'true') {
        // Has launched but didn't complete onboarding - exit early
        setIsFirstLaunch(true);
        setIsLoggedIn(false);
        setIsLoading(false);
        return;
      } else {
        // Not first launch and onboarding complete
        setIsFirstLaunch(false);
      }

      // Only check Supabase session for returning users who completed onboarding
      // Add timeout protection
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session timeout')), 8000)
      );

      try {
        const { data: { session } } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);
        setIsLoggedIn(!!session);
      } catch (sessionError) {
        console.log('Could not check session, defaulting to logged out:', sessionError.message);
        setIsLoggedIn(false);
      }
      
    } catch (error) {
      console.error('Error in checkFirstLaunch:', error);
      setIsFirstLaunch(false);
      setIsLoggedIn(false);
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

  if (!isLoadingComplete || isLoading) {
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