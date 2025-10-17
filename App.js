// App.js - FIXED VERSION with proper auth navigation
import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';

// Theme Provider
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Import supabase
import { supabase } from './src/api/supabase';
import EmissionSyncService from './src/services/EmissionSyncService';

// Import navigators
import TabNavigator from './src/navigation/TabNavigator';

// Import ALL screens
import LoginScreen from './LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';

// Onboarding Screens
import WelcomeScreen from './src/screens/onboarding/WelcomeScreen';
import PermissionsScreen from './src/screens/onboarding/PermissionsScreen';
import SetupScreen from './src/screens/onboarding/SetupScreen';

// Additional Screens
import GiftVoucherScreen from './src/screens/main/GiftVoucherScreen';
import CarbonOffsetScreen from './src/screens/main/CarbonOffsetScreen';
import PaymentScreen from './src/screens/main/PaymentScreen';

const Stack = createStackNavigator();
const MainStack = createStackNavigator();
const AuthStack = createStackNavigator();
const OnboardingStack = createStackNavigator();

const prefix = Linking.createURL('/');

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Auth Navigator
function AuthStackNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

// Onboarding Navigator
function OnboardingStackNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
      <OnboardingStack.Screen name="Permissions" component={PermissionsScreen} />
      <OnboardingStack.Screen name="Setup" component={SetupScreen} />
    </OnboardingStack.Navigator>
  );
}

// Main Stack with Tabs + Modal Screens
function MainStackNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main Tab Navigator */}
      <MainStack.Screen name="MainTabs" component={TabNavigator} />
      
      {/* Modal Screens */}
      <MainStack.Screen 
        name="PaymentScreen" 
        component={PaymentScreen}
        options={{ presentation: 'modal' }}
      />
      <MainStack.Screen 
        name="GiftVoucher" 
        component={GiftVoucherScreen}
        options={{ headerShown: true, title: 'Gift Vouchers' }}
      />
      <MainStack.Screen 
        name="CarbonOffset" 
        component={CarbonOffsetScreen}
        options={{ headerShown: true, title: 'Carbon Offsets' }}
      />
    </MainStack.Navigator>
  );
}

// Load fonts
async function loadResourcesAsync() {
  try {
    await Font.loadAsync({
      // Add custom fonts if needed
    });
  } catch (e) {
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
            PaymentScreen: 'payment',
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

  // Check first launch
  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    console.log('🔍 Starting checkFirstLaunch...');
    try {
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
      
      console.log('📱 hasLaunched:', hasLaunched);
      console.log('✅ onboardingComplete:', onboardingComplete);
      
      if (hasLaunched === null) {
        console.log('👋 First launch detected');
        await AsyncStorage.setItem('hasLaunched', 'true');
        setIsFirstLaunch(true);
        setIsLoggedIn(false);
        setIsLoading(false);
        return;
      } else if (onboardingComplete !== 'true') {
        console.log('⚠️ Onboarding incomplete');
        setIsFirstLaunch(true);
        setIsLoggedIn(false);
        setIsLoading(false);
        return;
      } else {
        console.log('✓ Returning user');
        setIsFirstLaunch(false);
      }

      // Check current session
      console.log('🔐 Checking Supabase session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log('❌ Session error:', error.message);
        setIsLoggedIn(false);
      } else if (session) {
        console.log('✓ Session found, user is logged in');
        setIsLoggedIn(true);
      } else {
        console.log('⚠️ No session found');
        setIsLoggedIn(false);
      }
      
    } catch (error) {
      console.error('💥 Error in checkFirstLaunch:', error);
      setIsFirstLaunch(false);
      setIsLoggedIn(false);
    } finally {
      console.log('🏁 Setting isLoading to false');
      setIsLoading(false);
    }
  };

  // Initialize EmissionSyncService when user is logged in
  useEffect(() => {
    const initializeSync = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await EmissionSyncService.initialize(user.id);
        console.log('✅ EmissionSyncService initialized');
      }
    };
    
    if (isLoggedIn) {
      initializeSync();
    }
    
    return () => {
      EmissionSyncService.cleanup();
    };
  }, [isLoggedIn]);

  // Set up auth state listener - THIS IS THE KEY FIX
  useEffect(() => {
    console.log('🎧 Setting up auth state listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth state changed:', event);
        console.log('👤 Session exists:', !!session);
        
        if (event === 'SIGNED_IN' && session) {
          console.log('✅ User signed in, updating state...');
          setIsLoggedIn(true);
          setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out, updating state...');
          setIsLoggedIn(false);
          setIsLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('🔄 Token refreshed');
          setIsLoggedIn(true);
        } else if (session) {
          // Handle other events with active session
          console.log('📝 Session update:', event);
          setIsLoggedIn(true);
        } else {
          console.log('⚠️ No session in auth state change');
          setIsLoggedIn(false);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      console.log('🧹 Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  // Show loading screen while initializing
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

  console.log('🎯 Current state - isFirstLaunch:', isFirstLaunch, 'isLoggedIn:', isLoggedIn);

  return (
    <NavigationContainer linking={linking} fallback={<Text>Loading...</Text>}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isFirstLaunch ? (
          // Show onboarding for first-time users
          <Stack.Screen name="Onboarding" component={OnboardingStackNavigator} />
        ) : isLoggedIn ? (
          // Show main app for logged-in users
          <Stack.Screen name="Main" component={MainStackNavigator} />
        ) : (
          // Show auth for non-logged-in returning users
          <Stack.Screen name="Auth" component={AuthStackNavigator} />
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