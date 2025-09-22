// HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput
} from 'react-native';
import { supabase, addEmission } from './src/api/supabase';
import { useCarbonStore } from './src/store/carbonStore';
import AchievementBadge from './src/components/gamification/AchievementBadge';
import StreakCounter from './src/components/gamification/StreakCounter';
import EmissionChart from './src/components/carbon/EmissionChart';
import { checkAchievements, getUserAchievements } from './src/services/AchievementService';

export default function HomeScreen() {
  const { 
    dailyEmissions, 
    weeklyGoal, 
    achievements, 
    tokens, 
    streak,
    addEmission: storeAddEmission,
    earnTokens,
    updateStreak 
  } = useCarbonStore();
  
  const [userName, setUserName] = useState('User');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [emissionAmount, setEmissionAmount] = useState('');
  const [weeklyData, setWeeklyData] = useState([8.2, 6.5, 7.1, 5.9, 8.8, 6.2, 7.5]);
  const [recentAchievements, setRecentAchievements] = useState([]);

  useEffect(() => {
    loadUserData();
    loadAchievements();
    checkDailyStreak();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserName(user.email.split('@')[0]);
      
      // Load weekly emissions data
      const { data } = await supabase
        .from('emissions')
        .select('amount, created_at')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });
      
      if (data && data.length > 0) {
        // Process data for chart
        const dailyEmissions = {};
        data.forEach(emission => {
          const day = new Date(emission.created_at).toLocaleDateString();
          dailyEmissions[day] = (dailyEmissions[day] || 0) + emission.amount;
        });
        setWeeklyData(Object.values(dailyEmissions));
      }
    }
  };

  const loadAchievements = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const userAchievements = await getUserAchievements(user.id);
      setRecentAchievements(userAchievements.slice(-3));
    }
  };

  const checkDailyStreak = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Check if user has tracked today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data } = await supabase
        .from('emissions')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
        .limit(1);
      
      if (data && data.length === 0) {
        // User hasn't tracked today yet
        // You might want to show a reminder
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    await loadAchievements();
    setRefreshing(false);
  };

  const categories = [
    { icon: '🚗', name: 'Transport', factor: 0.21 },
    { icon: '🍽️', name: 'Food', factor: 0.15 },
    { icon: '🏠', name: 'Home', factor: 0.12 },
    { icon: '🛍️', name: 'Shopping', factor: 0.25 }
  ];

  const handleQuickAdd = (category) => {
    setSelectedCategory(category);
    setModalVisible(true);
  };

  const submitEmission = async () => {
    if (!emissionAmount || isNaN(emissionAmount)) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const amount = parseFloat(emissionAmount);
    const category = categories.find(c => c.name === selectedCategory);
    const co2Amount = amount * category.factor;

    // Add to store
    storeAddEmission(co2Amount, selectedCategory);

    // Add to database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await addEmission(user.id, selectedCategory, co2Amount);
      
      // Check for new achievements
      const newAchievements = await checkAchievements(
        user.id, 
        dailyEmissions + co2Amount, 
        streak
      );
      
      if (newAchievements.length > 0) {
        // Earn tokens for achievements
        const totalTokens = newAchievements.reduce((sum, a) => sum + a.tokens, 0);
        earnTokens(totalTokens);
        
        // Show achievement notification
        Alert.alert(
          '🎉 Achievement Unlocked!',
          `You earned: ${newAchievements.map(a => a.name).join(', ')}\n+${totalTokens} tokens!`
        );
        
        await loadAchievements();
      }
    }

    Alert.alert('Success!', `Added ${co2Amount.toFixed(2)}kg CO₂e`);
    setModalVisible(false);
    setEmissionAmount('');
  };

  const getProgressColor = () => {
    const percentage = (dailyEmissions / 10) * 100;
    if (percentage < 50) return '#10B981';
    if (percentage < 80) return '#F59E0B';
    return '#EF4444';
  };

  const getDailyTip = () => {
    const tips = [
      'Take public transport instead of driving to reduce emissions by 2.2kg per trip!',
      'Eating one vegetarian meal saves 2.5kg CO₂ compared to meat.',
      'Unplug electronics when not in use to save 0.5kg CO₂ daily.',
      'Walk or bike for trips under 2km - zero emissions!',
      'Buy local produce to reduce transport emissions by 1kg per shopping trip.'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hello, {userName}! 👋</Text>
            <Text style={styles.subGreeting}>
              Let's track your carbon footprint
            </Text>
          </View>
          <StreakCounter streak={streak} />
        </View>
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
            {dailyEmissions.toFixed(1)} / 10kg CO₂e
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Add</Text>
      <View style={styles.quickActions}>
        {categories.map((category) => (
          <TouchableOpacity 
            key={category.name}
            style={styles.actionButton}
            onPress={() => handleQuickAdd(category.name)}
          >
            <Text style={styles.actionIcon}>{category.icon}</Text>
            <Text style={styles.actionText}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Achievements 🏆</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recentAchievements.map((achievement, index) => (
              <AchievementBadge 
                key={index} 
                achievement={achievement} 
                size="medium" 
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Daily Tip */}
      <View style={[styles.card, styles.tipCard]}>
        <Text style={styles.tipTitle}>💡 Daily Tip</Text>
        <Text style={styles.tipText}>{getDailyTip()}</Text>
      </View>

      {/* Add Emission Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add {selectedCategory} Activity</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder={
                selectedCategory === 'Transport' ? 'Distance (km)' :
                selectedCategory === 'Food' ? 'Meals count' :
                selectedCategory === 'Home' ? 'Hours of usage' :
                'Number of items'
              }
              placeholderTextColor="#9CA3AF"
              value={emissionAmount}
              onChangeText={setEmissionAmount}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setEmissionAmount('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitEmission}
              >
                <Text style={styles.submitButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4'
  },
  header: {
    padding: 20,
    paddingTop: 60
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#065F46'
  },
  subGreeting: {
    fontSize: 16,
    color: '#047857',
    marginTop: 5
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    marginBottom: 20
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    elevation: 2
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981'
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#064E3B',
    marginBottom: 15
  },
  progressContainer: {
    marginTop: 10
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 6
  },
  goalText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    marginTop: 10
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#064E3B',
    marginHorizontal: 15,
    marginBottom: 10
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    marginBottom: 10
  },
  actionButton: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 5
  },
  actionText: {
    fontSize: 12,
    color: '#374151'
  },
  tipCard: {
    backgroundColor: '#FEF3C7',
    marginBottom: 30
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8
  },
  tipText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 20,
    textAlign: 'center'
  },
  modalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 20
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 10
  },
  submitButton: {
    backgroundColor: '#10B981',
    marginLeft: 10
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '600'
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600'
  }
});