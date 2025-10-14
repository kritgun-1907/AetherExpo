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
import { Ionicons } from '@expo/vector-icons';
import { supabase, signOut } from './src/api/supabase';
import { useTheme } from './src/context/ThemeContext';
import { useEmissions } from './src/hooks/useEmissions';
import AvatarUpload from './src/components/profile/AvatarUpload';
import FriendsList from './src/components/social/FriendsList';

const BACKGROUND_IMAGE = require('./assets/hero-carbon-tracker.jpg');

export default function ProfileScreen({ navigation }) {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { emissions, loadEmissions } = useEmissions();
  
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
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [profile, setProfile] = useState(null);
  
  // Settings state
  const [pushNotifications, setPushNotifications] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
    loadEmissionData();
    checkPremiumStatus();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('profile_emissions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'emissions',
        filter: `user_id=eq.${user?.id}`,
      }, () => {
        console.log('Emissions updated, reloading...');
        loadEmissionData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
      
        if (profileData) {
          setProfile(profileData);
          setStreak(profileData.streak_count || 0);
          setTokens(profileData.eco_points || 0);
        }
        
        // Load achievements count
        const { data: achievementsData } = await supabase
          .from('user_achievements')
          .select('id')
          .eq('user_id', user.id);
        
        setAchievements(achievementsData?.length || 0);
        
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
        
        console.log('📊 Emission data loaded:', {
          daily: todayTotal,
          weekly: weekTotal,
          monthly: monthTotal,
          allTime: allTimeTotal
        });
      }
    } catch (error) {
      console.error('Error loading emission data:', error);
    }
  };

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

  const navigateToGiftVouchers = () => {
    navigation.navigate('GiftVoucher');
  };

  const navigateToCarbonOffsets = () => {
    navigation.navigate('CarbonOffset');
  };

  const togglePremiumModal = () => {
    setPremiumModalVisible(!premiumModalVisible);
  };

  const handlePremiumUpgrade = (plan) => {
    const planDetails = {
      basic: { 
        price: 4.99, 
        name: 'Basic', 
        features: [
          'Unlimited bank connections',
          'Advanced analytics',
          'Monthly offset recommendations',
          'Basic gift vouchers',
          'Email support'
        ]
      },
      premium: { 
        price: 9.99, 
        name: 'Premium', 
        features: [
          'All Basic features',
          'Real-time carbon tracking',
          'Premium gift vouchers',
          'Custom offset portfolios',
          'Carbon impact reports',
          'Unlimited friends',
          'Priority support',
          'Early access to features'
        ]
      },
      enterprise: { 
        price: 19.99, 
        name: 'Enterprise',
        features: [
          'All Premium features',
          'Team tracking (50 users)',
          'Corporate offset programs',
          'API access',
          'Custom branding',
          'Dedicated account manager',
          '24/7 priority support'
        ]
      }
    };

    const selectedPlan = planDetails[plan.toLowerCase()];
    
    if (!selectedPlan) {
      Alert.alert('Error', 'Invalid plan selected');
      return;
    }
    
    Alert.alert(
      `Upgrade to ${selectedPlan.name}`,
      `Start your 7-day free trial, then $${selectedPlan.price}/month.\n\nYou'll get:\n${selectedPlan.features.map(f => `• ${f}`).join('\n')}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue to Payment', 
          onPress: () => {
            setPremiumModalVisible(false);
            navigation.navigate('PaymentScreen', { 
              plan: plan.toLowerCase(),
              price: selectedPlan.price,
              planName: selectedPlan.name
            });
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
    return profile?.full_name || user?.email?.split('@')[0] || 'User';
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.accentText }]}>Loading...</Text>
      </View>
    );
  }

  const dynamicStyles = createDynamicStyles(theme, isDarkMode);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        barStyle={theme.statusBarStyle} 
        backgroundColor="transparent" 
        translucent 
      />
      
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

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={true}
        indicatorStyle={isDarkMode ? "white" : "black"}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <AvatarUpload 
            userId={user?.id}
            currentAvatarUrl={profile?.avatar_url}
            onAvatarUpdated={(newUrl) => {
              setProfile(prev => ({ ...prev, avatar_url: newUrl }));
            }}
          />
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

        {/* Rewards & Features Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Rewards & Features</Text>
          
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

          <TouchableOpacity 
            style={[dynamicStyles.featureButton, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.8)' : '#8B5CF6' }]} 
            onPress={() => setFriendsModalVisible(true)}
          >
            <Text style={styles.featureIcon}>👥</Text>
            <View style={styles.featureTextContainer}>
              <Text style={[styles.featureTitle, { color: theme.buttonText }]}>Friends & Social</Text>
              <Text style={[styles.featureSubtitle, { color: theme.buttonText, opacity: 0.9 }]}>
                Connect with friends and compare progress
              </Text>
            </View>
            <Text style={[styles.featureArrow, { color: theme.buttonText }]}>→</Text>
          </TouchableOpacity>
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

        <TouchableOpacity style={[dynamicStyles.exportButton]} onPress={handleExportData}>
          <Text style={styles.exportIcon}>📊</Text>
          <Text style={[styles.exportText, { color: theme.buttonText }]}>Export My Data</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[dynamicStyles.signOutButton]} onPress={handleSignOut}>
          <Text style={[styles.signOutText, { color: theme.buttonText }]}>Sign Out</Text>
        </TouchableOpacity>

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

            <ScrollView 
              style={styles.plansScrollContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Basic Plan */}
              <TouchableOpacity 
                style={[styles.planCard, {
                  backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                  borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : '#3B82F6',
                }]}
                onPress={() => handlePremiumUpgrade('basic')}
              >
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, { color: theme.primaryText }]}>Basic</Text>
                  <View style={[styles.planPriceBadge, { backgroundColor: '#3B82F6' }]}>
                    <Text style={styles.planPriceText}>$4.99</Text>
                    <Text style={styles.planPeriodText}>/month</Text>
                  </View>
                </View>
                
                <View style={styles.planFeatures}>
                  <View style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={[styles.planFeature, { color: theme.secondaryText }]}>
                      Unlimited bank connections
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={[styles.planFeature, { color: theme.secondaryText }]}>
                      Advanced analytics dashboard
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Premium Plan */}
              <TouchableOpacity 
                style={[styles.planCard, styles.premiumPlan, {
                  backgroundColor: isDarkMode ? 'rgba(147, 51, 234, 0.3)' : '#F3E8FF',
                  borderColor: isDarkMode ? 'rgba(147, 51, 234, 0.4)' : '#7C3AED',
                }]}
                onPress={() => handlePremiumUpgrade('premium')}
              >
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>⭐ MOST POPULAR</Text>
                </View>
                
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, { color: theme.primaryText }]}>Premium</Text>
                  <View style={[styles.planPriceBadge, { backgroundColor: '#7C3AED' }]}>
                    <Text style={styles.planPriceText}>$9.99</Text>
                    <Text style={styles.planPeriodText}>/month</Text>
                  </View>
                </View>
                
                <View style={styles.planFeatures}>
                  <View style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={[styles.planFeature, { color: theme.secondaryText }]}>
                      <Text style={{ fontWeight: 'bold' }}>All Basic features</Text>
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={[styles.planFeature, { color: theme.secondaryText }]}>
                      Real-time carbon tracking
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Enterprise Plan */}
              <TouchableOpacity 
                style={[styles.planCard, {
                  backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
                  borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : '#10B981',
                }]}
                onPress={() => handlePremiumUpgrade('enterprise')}
              >
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, { color: theme.primaryText }]}>Enterprise</Text>
                  <View style={[styles.planPriceBadge, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.planPriceText}>$19.99</Text>
                    <Text style={styles.planPeriodText}>/month</Text>
                  </View>
                </View>
                
                <View style={styles.planFeatures}>
                  <View style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={[styles.planFeature, { color: theme.secondaryText }]}>
                      <Text style={{ fontWeight: 'bold' }}>All Premium features</Text>
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={[styles.planFeature, { color: theme.secondaryText }]}>
                      Team tracking (up to 50 users)
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: theme.accentText }]}
              onPress={() => handlePremiumUpgrade('premium')}
            >
              <Text style={[styles.upgradeButtonText, { color: theme.buttonText }]}>
                Start 7-Day Free Trial
              </Text>
            </TouchableOpacity>

            <Text style={[styles.trialText, { color: theme.secondaryText }]}>
              No credit card required • Cancel anytime
            </Text>
          </View>
        </View>
      </Modal>

      {/* Friends List Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={friendsModalVisible}
        onRequestClose={() => setFriendsModalVisible(false)}
      >
        <View style={[styles.modalFullScreen, { backgroundColor: theme.background }]}>
          <View style={styles.modalNavHeader}>
            <TouchableOpacity
              onPress={() => setFriendsModalVisible(false)}
              style={styles.modalBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.primaryText} />
            </TouchableOpacity>
            <Text style={[styles.modalNavTitle, { color: theme.primaryText }]}>
              Friends & Social
            </Text>
            <View style={{ width: 24 }} />
          </View>
          
          <FriendsList 
            onFriendSelect={(friend) => {
              console.log('Friend selected:', friend);
              Alert.alert('Friend Profile', `${friend.full_name}'s profile`);
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
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
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  exportIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  exportText: {
    fontSize: 16,
    fontWeight: '600',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
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
  modalFullScreen: {
    flex: 1,
  },
  modalNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalBackButton: {
    padding: 5,
  },
  modalNavTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  plansScrollContainer: {
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
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  planPriceBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  planPriceText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  planPeriodText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 2,
  },
  planFeatures: {
    marginTop: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  planFeature: {
    fontSize: 14,
    flex: 1,
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