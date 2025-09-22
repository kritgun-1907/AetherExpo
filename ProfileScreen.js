import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { supabase } from './src/api/supabase';
import { useCarbonStore } from './src/store/carbonStore';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const { dailyEmissions, weeklyGoal, achievements, tokens, streak } = useCarbonStore();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error signing out', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      {user ? (
        <View style={styles.card}>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{dailyEmissions.toFixed(1)}kg</Text>
              <Text style={styles.statLabel}>Today's CO₂</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{tokens}</Text>
              <Text style={styles.statLabel}>Tokens</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{streak}🔥</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
          </View>
        </View>
      ) : (
        <Text>Loading user data...</Text>
      )}

      <TouchableOpacity style={styles.button} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
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
    padding: 20,
    alignItems: 'center',
  },
  email: {
    fontSize: 18,
    color: '#374151',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5,
  },
  button: {
    backgroundColor: '#EF4444',
    marginHorizontal: 15,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});