// ProfileScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Switch 
} from 'react-native';
import { supabase } from './src/api/supabase';
import { useCarbonStore } from './src/store/carbonStore';
import AchievementBadge from './src/components/gamification/AchievementBadge';
import { getUserAchievements } from './src/services/AchievementService';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [allAchievements, setAllAchievements] = useState([]);
  const [totalEmissions, setTotalEmissions] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  
  const { 
    dailyEmissions, 
    weeklyEmissions,
    monthlyEmissions,
    tokens, 
    streak 
  } = useCarbonStore();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      // Load all achievements
      const achievements = await getUserAchievements(user.id);
      setAllAchievements(achievements);
      
      // Calculate total emissions
      const { data } = await supabase
        .from('emissions')
        .select('amount')
        .eq('user_id', user.id);
      
      if (data) {
        const total = data.reduce((sum, emission) => sum + emission.amount, 0);
        setTotalEmissions(total);
      }
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
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleExportData = async () => {
    Alert.alert(
      'Export Data',
      'Your carbon tracking data will be sent to your email.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            Alert.alert('Success', 'Data export sent to your email!');
          }
        }
      ]
    );
  };

  const getImpactLevel = () => {
    if (monthlyEmissions < 100) return { level: 'Eco Hero', color: '#10B981' };
    if (monthlyEmissions < 200) return { level: 'Green Warrior', color: '#F59E0B' };
    return { level: 'Carbon Conscious', color: '#EF4444' };
  };

  const impactLevel = getImpactLevel();

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      {/* User Info Card */}
      <View style={styles.card}>
        <View style={styles.userHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.email.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.email.split('@')[0]}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={styles.impactBadge}>
              <Text style={[styles.impactLevel, { color: impactLevel.color }]}>
                {impactLevel.level}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{dailyEmissions.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Today (kg)</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{weeklyEmissions.toFixed(0)}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{monthlyEmissions.toFixed(0)}</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalEmissions.toFixed(0)}</Text>
          <Text style={styles.statLabel}>All Time</Text>
        </View>
      </View>

      {/* Gamification Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Progress</Text>
        <View style={styles.progressStats}>
          <View style={styles.progressItem}>
            <Text style={styles.progressIcon}>🔥</Text>
            <Text style={styles.progressValue}>{streak}</Text>
            <Text style={styles.progressLabel}>Day Streak</Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={styles.progressIcon}>💰</Text>
            <Text style={styles.progressValue}>{tokens}</Text>
            <Text style={styles.progressLabel}>Tokens</Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={styles.progressIcon}>🏆</Text>
            <Text style={styles.progressValue}>{allAchievements.length}</Text>
            <Text style={styles.progressLabel}>Achievements</Text>
          </View>
        </View>
      </View>

      {/* Achievements Section */}
      {allAchievements.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Achievements</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {allAchievements.map((achievement, index) => (
              <AchievementBadge 
                key={index} 
                achievement={achievement} 
                size="small" 
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Settings Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Settings</Text>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Push Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
            thumbColor={notificationsEnabled ? '#10B981' : '#9CA3AF'}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Dark Mode</Text>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
            thumbColor={darkMode ? '#10B981' : '#9CA3AF'}
          />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
          <Text style={styles.actionButtonText}>📊 Export My Data</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => Alert.alert('Support', 'Email: support@aether.app')}
        >
          <Text style={styles.actionButtonText}>💬 Contact Support</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => Alert.alert('Privacy Policy', 'Your data is secure and private.')}
        >
          <Text style={styles.actionButtonText}>🔒 Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.signOutButton]} 
          onPress={handleSignOut}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#065F46',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 20,
    elevation: 3,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  userInfo: {
    marginLeft: 15,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  impactBadge: {
    marginTop: 5,
  },
  impactLevel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 15,
    marginVertical: 10,
  },
  statItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
    marginHorizontal: '1%',
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#064E3B',
    marginBottom: 15,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressItem: {
    alignItems: 'center',
  },
  progressIcon: {
    fontSize: 28,
    marginBottom: 5,
  },
  progressValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  progressLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLabel: {
    fontSize: 16,
    color: '#374151',
  },
  actions: {
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  button: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  signOutButton: {
    backgroundColor: '#EF4444',
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});