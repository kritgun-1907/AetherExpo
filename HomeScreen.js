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
import { supabase, addEmission, incrementEcoPoints } from './src/api/supabase';
import { useTheme } from './src/context/ThemeContext';
import { useEmissions } from './src/hooks/useEmissions';
import EmissionService from './src/services/EmissionService';

const BACKGROUND_IMAGE = require('./assets/hero-carbon-tracker.jpg');

// Helper functions
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

const getUserAchievements = async (userId) => {
  try {
    await supabase.rpc('update_user_streak_and_achievements', { p_user_id: userId });
    
    const { data, error } = await supabase
      .from('user_achievements_view')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      const { data: altData, error: altError } = await supabase
        .from('user_achievements')
        .select(`id, earned_at, tokens_earned, achievement_id`)
        .eq('user_id', userId);
      
      if (!altError && altData) {
        const achievementIds = altData.map(a => a.achievement_id);
        const { data: definitions } = await supabase
          .from('achievement_definitions')
          .select('*')
          .in('id', achievementIds);
        
        const achievements = altData.map(ua => {
          const def = definitions?.find(d => d.id === ua.achievement_id) || {};
          return {
            id: ua.id,
            name: def.name || 'Achievement',
            description: def.description || '',
            emoji: def.emoji || '🏆',
            category: def.category || 'general',
            earnedAt: ua.earned_at,
            tokensEarned: ua.tokens_earned
          };
        });
        
        return { achievements, error: null };
      }
      throw error;
    }
    
    const achievements = data?.map(ua => ({
      id: ua.id,
      name: ua.name || 'Achievement',
      description: ua.description || '',
      emoji: ua.emoji || '🏆',
      category: ua.category || 'general',
      earnedAt: ua.earned_at,
      tokensEarned: ua.tokens_earned
    })) || [];
    
    return { achievements, error: null };
  } catch (error) {
    console.error('Error loading achievements:', error);
    return { achievements: [], error };
  }
};

const subscribeToUserUpdates = (userId, callback) => {
  return supabase
    .channel(`profile_${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_profiles',
      filter: `id=eq.${userId}`,
    }, callback)
    .subscribe();
};

const subscribeToNotifications = (userId, callback) => {
  return supabase
    .channel(`notifications_${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, callback)
    .subscribe();
};

// Inline components
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

const EmissionChart = ({ data, dayNames, theme, isDarkMode }) => {
  const maxValue = data ? Math.max(...data) : 10;
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
                {dayNames ? dayNames[index] : 'Day'}
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
  const { theme, isDarkMode } = useTheme();
  const { emissions, loadEmissions, subscribeToChanges } = useEmissions();
  
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [userName, setUserName] = useState('User');
  const [achievements, setAchievements] = useState([]);
  const [tokens, setTokens] = useState(0);
  const [streak, setStreak] = useState(0);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [emissionAmount, setEmissionAmount] = useState('');
  const [activityType, setActivityType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { 
      id: 'transport', 
      name: 'Transport', 
      emoji: '🚗',
      activities: [
        { id: 'car', name: 'Car', unit: 'km' },
        { id: 'bus', name: 'Bus', unit: 'km' },
        { id: 'train', name: 'Train', unit: 'km' },
        { id: 'flight_domestic', name: 'Flight', unit: 'km' }
      ]
    },
    { 
      id: 'food', 
      name: 'Food', 
      emoji: '🍽️',
      activities: [
        { id: 'beef', name: 'Beef', unit: 'kg' },
        { id: 'chicken', name: 'Chicken', unit: 'kg' },
        { id: 'pork', name: 'Pork', unit: 'kg' },
        { id: 'fish', name: 'Fish', unit: 'kg' }
      ]
    },
    { 
      id: 'home', 
      name: 'Energy', 
      emoji: '⚡',
      activities: [
        { id: 'electricity', name: 'Electricity', unit: 'kWh' },
        { id: 'gas', name: 'Natural Gas', unit: 'kWh' },
        { id: 'fuel_oil', name: 'Fuel Oil', unit: 'kWh' }
      ]
    },
    { 
      id: 'shopping', 
      name: 'Shopping', 
      emoji: '🛍️',
      activities: [
        { id: 'clothing', name: 'Clothing', unit: 'item' },
        { id: 'electronics', name: 'Electronics', unit: 'item' }
      ]
    },
  ];

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

        await loadEmissions(user.id);
        
        const emissionSubscription = subscribeToChanges(user.id);
        if (emissionSubscription) {
          subscriptions.push(emissionSubscription);
        }

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

        const achievementsResult = await getUserAchievements(user.id);
        if (mounted && achievementsResult.achievements) {
          setAchievements(achievementsResult.achievements);
        }

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

        const notificationSubscription = subscribeToNotifications(user.id, (payload) => {
          if (mounted) {
            console.log('New notification:', payload);
            if (payload.new) {
              setNotifications(prev => [payload.new, ...prev]);
              Alert.alert(payload.new.title, payload.new.message, [{ text: 'OK' }]);
            }
          }
        });

        subscriptions.push(profileSubscription, notificationSubscription);
        
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
  }, [loadEmissions, subscribeToChanges]);

 // HomeScreen.js - REPLACE submitEmission function
const submitEmission = async () => {
  if (!selectedCategory || !emissionAmount || !activityType) {
    Alert.alert('Error', 'Please select category, activity type, and enter an amount');
    return;
  }

  setSubmitting(true);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('🚀 Calculating emissions...');
    
    // 🔥 USE EmissionSyncService directly
    const result = await EmissionSyncService.addEmission(
      selectedCategory,
      activityType,
      parseFloat(emissionAmount),
      {
        unit: categories.find(c => c.id === selectedCategory)
          ?.activities.find(a => a.id === activityType)?.unit || 'units'
      }
    );

    if (result.success) {
      const pointsAwarded = Math.floor(result.emission.amount * 2);
      
      Alert.alert(
        'Success! 🎉', 
        `Emission logged: ${result.emission.amount.toFixed(2)} kg CO₂\n` +
        `Data source: ${result.calculation.source}\n` +
        `Confidence: ${result.calculation.confidence}\n` +
        `Points earned: ${pointsAwarded} 🪙`
      );

      setModalVisible(false);
      setEmissionAmount('');
      setSelectedCategory('');
      setActivityType('');
    } else {
      Alert.alert('Error', result.error || 'Failed to log emission');
    }
  } catch (error) {
    console.error('Error submitting emission:', error);
    Alert.alert('Error', 'Failed to log emission');
  } finally {
    setSubmitting(false);
  }
};

  const DAILY_GOAL = profile?.weekly_goal || 50;

  const getProgressColor = () => {
    const percentage = (emissions.daily / DAILY_GOAL) * 100;
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
      onPress={() => {
        setSelectedCategory(item.id);
        setActivityType(''); // Reset activity when category changes
      }}
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

  const selectedCategoryData = categories.find(c => c.id === selectedCategory);

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
              {emissions.daily.toFixed(1)}
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
          <EmissionChart 
            data={emissions.weeklyData} 
            dayNames={emissions.dayNames} 
            theme={theme} 
            isDarkMode={isDarkMode} 
          />
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
                    width: `${Math.min((emissions.daily / DAILY_GOAL) * 100, 100)}%`,
                    backgroundColor: getProgressColor()
                  }
                ]} 
              />
            </View>
            <Text style={[styles.goalText, { color: theme.secondaryText }]}>
              {emissions.daily.toFixed(1)} / {DAILY_GOAL}kg CO₂e ({Math.round((emissions.daily / DAILY_GOAL) * 100)}%)
            </Text>
            
            <Text style={[styles.goalHint, { color: theme.secondaryText, fontSize: 12, marginTop: 5 }]}>
              {emissions.daily < DAILY_GOAL * 0.6 ? '🌟 Great job! Keep it green!' :
               emissions.daily < DAILY_GOAL * 0.8 ? '⚠️ Getting close to your limit' :
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
            
            {selectedCategoryData && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
                  Select Activity Type
                </Text>
                <View style={styles.activityGrid}>
                  {selectedCategoryData.activities.map((activity) => (
                    <TouchableOpacity
                      key={activity.id}
                      style={[
                        styles.activityButton,
                        {
                          backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : theme.divider,
                          borderColor: activityType === activity.id ? theme.accentText : theme.border,
                        },
                        activityType === activity.id && {
                          backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : '#D1FAE5',
                        }
                      ]}
                      onPress={() => setActivityType(activity.id)}
                    >
                      <Text style={[
                        styles.activityText,
                        { color: activityType === activity.id ? theme.accentText : theme.primaryText }
                      ]}>
                        {activity.name}
                      </Text>
                      <Text style={[styles.activityUnit, { color: theme.secondaryText }]}>
                        ({activity.unit})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            
            <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
              Amount {selectedCategoryData && activityType && 
                `(${selectedCategoryData.activities.find(a => a.id === activityType)?.unit || ''})`}
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
                  setActivityType('');
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
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  activityButton: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  activityText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activityUnit: {
    fontSize: 11,
    marginTop: 2,
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