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

const BACKGROUND_IMAGE = require('./assets/hero-carbon-tracker.jpg');

// Simple inline components to avoid import issues
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
  const { theme, isDarkMode } = useTheme();
  
  // Local state instead of Zustand to avoid store issues
  const [dailyEmissions, setDailyEmissions] = useState(7.5);
  const [achievements, setAchievements] = useState([
    { name: 'First Step', emoji: '🌱', description: 'Started tracking' },
    { name: 'Week Warrior', emoji: '🔥', description: '7 day streak' },
  ]);
  const [tokens, setTokens] = useState(25);
  const [streak, setStreak] = useState(5);
  
  const [userName, setUserName] = useState('User');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [emissionAmount, setEmissionAmount] = useState('');
  const [weeklyData, setWeeklyData] = useState([6.5, 7.2, 5.8, 8.1, 6.9, 7.5, 7.5]);
  const [recentAchievements, setRecentAchievements] = useState([]);

  // Emission categories
  const categories = [
    { id: 'transport', name: 'Transport', emoji: '🚗', factor: 0.21 },
    { id: 'food', name: 'Food', emoji: '🍽️', factor: 0.5 },
    { id: 'energy', name: 'Energy', emoji: '⚡', factor: 0.233 },
    { id: 'shopping', name: 'Shopping', emoji: '🛍️', factor: 0.3 },
    { id: 'waste', name: 'Waste', emoji: '🗑️', factor: 0.1 },
  ];

  useEffect(() => {
    loadUserData();
    loadAchievements();
    console.log('HomeScreen loaded successfully');
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

  const getProgressColor = () => {
    const percentage = (dailyEmissions / 10) * 100;
    if (percentage < 50) return '#4ade80';
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

  // Create dynamic styles based on theme
  const dynamicStyles = createDynamicStyles(theme, isDarkMode);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor="transparent" translucent />
      
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
        scrollIndicatorInsets={{ right: 1 }}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: theme.primaryText }]}>
              Hello, {userName}! 👋
            </Text>
            <Text style={[styles.subGreeting, { color: theme.secondaryText }]}>
              Let's track your carbon footprint
            </Text>
          </View>
          <StreakCounter streak={streak} theme={theme} isDarkMode={isDarkMode} />
        </View>

        {/* Stats Row */}
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

        {/* Quick Add Button */}
        <TouchableOpacity 
          style={[dynamicStyles.quickAddButton]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={[styles.quickAddText, { color: theme.buttonText }]}>
            + Log Emission
          </Text>
        </TouchableOpacity>

        {/* Emissions Chart */}
        <View style={[dynamicStyles.card]}>
          <Text style={[styles.cardTitle, { color: theme.primaryText }]}>
            This Week's Emissions
          </Text>
          <EmissionChart data={weeklyData} theme={theme} isDarkMode={isDarkMode} />
        </View>

        {/* Progress Bar */}
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
                    width: `${Math.min((dailyEmissions / 10) * 100, 100)}%`,
                    backgroundColor: getProgressColor()
                  }
                ]} 
              />
            </View>
            <Text style={[styles.goalText, { color: theme.secondaryText }]}>
              {dailyEmissions.toFixed(1)} / 10kg CO₂e ({Math.round((dailyEmissions / 10) * 100)}%)
            </Text>
          </View>
        </View>

        {/* Recent Achievements */}
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

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Add Emission Modal */}
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
            
            {/* Categories */}
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
            
            {/* Amount Input */}
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
            
            {/* Buttons */}
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

// Function to create dynamic styles based on theme
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

// --- STYLES ---
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
  
  // Streak Counter
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
  
  // Chart styles
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