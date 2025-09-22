import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ImageBackground,
  StatusBar,
  Switch,
} from 'react-native';
import { supabase, signOut } from './src/api/supabase';

const BACKGROUND_IMAGE = require('./assets/hero-carbon-tracker.jpg');

export default function ProfileScreen() {
  // Local state for profile data
  const [user, setUser] = useState(null);
  const [dailyEmissions, setDailyEmissions] = useState(0.0);
  const [weeklyEmissions, setWeeklyEmissions] = useState(0);
  const [monthlyEmissions, setMonthlyEmissions] = useState(0);
  const [allTimeEmissions, setAllTimeEmissions] = useState(0);
  const [streak, setStreak] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [achievements, setAchievements] = useState(0);
  
  // Settings state
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode since your app uses dark theme
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
    loadEmissionData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        console.log('Profile user data loaded:', user.email);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmissionData = async () => {
    try {
      // In a real app, you'd fetch this from your database
      // For now, using mock data that matches your screenshot
      setDailyEmissions(0.0);
      setWeeklyEmissions(0);
      setMonthlyEmissions(0);
      setAllTimeEmissions(0);
      setStreak(0);
      setTokens(0);
      setAchievements(0);
    } catch (error) {
      console.error('Error loading emission data:', error);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await signOut();
              if (error) {
                Alert.alert('Error', 'Failed to sign out');
              }
            } catch (error) {
              console.error('Sign out error:', error);
            }
          },
        },
      ]
    );
  };

  const handleDarkModeToggle = (value) => {
    setDarkMode(value);
    // In a real app, you'd save this preference and update your app theme
    Alert.alert(
      'Dark Mode', 
      value ? 'Dark mode enabled' : 'Dark mode disabled',
      [{ text: 'OK' }]
    );
  };

  const handlePushNotificationToggle = (value) => {
    setPushNotifications(value);
    Alert.alert(
      'Push Notifications', 
      value ? 'Push notifications enabled' : 'Push notifications disabled',
      [{ text: 'OK' }]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Your emission data will be exported to a CSV file.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => {
          // In a real app, implement data export functionality
          Alert.alert('Success', 'Data export feature coming soon!');
        }}
      ]
    );
  };

  const getUserInitial = () => {
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const getUserName = () => {
    return user?.email?.split('@')[0] || 'User';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background Image */}
      <ImageBackground 
        source={BACKGROUND_IMAGE} 
        resizeMode="cover" 
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Overlay */}
      <View style={[StyleSheet.absoluteFillObject, styles.overlay]} />

      {/* Content */}
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={true}
        indicatorStyle="white"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getUserInitial()}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{getUserName()}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>🌱 Eco Hero</Text>
          </View>
        </View>

        {/* Emission Stats Grid */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{dailyEmissions.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Today (kg)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{weeklyEmissions}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{monthlyEmissions}</Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{allTimeEmissions}</Text>
              <Text style={styles.statLabel}>All Time</Text>
            </View>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Progress</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressCard}>
              <Text style={styles.progressEmoji}>🔥</Text>
              <Text style={styles.progressValue}>{streak}</Text>
              <Text style={styles.progressLabel}>Day Streak</Text>
            </View>
            <View style={styles.progressCard}>
              <Text style={styles.progressEmoji}>💰</Text>
              <Text style={styles.progressValue}>{tokens}</Text>
              <Text style={styles.progressLabel}>Tokens</Text>
            </View>
            <View style={styles.progressCard}>
              <Text style={styles.progressEmoji}>🏆</Text>
              <Text style={styles.progressValue}>{achievements}</Text>
              <Text style={styles.progressLabel}>Achievements</Text>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingText}>Push Notifications</Text>
            <Switch
              trackColor={{ false: '#767577', true: '#10B981' }}
              thumbColor={pushNotifications ? '#FFFFFF' : '#f4f3f4'}
              onValueChange={handlePushNotificationToggle}
              value={pushNotifications}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingText}>Dark Mode</Text>
            <Switch
              trackColor={{ false: '#767577', true: '#10B981' }}
              thumbColor={darkMode ? '#FFFFFF' : '#f4f3f4'}
              onValueChange={handleDarkModeToggle}
              value={darkMode}
            />
          </View>
        </View>

        {/* Export Data Button */}
        <TouchableOpacity style={styles.exportButton} onPress={handleExportData}>
          <Text style={styles.exportIcon}>📊</Text>
          <Text style={styles.exportText}>Export My Data</Text>
        </TouchableOpacity>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  overlay: {
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  loadingText: {
    color: '#10B981',
    fontSize: 18,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 15,
  },
  badgeContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },

  // Stats Section
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 7.5,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Progress Section
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  progressEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  progressValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 5,
  },
  progressLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Settings
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  settingText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  // Export Button
  exportButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  exportIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  exportText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Sign Out Button
  signOutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  bottomSpacing: {
    height: 100,
  },
});