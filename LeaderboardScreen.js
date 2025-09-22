// src/screens/main/LeaderboardScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../../api/supabase';

export default function LeaderboardScreen() {
  const [users, setUsers] = useState([
    { id: 1, name: 'John', emissions: 8.5 },
    { id: 2, name: 'Sarah', emissions: 6.2 },
    { id: 3, name: 'You', emissions: 7.1, isCurrentUser: true },
  ]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>
      <FlatList
        data={users.sort((a, b) => a.emissions - b.emissions)}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <View style={[styles.card, item.isCurrentUser && styles.currentUser]}>
            <Text style={styles.rank}>#{index + 1}</Text>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.emissions}>{item.emissions}kg CO₂</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDF4', paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#065F46', padding: 20 },
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 5,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  currentUser: { backgroundColor: '#D1FAE5' },
  rank: { fontSize: 20, fontWeight: 'bold', color: '#10B981', width: 40 },
  name: { flex: 1, fontSize: 16, color: '#374151' },
  emissions: { fontSize: 16, fontWeight: '600', color: '#065F46' },
});