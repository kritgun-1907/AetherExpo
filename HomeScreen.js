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

const BACKGROUND_IMAGE = require('./assets/hero-carbon-tracker.jpg');

// Simple inline components to avoid import issues
const StreakCounter = ({ streak = 0 }) => (
  <View style={styles.streakContainer}>
    <Text style={styles.streakNumber}>{streak}</Text>
    <Text style={styles.streakEmoji}>🔥</Text>
    <Text style={styles.streakLabel}>Days</Text>
  </View>
);

const AchievementBadge = ({ achievement, size = 'small' }) => (
  <View style={styles.achievementBadge}>
    <Text style={styles.achievementEmoji}>{achievement?.emoji || '🏆'}</Text>
    <Text style={styles.achievementName}>{achievement?.name || 'Badge'}</Text>
  </View>
);

const EmissionChart = ({ data }) => {
  const maxValue = data ? Math.max(...data) : 10;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartText}>📊 Weekly Emissions</Text>
        <Text style={styles.chartAverage}>
          {data ? `Avg: ${(data.reduce((a, b) => a + b, 0) / data.length).toFixed(1)}kg` : 'No data'}
        </Text>
      </View>
      
      {data && data.length > 0 ? (
        <View style={styles.chartBars}>
          {data.map((value, index) => (
            <View key={index} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: `${(value / maxValue) * 100}%`,
                      backgroundColor: value > 8 ? '#EF4444' : value > 6 ? '#F59E0B' : '#10B981'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.barValue}>{value.toFixed(1)}</Text>
              <Text style={styles.barLabel}>{days[index]}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No emission data available</Text>
        </View>
      )}
    </View>
  );
};

export default function HomeScreen() {
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
      // Fallback - still show the screen
      setUserName('EcoWarrior');
    }
  };

  const loadAchievements = async () => {
    try {
      // Simple achievements loading
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
        // Add to Supabase
        await addEmission(user.id, selectedCategory, amount);
        
        // Update local state
        setDailyEmissions(prev => prev + amount);
        setTokens(prev => prev + 5); // Reward tokens
        
        // Reset form and close modal
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
        selectedCategory === item.id && styles.selectedCategory
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Text style={styles.categoryEmoji}>{item.emoji}</Text>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

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
        scrollIndicatorInsets={{ right: 1 }}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hello, {userName}! 👋</Text>
            <Text style={styles.subGreeting}>
              Let's track your carbon footprint
            </Text>
          </View>
          <StreakCounter streak={streak} />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{dailyEmissions.toFixed(1)}</Text>
            <Text style={styles.statLabel}>kg CO₂ Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{tokens}</Text>
            <Text style={styles.statLabel}>Tokens</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{achievements.length}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
        </View>

        {/* Quick Add Button */}
        <TouchableOpacity 
          style={styles.quickAddButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.quickAddText}>+ Log Emission</Text>
        </TouchableOpacity>

        {/* Emissions Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>This Week's Emissions</Text>
          <EmissionChart data={weeklyData} />
        </View>

        {/* Progress Bar */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Goal Progress</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
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
            <Text style={styles.goalText}>
              {dailyEmissions.toFixed(1)} / 10kg CO₂e ({Math.round((dailyEmissions / 10) * 100)}%)
            </Text>
          </View>
        </View>

        {/* Recent Achievements */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Achievements</Text>
          <View style={styles.achievementsList}>
            {achievements.map((achievement, index) => (
              <AchievementBadge 
                key={index} 
                achievement={achievement} 
                size="small" 
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Emission</Text>
            
            {/* Categories */}
            <Text style={styles.sectionTitle}>Select Category</Text>
            <FlatList
              data={categories}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
            />
            
            {/* Amount Input */}
            <Text style={styles.sectionTitle}>Amount (kg CO₂e)</Text>
            <TextInput
              style={styles.amountInput}
              value={emissionAmount}
              onChangeText={setEmissionAmount}
              placeholder="Enter amount..."
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
            
            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setSelectedCategory('');
                  setEmissionAmount('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={submitEmission}
              >
                <Text style={styles.submitButtonText}>Log Emission</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  overlay: {
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
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
    color: '#f0fdf4',
  },
  subGreeting: {
    fontSize: 16,
    color: '#d1fae5',
    marginTop: 5,
  },
  
  // Streak Counter
  streakContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  streakEmoji: {
    fontSize: 16,
    marginVertical: 2,
  },
  streakLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'rgba(55, 65, 81, 0.7)',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ade80',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 5,
    textAlign: 'center',
  },
  quickAddButton: {
    backgroundColor: '#4ade80',
    borderRadius: 15,
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  quickAddText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#064e3b',
  },
  card: {
    backgroundColor: 'rgba(55, 65, 81, 0.7)',
    borderRadius: 15,
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 15,
  },
  
  // Chart styles
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  chartText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  chartAverage: {
    color: '#9CA3AF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 10,
    minHeight: 5,
  },
  barValue: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  barLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 2,
  },
  noDataContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontStyle: 'italic',
  },
  
  progressContainer: {
    marginTop: 10,
  },
  progressBar: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  goalText: {
    textAlign: 'center',
    color: '#9CA3AF',
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
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minWidth: 70,
    margin: 5,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  achievementEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  achievementName: {
    fontSize: 10,
    color: '#FFFFFF',
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
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 15,
    color: '#374151',
  },
  categoryItem: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 15,
    margin: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCategory: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  categoryEmoji: {
    fontSize: 30,
    marginBottom: 5,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  amountInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});