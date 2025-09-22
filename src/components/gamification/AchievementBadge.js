// src/components/gamification/AchievementBadge.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AchievementBadge({ achievement, size = 'medium' }) {
  const sizeStyles = {
    small: { badge: 60, emoji: 24, text: 10 },
    medium: { badge: 80, emoji: 32, text: 12 },
    large: { badge: 100, emoji: 40, text: 14 }
  };
  
  const currentSize = sizeStyles[size];
  
  return (
    <View style={[styles.badge, { width: currentSize.badge, height: currentSize.badge }]}>
      <Text style={{ fontSize: currentSize.emoji }}>{achievement.emoji}</Text>
      <Text style={[styles.name, { fontSize: currentSize.text }]}>{achievement.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  name: {
    color: '#065F46',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  }
});