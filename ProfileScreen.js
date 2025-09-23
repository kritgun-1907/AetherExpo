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
  Modal,
} from 'react-native';
import { supabase, signOut } from './src/api/supabase';
import { useTheme } from './src/context/ThemeContext';
import { useCarbonStore } from './src/store/carbonStore'; // Add this import

const BACKGROUND_IMAGE = require('./assets/hero-carbon-tracker.jpg');

export default function ProfileScreen({ navigation }) { // Add navigation prop
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
  const [isPremium, setIsPremium] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false); // Add premium modal state
  
  // Settings state
  const [pushNotifications, setPushNotifications] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
    loadEmissionData();
    checkPremiumStatus();
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get today's emissions
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: todayData } = await supabase
          .from('emissions')
          .select('amount')
          .eq('user_id', user.id)
          .gte('created_at', today.toISOString());
        
        const todayTotal = todayData?.reduce((sum, emission) => sum + emission.amount, 0) || 0;
        setDailyEmissions(todayTotal);
        
        // Get this week's emissions
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        
        const { data: weekData } = await supabase
          .from('emissions')
          .select('amount')
          .eq('user_id', user.id)
          .gte('created_at', weekStart.toISOString());
        
        const weekTotal = weekData?.reduce((sum, emission) => sum + emission.amount, 0) || 0;
        setWeeklyEmissions(weekTotal);
        
        // Get this month's emissions
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        
        const { data: monthData } = await supabase
          .from('emissions')
          .select('amount')
          .eq('user_id', user.id)
          .gte('created_at', monthStart.toISOString());
        
        const monthTotal = monthData?.reduce((sum, emission) => sum + emission.amount, 0) || 0;
        setMonthlyEmissions(monthTotal);
        
        // Get all time emissions
        const { data: allTimeData } = await supabase
          .from('emissions')
          .select('amount')
          .eq('user_id', user.id);
        
        const allTimeTotal = allTimeData?.reduce((sum, emission) => sum + emission.amount, 0) || 0;
        setAllTimeEmissions(allTimeTotal);
        
        // Calculate streak (consecutive days with emissions)
        const { data: recentData } = await supabase
          .from('emissions')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30);
        
        let streakCount = 0;
        const uniqueDays = [...new Set(recentData?.map(item => 
          new Date(item.created_at).toDateString()) || [])];
        
        for (let i = 0; i < uniqueDays.length; i++) {
          const checkDate = new Date();
          checkDate.setDate(checkDate.getDate() - i);
          
          if (uniqueDays.includes(checkDate.toDateString())) {
            streakCount++;
          } else {
            break;
          }
        }
        setStreak(streakCount);
        
        // Set tokens and achievements
        setTokens(30);
        setAchievements(2);
      }
    } catch (error) {
      console.error('Error loading emission data:', error);
      // Fallback to local storage or Zustand store
      try {
        const { dailyEmissions: localDaily } = useCarbonStore.getState();
        setDailyEmissions(localDaily);
      } catch (storeError) {
        console.error('Error accessing carbon store:', storeError);
      }
    }
  };

  // Add premium status check
  const checkPremiumStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();
        
        setIsPremium(!!subscription);
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
    }
  };

  // Add navigation to Gift Voucher screen
  const navigateToGiftVouchers = () => {
    navigation.navigate('GiftVoucher');
  };

  // Add navigation to Carbon Offset screen
  const navigateToCarbonOffsets = () => {
    navigation.navigate('CarbonOffset');
  };

  // Add premium modal toggle
  const togglePremiumModal = () => {
    setPremiumModalVisible(!premiumModalVisible);
  };

  // Add premium upgrade handler
  const handlePremiumUpgrade = (plan) => {
    Alert.alert(
      'Upgrade to Premium',
      `You selected the ${plan} plan. This would normally redirect to payment processing.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: () => {
            // Here you would integrate with your payment processor
            // For now, just close the modal
            setPremiumModalVisible(false);
            Alert.alert('Success', 'Premium upgrade feature coming soon!');
          }
        }
      ]
    );
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
            <Text style={[styles.badgeText, { color: theme.accentText }]}>
              {isPremium ? '👑 Premium User' : '🌱 Eco Hero'}
            </Text>
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
              <Text style={[styles.statValue, { color: theme.accentText }]}>{weeklyEmissions.toFixed(1)}</Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>This Week</Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={[dynamicStyles.statCard]}>
              <Text style={[styles.statValue, { color: theme.accentText }]}>{monthlyEmissions.toFixed(1)}</Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>This Month</Text>
            </View>
            <View style={[dynamicStyles.statCard]}>
              <Text style={[styles.statValue, { color: theme.accentText }]}>{allTimeEmissions.toFixed(1)}</Text>
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

        {/* NEW: Rewards & Features Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Rewards & Features</Text>
          
          {/* Gift Voucher Button */}
          <TouchableOpacity 
            style={[dynamicStyles.featureButton, { backgroundColor: isDarkMode ? 'rgba(74, 222, 128, 0.8)' : '#10B981' }]} 
            onPress={navigateToGiftVouchers}
          >
            <Text style={styles.featureIcon}>🎁</Text>
            <View style={styles.featureTextContainer}>
              <Text style={[styles.featureTitle, { color: theme.buttonText }]}>Gift Vouchers</Text>
              <Text style={[styles.featureSubtitle, { color: theme.buttonText, opacity: 0.9 }]}>
                Earn rewards for reducing emissions
              </Text>
            </View>
            <Text style={[styles.featureArrow, { color: theme.buttonText }]}>→</Text>
          </TouchableOpacity>

          {/* Carbon Offset Button */}
          <TouchableOpacity 
            style={[dynamicStyles.featureButton, { backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.8)' : '#059669' }]} 
            onPress={navigateToCarbonOffsets}
          >
            <Text style={styles.featureIcon}>🌍</Text>
            <View style={styles.featureTextContainer}>
              <Text style={[styles.featureTitle, { color: theme.buttonText }]}>Carbon Offsets</Text>
              <Text style={[styles.featureSubtitle, { color: theme.buttonText, opacity: 0.9 }]}>
                Invest in climate projects
              </Text>
            </View>
            <Text style={[styles.featureArrow, { color: theme.buttonText }]}>→</Text>
          </TouchableOpacity>

          {/* Premium Upgrade Button */}
          {!isPremium && (
            <TouchableOpacity 
              style={[dynamicStyles.featureButton, { backgroundColor: isDarkMode ? 'rgba(147, 51, 234, 0.8)' : '#7C3AED' }]} 
              onPress={togglePremiumModal}
            >
              <Text style={styles.featureIcon}>👑</Text>
              <View style={styles.featureTextContainer}>
                <Text style={[styles.featureTitle, { color: theme.buttonText }]}>Upgrade to Premium</Text>
                <Text style={[styles.featureSubtitle, { color: theme.buttonText, opacity: 0.9 }]}>
                  Unlock exclusive features
                </Text>
              </View>
              <Text style={[styles.featureArrow, { color: theme.buttonText }]}>→</Text>
            </TouchableOpacity>
          )}
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

      {/* Premium Subscription Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={premiumModalVisible}
        onRequestClose={togglePremiumModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {
            backgroundColor: theme.cardBackground,
            borderColor: isDarkMode ? theme.border : 'transparent',
          }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.primaryText }]}>
                👑 Upgrade to Premium
              </Text>
              <TouchableOpacity onPress={togglePremiumModal} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: theme.secondaryText }]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalSubtitle, { color: theme.secondaryText }]}>
              Unlock advanced features and maximize your carbon impact
            </Text>

            {/* Premium Plans */}
            <View style={styles.plansContainer}>
              {/* Basic Plan */}
              <TouchableOpacity 
                style={[styles.planCard, {
                  backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                  borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : '#3B82F6',
                }]}
                onPress={() => handlePremiumUpgrade('Basic')}
              >
                <Text style={[styles.planName, { color: theme.primaryText }]}>Basic</Text>
                <Text style={[styles.planPrice, { color: theme.accentText }]}>$4.99/month</Text>
                <View style={styles.planFeatures}>
                  <Text style={[styles.planFeature, { color: theme.secondaryText }]}>• Unlimited bank connections</Text>
                  <Text style={[styles.planFeature, { color: theme.secondaryText }]}>• Advanced analytics</Text>
                  <Text style={[styles.planFeature, { color: theme.secondaryText }]}>• Monthly offset recommendations</Text>
                  <Text style={[styles.planFeature, { color: theme.secondaryText }]}>• Basic gift vouchers</Text>
                </View>
              </TouchableOpacity>

              {/* Premium Plan */}
              <TouchableOpacity 
                style={[styles.planCard, styles.premiumPlan, {
                  backgroundColor: isDarkMode ? 'rgba(147, 51, 234, 0.3)' : '#F3E8FF',
                  borderColor: isDarkMode ? 'rgba(147, 51, 234, 0.4)' : '#7C3AED',
                }]}
                onPress={() => handlePremiumUpgrade('Premium')}
              >
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
                <Text style={[styles.planName, { color: theme.primaryText }]}>Premium</Text>
                <Text style={[styles.planPrice, { color: theme.accentText }]}>$9.99/month</Text>
                <View style={styles.planFeatures}>
                  <Text style={[styles.planFeature, { color: theme.secondaryText }]}>• All Basic features</Text>
                  <Text style={[styles.planFeature, { color: theme.secondaryText }]}>• Real-time carbon tracking</Text>
                  <Text style={[styles.planFeature, { color: theme.secondaryText }]}>• Premium gift vouchers</Text>
                  <Text style={[styles.planFeature, { color: theme.secondaryText }]}>• Custom offset portfolios</Text>
                  <Text style={[styles.planFeature, { color: theme.secondaryText }]}>• Carbon impact reports</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: theme.accentText }]}
              onPress={() => handlePremiumUpgrade('Premium')}
            >
              <Text style={[styles.upgradeButtonText, { color: theme.buttonText }]}>
                Start Free Trial
              </Text>
            </TouchableOpacity>

            <Text style={[styles.trialText, { color: theme.secondaryText }]}>
              7-day free trial, cancel anytime
            </Text>
          </View>
        </View>
      </Modal>
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
  featureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
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

  // Feature Buttons
  featureIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: 12,
  },
  featureArrow: {
    fontSize: 18,
    fontWeight: 'bold',
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 25,
    lineHeight: 22,
  },

  // Premium Plans
  plansContainer: {
    marginBottom: 25,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    position: 'relative',
  },
  premiumPlan: {
    transform: [{ scale: 1.02 }],
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  popularText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  planFeatures: {
    marginTop: 10,
  },
  planFeature: {
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  upgradeButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 15,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  trialText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  bottomSpacing: {
    height: 100,
  },
});