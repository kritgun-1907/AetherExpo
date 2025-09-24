import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ImageBackground,
  StatusBar,
  ScrollView,
  FlatList,
} from 'react-native';
import { supabase, addEmission, testDatabaseConnection, debugEmissionInsert,incrementEcoPoints  } from './src/api/supabase';
import { useTheme } from './src/context/ThemeContext';

const BACKGROUND_IMAGE = require('./assets/hero-carbon-tracker.jpg');

// Helper functions for backend integration
const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error loading user profile:', error);
    return { data: null, error };
  }
};

const getDailyEmissions = async (userId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const { data, error } = await supabase
      .from('emissions')
      .select('amount')
      .eq('user_id', userId)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());

    if (error) throw error;
    
    const total = data?.reduce((sum, emission) => sum + parseFloat(emission.amount), 0) || 0;
    return { total, error: null };
  } catch (error) {
    console.error('Error loading daily emissions:', error);
    return { total: 0, error };
  }
};

const getUserAchievements = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        id,
        earned_at,
        tokens_earned,
        achievement_definitions (
          name,
          description,
          emoji,
          category
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) throw error;
    
    const achievements = data?.map(ua => ({
      id: ua.id,
      name: ua.achievement_definitions?.name || 'Achievement',
      description: ua.achievement_definitions?.description || '',
      emoji: ua.achievement_definitions?.emoji || '🏆',
      category: ua.achievement_definitions?.category || 'general',
      earnedAt: ua.earned_at,
      tokensEarned: ua.tokens_earned
    })) || [];
    
    return { achievements, error: null };
  } catch (error) {
    console.error('Error loading achievements:', error);
    // Return fallback achievements if backend fails
    return { 
      achievements: [
        { name: 'First Step', emoji: '🌱', description: 'Started tracking' },
        { name: 'Week Warrior', emoji: '🔥', description: '7 day streak' },
      ], 
      error 
    };
  }
};

const getWeeklyEmissions = async (userId) => {
  try {
    const weekData = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(today.getDate() - i);
      day.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      
      const { data: dayEmissions } = await supabase
        .from('emissions')
        .select('amount')
        .eq('user_id', userId)
        .gte('created_at', day.toISOString())
        .lt('created_at', nextDay.toISOString());

      const dayTotal = dayEmissions?.reduce((sum, emission) => sum + parseFloat(emission.amount), 0) || 0;
      weekData.push(dayTotal);
    }
    
    return { weekData, error: null };
  } catch (error) {
    console.error('Error loading weekly data:', error);
    return { weekData: [0, 0, 0, 0, 0, 0, 0], error };
  }
};

const updateUserEcoPoints = async (userId, pointsToAdd) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        eco_points: supabase.raw(`eco_points + ${pointsToAdd}`),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('eco_points')
      .single();

    if (error) throw error;
    return { newPoints: data.eco_points, error: null };
  } catch (error) {
    console.error('Error updating eco points:', error);
    return { newPoints: null, error };
  }
};

const subscribeToUserUpdates = (userId, callback) => {
  return supabase
    .channel(`profile_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_profiles',
        filter: `id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
};

const subscribeToEmissionsUpdates = (userId, callback) => {
  return supabase
    .channel(`emissions_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'emissions',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
};

const subscribeToNotifications = (userId, callback) => {
  return supabase
    .channel(`notifications_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
};

// Simple inline components
const StreakCounter = ({ streak = 0, theme, isDarkMode }) => (
  <View style={[
    styles.streakContainer,
    {
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : theme.cardBackground,
      borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : theme.border,
    }
  ]}>
    <Text style={[styles.streakNumber, { color: theme.accentText }]}>{streak}</Text>
    <Text style={styles.streakEmoji}>🔥</Text>
    <Text style={[styles.streakLabel, { color: theme.secondaryText }]}>Days</Text>
  </View>
);

const AchievementBadge = ({ achievement, size = 'small', theme, isDarkMode }) => (
  <View style={[
    styles.achievementBadge,
    {
      backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#F0FDF4',
      borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : theme.accentText,
    }
  ]}>
    <Text style={styles.achievementEmoji}>{achievement?.emoji || '🏆'}</Text>
    <Text style={[styles.achievementName, { color: theme.primaryText }]}>
      {achievement?.name || 'Badge'}
    </Text>
  </View>
);

const EmissionChart = ({ data, theme, isDarkMode }) => {
  const maxValue = data ? Math.max(...data) : 10;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const averageValue = data && data.length > 0 ? (data.reduce((a, b) => a + b, 0) / data.length) : 0;
  
  return (
    <View style={[
      styles.chartContainer,
      {
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.divider,
        borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : theme.border,
      }
    ]}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartText, { color: theme.accentText }]}>📊 Weekly Emissions</Text>
        <Text style={[styles.chartAverage, { color: theme.secondaryText }]}>
          Avg: {averageValue.toFixed(1)}kg
        </Text>
      </View>
      
      {data && data.length > 0 ? (
        <View style={styles.chartBars}>
          {data.map((value, index) => (
            <View key={index} style={styles.barContainer}>
              <View style={[
                styles.barWrapper,
                { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.divider }
              ]}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: maxValue > 0 ? `${(value / maxValue) * 100}%` : '0%',
                      backgroundColor: value > 8 ? '#EF4444' : value > 6 ? '#F59E0B' : theme.accentText
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.barValue, { color: theme.primaryText }]}>
                {value.toFixed(1)}
              </Text>
              <Text style={[styles.barLabel, { color: theme.secondaryText }]}>
                {days[index]}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={[styles.noDataText, { color: theme.secondaryText }]}>
            No emission data available
          </Text>
        </View>
      )}
    </View>
  );
};

export default function HomeScreen() {
  // Theme hook
  const { theme, isDarkMode } = useTheme();
  
  // Backend-connected state
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // User data state (all from backend)
  const [userName, setUserName] = useState('User');
  const [dailyEmissions, setDailyEmissions] = useState(0);
  const [achievements, setAchievements] = useState([]);
  const [tokens, setTokens] = useState(0);
  const [streak, setStreak] = useState(0);
  const [weeklyData, setWeeklyData] = useState([0, 0, 0, 0, 0, 0, 0]);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [emissionAmount, setEmissionAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Emission categories
  const categories = [
    { id: 'transport', name: 'Transport', emoji: '🚗', factor: 0.21 },
    { id: 'food', name: 'Food', emoji: '🍽️', factor: 0.5 },
    { id: 'energy', name: 'Energy', emoji: '⚡', factor: 0.233 },
    { id: 'shopping', name: 'Shopping', emoji: '🛍️', factor: 0.3 },
    { id: 'waste', name: 'Waste', emoji: '🗑️', factor: 0.1 },
  ];

  // Main initialization effect
  useEffect(() => {
    let mounted = true;
    let subscriptions = [];

    const initializeData = async () => {
      setLoading(true);
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user || !mounted) {
          console.error('Auth error:', error);
          setLoading(false);
          return;
        }

        console.log('Initializing HomeScreen for user:', user.id);

        // Load or create user profile
        let userProfile = await getUserProfile(user.id);
        
        if (!userProfile.data && mounted) {
          console.log('Creating new profile...');
          const email = user.email || 'user@example.com';
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              email: email,
              full_name: email.split('@')[0],
              eco_points: 0,
              total_emissions: 0,
              total_offsets: 0,
              weekly_goal: 50,
              streak_count: 0,
              last_activity_date: new Date().toISOString().split('T')[0],
              is_premium: false,
            })
            .select()
            .single();

          if (!createError && newProfile && mounted) {
            userProfile.data = newProfile;
            console.log('New profile created:', newProfile);
          }
        }

        if (userProfile.data && mounted) {
          setProfile(userProfile.data);
          setUserName(userProfile.data.full_name || user.email?.split('@')[0] || 'User');
          setTokens(userProfile.data.eco_points || 0);
          setStreak(userProfile.data.streak_count || 0);
        }

        // Load all backend data in parallel
        const [dailyResult, achievementsResult, weeklyResult] = await Promise.all([
          getDailyEmissions(user.id),
          getUserAchievements(user.id),
          getWeeklyEmissions(user.id)
        ]);

        if (mounted) {
          if (dailyResult.total !== undefined) {
            setDailyEmissions(dailyResult.total);
          }
          
          if (achievementsResult.achievements) {
            setAchievements(achievementsResult.achievements);
          }
          
          if (weeklyResult.weekData) {
            setWeeklyData(weeklyResult.weekData);
          }
        }

        // Set up real-time subscriptions
        const profileSubscription = subscribeToUserUpdates(user.id, (payload) => {
          if (mounted) {
            console.log('Profile updated:', payload);
            if (payload.new) {
              setProfile(payload.new);
              setTokens(payload.new.eco_points || 0);
              setStreak(payload.new.streak_count || 0);
            }
          }
        });

        const emissionsSubscription = subscribeToEmissionsUpdates(user.id, (payload) => {
          if (mounted) {
            console.log('Emissions updated:', payload);
            // Refresh daily emissions and weekly data
            refreshData();
          }
        });

        const notificationSubscription = subscribeToNotifications(user.id, (payload) => {
          if (mounted) {
            console.log('New notification:', payload);
            if (payload.new) {
              setNotifications(prev => [payload.new, ...prev]);
              Alert.alert(
                payload.new.title,
                payload.new.message,
                [{ text: 'OK' }]
              );
            }
          }
        });

        subscriptions.push(profileSubscription, emissionsSubscription, notificationSubscription);
        
        console.log('HomeScreen fully initialized with backend connections');
        
      } catch (error) {
        console.error('Error initializing HomeScreen:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeData();

    return () => {
      mounted = false;
      subscriptions.forEach(subscription => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      });
    };
  }, []);

  // Refresh all data from backend
  const refreshData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [dailyResult, weeklyResult] = await Promise.all([
        getDailyEmissions(user.id),
        getWeeklyEmissions(user.id)
      ]);

      if (dailyResult.total !== undefined) {
        setDailyEmissions(dailyResult.total);
      }
      
      if (weeklyResult.weekData) {
        setWeeklyData(weeklyResult.weekData);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  // Submit emission with full backend integration
const submitEmission = async () => {
  if (!selectedCategory || !emissionAmount) {
    Alert.alert('Error', 'Please select a category and enter an amount');
    return;
  }

  const amount = parseFloat(emissionAmount);
  if (isNaN(amount) || amount <= 0) {
    Alert.alert('Error', 'Please enter a valid amount');
    return;
  }

  setSubmitting(true);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Use the improved addEmission function
    const result = await addEmission(user.id, selectedCategory, amount);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to add emission');
    }

    // Award eco points
    const pointsAwarded = await incrementEcoPoints(user.id, 5);
    if (pointsAwarded) {
      setTokens(pointsAwarded);
    }
    
    // Update UI
    setDailyEmissions(prev => prev + amount);
    
    // Refresh data
    if (typeof refreshData === 'function') {
      await refreshData();
    }
    
    // Reset form
    setEmissionAmount('');
    setSelectedCategory('');
    setModalVisible(false);
    
    Alert.alert('Success! 🎉', 'Emission logged successfully!\n+5 eco points earned!');
    
  } catch (error) {
    console.error('Error submitting emission:', error);
    Alert.alert('Error', error.message || 'Failed to log emission. Please try again.');
  } finally {
    setSubmitting(false);
  }
};

  const DAILY_GOAL = profile?.weekly_goal || 50;

  const getProgressColor = () => {
    const percentage = (dailyEmissions / DAILY_GOAL) * 100;
    if (percentage < 60) return '#4ade80';
    if (percentage < 80) return '#facc15';
    return '#f87171';
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        {
          backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : theme.cardBackground,
          borderColor: selectedCategory === item.id ? theme.accentText : theme.border,
        },
        selectedCategory === item.id && {
          backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : '#D1FAE5',
        }
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Text style={styles.categoryEmoji}>{item.emoji}</Text>
      <Text style={[
        styles.categoryName,
        { color: selectedCategory === item.id ? theme.accentText : theme.primaryText }
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const dynamicStyles = createDynamicStyles(theme, isDarkMode);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.statusBarStyle} backgroundColor="transparent" translucent />
        
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

        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.primaryText }]}>
            Loading your carbon dashboard...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor="transparent" translucent />
      
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

      {notifications.length > 0 && (
        <View style={[styles.notificationBadge, { backgroundColor: theme.accentText }]}>
          <Text style={[styles.notificationCount, { color: theme.buttonText }]}>
            {notifications.length}
          </Text>
        </View>
      )}

      <ScrollView 
        style={styles.scrollContainer} 
        showsVerticalScrollIndicator={true}
        indicatorStyle={isDarkMode ? "white" : "black"}
        contentContainerStyle={styles.scrollContent}
        onRefresh={refreshData}
        refreshing={refreshing}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: theme.primaryText }]}>
              Hello, {userName}! 👋
            </Text>
            <Text style={[styles.subGreeting, { color: theme.secondaryText }]}>
              {profile?.is_premium ? '⭐ Premium Member' : 'Let\'s track your carbon footprint'}
            </Text>
          </View>
          <StreakCounter streak={streak} theme={theme} isDarkMode={isDarkMode} />
        </View>

        <View style={styles.statsRow}>
          <View style={[dynamicStyles.statCard]}>
            <Text style={[styles.statValue, { color: theme.accentText }]}>
              {dailyEmissions.toFixed(1)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
              kg CO₂ Today
            </Text>
          </View>
          <View style={[dynamicStyles.statCard]}>
            <Text style={[styles.statValue, { color: theme.accentText }]}>
              {tokens}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
              Tokens
            </Text>
          </View>
          <View style={[dynamicStyles.statCard]}>
            <Text style={[styles.statValue, { color: theme.accentText }]}>
              {achievements.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
              Badges
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[
            dynamicStyles.quickAddButton,
            submitting && { opacity: 0.6 }
          ]}
          onPress={() => setModalVisible(true)}
          disabled={submitting}
        >
          <Text style={[styles.quickAddText, { color: theme.buttonText }]}>
            {submitting ? 'Logging...' : '+ Log Emission'}
          </Text>
        </TouchableOpacity>

        <View style={[dynamicStyles.card]}>
          <Text style={[styles.cardTitle, { color: theme.primaryText }]}>
            This Week's Emissions
          </Text>
          <EmissionChart data={weeklyData} theme={theme} isDarkMode={isDarkMode} />
        </View>

        <View style={[dynamicStyles.card]}>
          <Text style={[styles.cardTitle, { color: theme.primaryText }]}>
            Daily Goal Progress
          </Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.divider }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${Math.min((dailyEmissions / DAILY_GOAL) * 100, 100)}%`,
                    backgroundColor: getProgressColor()
                  }
                ]} 
              />
            </View>
            <Text style={[styles.goalText, { color: theme.secondaryText }]}>
              {dailyEmissions.toFixed(1)} / {DAILY_GOAL}kg CO₂e ({Math.round((dailyEmissions / DAILY_GOAL) * 100)}%)
            </Text>
            
            <Text style={[styles.goalHint, { color: theme.secondaryText, fontSize: 12, marginTop: 5 }]}>
              {dailyEmissions < DAILY_GOAL * 0.6 ? '🌟 Great job! Keep it green!' :
               dailyEmissions < DAILY_GOAL * 0.8 ? '⚠️ Getting close to your limit' :
               '🚨 Over your daily target'}
            </Text>
          </View>
        </View>

        <View style={[dynamicStyles.card]}>
          <Text style={[styles.cardTitle, { color: theme.primaryText }]}>
            Your Achievements ({achievements.length})
          </Text>
          <View style={styles.achievementsList}>
            {achievements.length > 0 ? (
              achievements.slice(0, 6).map((achievement, index) => (
                <AchievementBadge 
                  key={index} 
                  achievement={achievement} 
                  size="small"
                  theme={theme}
                  isDarkMode={isDarkMode}
                />
              ))
            ) : (
              <Text style={[styles.noAchievementsText, { color: theme.secondaryText }]}>
                No achievements yet. Keep logging emissions to earn your first badge! 🏆
              </Text>
            )}
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            {
              backgroundColor: theme.cardBackground,
              borderColor: isDarkMode ? theme.border : 'transparent',
            }
          ]}>
            <Text style={[styles.modalTitle, { color: theme.primaryText }]}>
              Log Emission
            </Text>
            
            <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
              Select Category
            </Text>
            <FlatList
              data={categories}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
            />
            
            <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
              Amount (kg CO₂e)
            </Text>
            <TextInput
              style={[
                styles.amountInput,
                {
                  backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : theme.divider,
                  color: theme.primaryText,
                  borderColor: isDarkMode ? theme.border : theme.divider,
                }
              ]}
              value={emissionAmount}
              onChangeText={setEmissionAmount}
              placeholder="Enter amount..."
              keyboardType="numeric"
              placeholderTextColor={theme.secondaryText}
              editable={!submitting}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : theme.divider,
                    opacity: submitting ? 0.6 : 1
                  }
                ]}
                onPress={() => {
                  setModalVisible(false);
                  setSelectedCategory('');
                  setEmissionAmount('');
                }}
                disabled={submitting}
              >
                <Text style={[styles.cancelButtonText, { color: theme.secondaryText }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  { 
                    backgroundColor: theme.buttonBackground,
                    opacity: submitting ? 0.6 : 1
                  }
                ]}
                onPress={submitEmission}
                disabled={submitting}
              >
                <Text style={[styles.submitButtonText, { color: theme.buttonText }]}>
                  {submitting ? 'Logging...' : 'Log Emission'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createDynamicStyles = (theme, isDarkMode) => ({
  statCard: {
    backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.7)' : theme.cardBackground,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : theme.border,
    shadowColor: isDarkMode ? 'transparent' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0 : 0.1,
    shadowRadius: 3,
    elevation: isDarkMode ? 0 : 3,
  },
  quickAddButton: {
    backgroundColor: isDarkMode ? 'rgba(74, 222, 128, 0.8)' : theme.buttonBackground,
    borderRadius: 15,
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: isDarkMode ? 'transparent' : theme.accentText,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0 : 0.3,
    shadowRadius: 8,
    elevation: isDarkMode ? 0 : 8,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'transparent',
  },
  card: {
    backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.7)' : theme.cardBackground,
    borderRadius: 15,
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : theme.border,
    shadowColor: isDarkMode ? 'transparent' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0 : 0.1,
    shadowRadius: 3,
    elevation: isDarkMode ? 0 : 3,
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
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
  },
  notificationBadge: {
    position: 'absolute',
    top: 60,
    right: 20,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1000,
  },
  notificationCount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subGreeting: {
    fontSize: 16,
    marginTop: 5,
  },
  streakContainer: {
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  streakEmoji: {
    fontSize: 16,
    marginVertical: 2,
  },
  streakLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  quickAddText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  chartContainer: {
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  chartText: {
    fontSize: 16,
    fontWeight: '600',
  },
  chartAverage: {
    fontSize: 12,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 5,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  barWrapper: {
    height: 80,
    width: 20,
    justifyContent: 'flex-end',
    borderRadius: 10,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 10,
    minHeight: 5,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  noDataContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  progressContainer: {
    marginTop: 10,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  goalText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 10,
  },
  goalHint: {
    textAlign: 'center',
  },
  achievementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  achievementBadge: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minWidth: 70,
    margin: 5,
    borderWidth: 1,
  },
  achievementEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  achievementName: {
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.9,
  },
  noAchievementsText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  bottomSpacing: {
    height: 100,
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
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 15,
  },
  categoryItem: {
    flex: 1,
    borderRadius: 12,
    padding: 15,
    margin: 5,
    alignItems: 'center',
    borderWidth: 2,
  },
  categoryEmoji: {
    fontSize: 30,
    marginBottom: 5,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  amountInput: {
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});