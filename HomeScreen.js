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
} from 'react-native';
import { supabase, addEmission } from './src/api/supabase';
import { useCarbonStore } from './src/store/carbonStore';
import AchievementBadge from './src/components/gamification/AchievementBadge';
import StreakCounter from './src/components/gamification/StreakCounter';
import EmissionChart from './src/components/carbon/EmissionChart';
import { checkAchievements, getUserAchievements } from './src/services/AchievementService';

const BACKGROUND_IMAGE = require('./assets/hero-carbon-tracker.jpg');

export default function HomeScreen() {
  const { 
    dailyEmissions, 
    achievements, 
    tokens, 
    streak,
  } = useCarbonStore();
  
  const [userName, setUserName] = useState('User');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [emissionAmount, setEmissionAmount] = useState('');
  const [weeklyData, setWeeklyData] = useState([]);
  const [recentAchievements, setRecentAchievements] = useState([]);

  useEffect(() => {
    loadUserData();
    loadAchievements();
  }, []);

  const loadUserData = async () => {
    // Your existing function here...
  };

  const loadAchievements = async () => {
     // Your existing function here...
  };

  const getProgressColor = () => {
    const percentage = (dailyEmissions / 10) * 100;
    if (percentage < 50) return '#4ade80';
    if (percentage < 80) return '#facc15';
    return '#f87171';
  };
  
  // ... (All your other functions: submitEmission, categories, etc. should be here)

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground 
        source={BACKGROUND_IMAGE} 
        resizeMode="cover" 
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[StyleSheet.absoluteFillObject, styles.overlay]} />

      {/* Using a standard View instead of ScrollView for debugging */}
      <View style={{ flex: 1, paddingTop: 60 }}>
        {/* Header */}
        <View style={styles.header}>
          <View>
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

        {/* Emissions Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>This Week's Emissions</Text>
          {weeklyData && weeklyData.length > 0 ? (
            <EmissionChart data={weeklyData} />
          ) : (
            <Text style={styles.emptyChartText}>No emission data for this week yet.</Text>
          )}
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
      </View>

      {/* Modal is kept outside the main layout */}
      <Modal /* ... */ >
        {/* ... */}
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
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
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
  },
  card: {
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 15,
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 15,
  },
  emptyChartText: {
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
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
});