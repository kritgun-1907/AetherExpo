// src/components/gamification/StreakCounter.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StreakCounter({ streak }) {
  return (
    <View style={styles.container}>
      <Text style={styles.streakNumber}>{streak}</Text>
      <Text style={styles.fireEmoji}>🔥</Text>
      <Text style={styles.label}>Day Streak</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    minWidth: 100,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#92400E',
  },
  fireEmoji: {
    fontSize: 24,
    marginVertical: 5,
  },
  label: {
    fontSize: 12,
    color: '#78350F',
  }
});