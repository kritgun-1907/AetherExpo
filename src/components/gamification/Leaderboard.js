// src/components/gamification/Leaderboard.js
import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

export default function Leaderboard({ users, currentUserId }) {
  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <View style={[
          styles.row,
          item.id === currentUserId && styles.currentUser
        ]}>
          <Text style={styles.rank}>#{index + 1}</Text>
          <View style={styles.userInfo}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.emissions}>{item.emissions.toFixed(1)}kg CO₂</Text>
          </View>
          {index < 3 && (
            <Text style={styles.medal}>
              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
            </Text>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 5,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
  },
  currentUser: {
    backgroundColor: '#D1FAE5',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    width: 40,
  },
  userInfo: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  emissions: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  medal: {
    fontSize: 24,
  }
});