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
import { supabase, addEmission } from './src/api/supabase';
import { useTheme } from './src/context/ThemeContext';

// Import store with error handling
let useCarbonStore = null;
try {
  const carbonStoreModule = require('./src/store/carbonStore');
  if (carbonStoreModule && carbonStoreModule.useCarbonStore) {
    useCarbonStore = carbonStoreModule.useCarbonStore;
  } else {
    throw new Error('useCarbonStore not found in module');
  }
} catch (error) {
  console.warn('CarbonStore not available, using fallback:', error.message);
  useCarbonStore = () => ({
    addEmission: () => console.log('Fallback addEmission called'),
    earnTokens: () => console.log('Fallback earnTokens called'),
    dailyEmissions: 7.5,
    tokens: 25,
    achievements: [],
    loadFromStorage: () => Promise.resolve(),
  });
}

const BACKGROUND_IMAGE = require('./assets/hero-carbon-tracker.jpg');

// Helper functions for real-time data
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
          {data ? `Avg: ${(data.reduce((a, b) => a + b, 0) / data.length).toFixed(1)}kg` : 'No data'}
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
                      height: `${(value / maxValue) * 100}%`,
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
  
  // Store state
  const storeState = useCarbonStore ? useCarbonStore() : null;
  
  // Profile and notifications state
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  // User data state
  const [userName, setUserName] = useState('User');
  const [dailyEmissions, setDailyEmissions] = useState(storeState?.dailyEmissions || 7.5);
  const [achievements, setAchievements] = useState(storeState?.achievements || [
    { name: 'First Step', emoji: '🌱', description: 'Started tracking' },
    { name: 'Week Warrior', emoji: '🔥', description: '7 day streak' },
  ]);
  const [tokens, setTokens] = useState(storeState?.tokens || 25);
  const [streak, setStreak] = useState(5);
  const [weeklyData, setWeeklyData] = useState([6.5, 7.2, 5.8, 8.1, 6.9, 7.5, 7.5]);
  const [recentAchievements, setRecentAchievements] = useState([]);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [emissionAmount, setEmissionAmount] = useState('');

  // Emission categories
  const categories = [
    { id: 'transport', name: 'Transport', emoji: '🚗', factor: 0.21 },
    { id: 'food', name: 'Food', emoji: '🍽️', factor: 0.5 },
    { id: 'energy', name: 'Energy', emoji: '⚡', factor: 0.233 },
    { id: 'shopping', name: 'Shopping', emoji: '🛍️', factor: 0.3 },
    { id: 'waste', name: 'Waste', emoji: '🗑️', factor: 0.1 },
  ];

  // Main useEffect with profile creation and subscriptions
  useEffect(() => {
    let mounted = true;
    let subscriptions = [];

    const initializeData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user || !mounted) {
          console.error('Auth error:', error);
          return;
        }

        // Load user profile with creation if missing
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (!profileData && mounted) {
          // Create profile if it doesn't exist
          console.log('No profile found, creating new profile for user:', user.id);
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
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
          } else if (newProfile && mounted) {
            setProfile(newProfile);
            setUserName(newProfile.full_name || 'User');
            setTokens(newProfile.eco_points || 0);
            setStreak(newProfile.streak_count || 0);
            console.log('New profile created:', newProfile);
          }
        } else if (profileData && mounted) {
          setProfile(profileData);
          const name = profileData.full_name || user.email?.split('@')[0] || 'User';
          setUserName(name);
          if (profileData.eco_points) setTokens(profileData.eco_points);
          if (profileData.streak_count) setStreak(profileData.streak_count);
          console.log('Profile data loaded:', profileData);
        }

        // Set up real-time subscriptions
        const profileSubscription = subscribeToUserUpdates(user.id, (payload) => {
          if (mounted) {
            console.log('Profile updated:', payload);
            if (payload.new) {
              setProfile(payload.new);
              if (payload.new.eco_points) setTokens(payload.new.eco_points);
              if (payload.new.streak_count) setStreak(payload.new.streak_count);
            }
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

        subscriptions.push(profileSubscription, notificationSubscription);

        // Load other data
        await loadAchievements();
        await loadWeeklyChartData();
        
        console.log('HomeScreen loaded successfully with real-time subscriptions');
        
      } catch (error) {
        console.error('Error initializing HomeScreen:', error);
        if (mounted) {
          loadUserData();
          loadAchievements();
          loadWeeklyChartData();
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

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.email?.split('@')[0] || 'User';
        setUserName(name);
        console.log('User data loaded:', name);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserName('EcoWarrior');
    }
  };

  const loadAchievements = async () => {
    try {
      setRecentAchievements(achievements.slice(0, 3));
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const loadWeeklyChartData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
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
            .eq('user_id', user.id)
            .gte('created_at', day.toISOString())
            .lt('created_at', nextDay.toISOString());

            console.log(`Emissions for ${day.toISOString().split('T')[0]}:`, dayEmissions);
          
          const dayTotal = dayEmissions?.reduce((sum, emission) => sum + emission.amount, 0) || 0;
          weekData.push(dayTotal);
        }
        console.log('Weekly chart data loaded:', weekData);
        setWeeklyData(weekData);
      }
    } catch (error) {
      console.error('Error loading weekly data:', error);
      setWeeklyData([6.5, 7.2, 5.8, 8.1, 6.9, 7.5, 7.5]);
    }
  };

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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await addEmission(user.id, selectedCategory, amount);
        setDailyEmissions(prev => prev + amount);
        setTokens(prev => prev + 5);
        
        loadWeeklyChartData();
        
        setEmissionAmount('');
        setSelectedCategory('');
        setModalVisible(false);
        Alert.alert('Success', 'Emission logged successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to log emission. Please try again.');
      console.error('Error submitting emission:', error);
    }
  };

  const DAILY_GOAL = 50;

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
        scrollIndicatorInsets={{ right: 1 }}
        contentContainerStyle={styles.scrollContent}
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
          style={[dynamicStyles.quickAddButton]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={[styles.quickAddText, { color: theme.buttonText }]}>
            + Log Emission
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
            Your Achievements
          </Text>
          <View style={styles.achievementsList}>
            {achievements.map((achievement, index) => (
              <AchievementBadge 
                key={index} 
                achievement={achievement} 
                size="small"
                theme={theme}
                isDarkMode={isDarkMode}
              />
            ))}
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
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : theme.divider,
                  }
                ]}
                onPress={() => {
                  setModalVisible(false);
                  setSelectedCategory('');
                  setEmissionAmount('');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.secondaryText }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  { backgroundColor: theme.buttonBackground }
                ]}
                onPress={submitEmission}
              >
                <Text style={[styles.submitButtonText, { color: theme.buttonText }]}>
                  Log Emission
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
  achievementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  
  // Achievement Badge
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