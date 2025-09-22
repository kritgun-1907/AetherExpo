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
import { useTheme } from './src/context/ThemeContext';

const BACKGROUND_IMAGE = require('./assets/hero-carbon-tracker.jpg');

export default function ProfileScreen() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  
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
      // Mock data that matches your screenshot
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

  const handleDarkModeToggle = () => {
    toggleTheme();
    Alert.alert(
      'Theme Changed', 
      isDarkMode ? 'Switched to Light Mode' : 'Switched to Dark Mode',
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
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.accentText }]}>Loading...</Text>
      </View>
    );
  }

  // Create dynamic styles based on theme
  const dynamicStyles = createDynamicStyles(theme, isDarkMode);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        barStyle={theme.statusBarStyle} 
        backgroundColor="transparent" 
        translucent 
      />
      
      {/* Background Image - only show in dark mode */}
      {isDarkMode && (
        <>
          <ImageBackground 
            source={BACKGROUND_IMAGE} 
            resizeMode="cover" 
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.overlayBackground }]} />
        </>
      )}

      {/* Content */}
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={true}
        indicatorStyle={isDarkMode ? "white" : "black"}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={[dynamicStyles.avatar]}>
              <Text style={[styles.avatarText, { color: theme.buttonText }]}>{getUserInitial()}</Text>
            </View>
          </View>
          <Text style={[styles.userName, { color: theme.primaryText }]}>{getUserName()}</Text>
          <Text style={[styles.userEmail, { color: theme.secondaryText }]}>{user?.email}</Text>
          <View style={[dynamicStyles.badgeContainer]}>
            <Text style={[styles.badgeText, { color: theme.accentText }]}>🌱 Eco Hero</Text>
          </View>
        </View>

        {/* Emission Stats Grid */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <View style={[dynamicStyles.statCard]}>
              <Text style={[styles.statValue, { color: theme.accentText }]}>{dailyEmissions.toFixed(1)}</Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Today (kg)</Text>
            </View>
            <View style={[dynamicStyles.statCard]}>
              <Text style={[styles.statValue, { color: theme.accentText }]}>{weeklyEmissions}</Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>This Week</Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={[dynamicStyles.statCard]}>
              <Text style={[styles.statValue, { color: theme.accentText }]}>{monthlyEmissions}</Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>This Month</Text>
            </View>
            <View style={[dynamicStyles.statCard]}>
              <Text style={[styles.statValue, { color: theme.accentText }]}>{allTimeEmissions}</Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>All Time</Text>
            </View>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Your Progress</Text>
          <View style={styles.progressRow}>
            <View style={[dynamicStyles.progressCard]}>
              <Text style={styles.progressEmoji}>🔥</Text>
              <Text style={[styles.progressValue, { color: theme.accentText }]}>{streak}</Text>
              <Text style={[styles.progressLabel, { color: theme.secondaryText }]}>Day Streak</Text>
            </View>
            <View style={[dynamicStyles.progressCard]}>
              <Text style={styles.progressEmoji}>💰</Text>
              <Text style={[styles.progressValue, { color: theme.accentText }]}>{tokens}</Text>
              <Text style={[styles.progressLabel, { color: theme.secondaryText }]}>Tokens</Text>
            </View>
            <View style={[dynamicStyles.progressCard]}>
              <Text style={styles.progressEmoji}>🏆</Text>
              <Text style={[styles.progressValue, { color: theme.accentText }]}>{achievements}</Text>
              <Text style={[styles.progressLabel, { color: theme.secondaryText }]}>Achievements</Text>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Settings</Text>
          
          <View style={[dynamicStyles.settingItem]}>
            <Text style={[styles.settingText, { color: theme.primaryText }]}>Push Notifications</Text>
            <Switch
              trackColor={{ false: '#767577', true: theme.accentText }}
              thumbColor={pushNotifications ? '#FFFFFF' : '#f4f3f4'}
              onValueChange={handlePushNotificationToggle}
              value={pushNotifications}
            />
          </View>

          <View style={[dynamicStyles.settingItem]}>
            <Text style={[styles.settingText, { color: theme.primaryText }]}>Dark Mode</Text>
            <Switch
              trackColor={{ false: '#767577', true: theme.accentText }}
              thumbColor={isDarkMode ? '#FFFFFF' : '#f4f3f4'}
              onValueChange={handleDarkModeToggle}
              value={isDarkMode}
            />
          </View>
        </View>

        {/* Export Data Button */}
        <TouchableOpacity style={[dynamicStyles.exportButton]} onPress={handleExportData}>
          <Text style={styles.exportIcon}>📊</Text>
          <Text style={[styles.exportText, { color: theme.buttonText }]}>Export My Data</Text>
        </TouchableOpacity>

        {/* Sign Out Button */}
        <TouchableOpacity style={[dynamicStyles.signOutButton]} onPress={handleSignOut}>
          <Text style={[styles.signOutText, { color: theme.buttonText }]}>Sign Out</Text>
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

// Function to create dynamic styles based on theme
const createDynamicStyles = (theme, isDarkMode) => ({
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.accentText,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : theme.border,
  },
  badgeContainer: {
    backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : theme.accentText,
  },
  statCard: {
    flex: 1,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : theme.cardBackground,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 7.5,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : theme.border,
    shadowColor: isDarkMode ? 'transparent' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0 : 0.1,
    shadowRadius: 3,
    elevation: isDarkMode ? 0 : 3,
  },
  progressCard: {
    flex: 1,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : theme.cardBackground,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : theme.border,
    shadowColor: isDarkMode ? 'transparent' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0 : 0.1,
    shadowRadius: 3,
    elevation: isDarkMode ? 0 : 3,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : theme.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : theme.border,
    shadowColor: isDarkMode ? 'transparent' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0 : 0.1,
    shadowRadius: 3,
    elevation: isDarkMode ? 0 : 3,
  },
  exportButton: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.8)' : '#3B82F6',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : '#3B82F6',
  },
  signOutButton: {
    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.8)' : '#EF4444',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#EF4444',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
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
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 15,
  },
  badgeText: {
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
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
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
    marginBottom: 20,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  progressValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  progressLabel: {
    fontSize: 12,
    textAlign: 'center',
  },

  // Settings
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Export Button
  exportIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  exportText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Sign Out Button
  signOutText: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  bottomSpacing: {
    height: 100,
  },
});