// src/screens/main/ChallengesScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../api/supabase';
import { useCarbonStore } from '../../store/carbonStore';

export default function ChallengesScreen() {
  const { theme, isDarkMode } = useTheme();
  const { earnTokens } = useCarbonStore();
  const [challenges, setChallenges] = useState([
    { id: 1, title: 'Zero Emission Day', description: 'Have a day with 0 emissions', reward: 50, emoji: '🌟', active: true },
    { id: 2, title: 'Public Transport Week', description: 'Use only public transport for a week', reward: 100, emoji: '🚌', active: true },
    { id: 3, title: 'Vegan Challenge', description: 'Eat only vegan meals for 3 days', reward: 75, emoji: '🌱', active: true },
  ]);

  const joinChallenge = (challenge) => {
    Alert.alert(
      'Join Challenge',
      `Join "${challenge.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Join', 
          onPress: () => {
            earnTokens(5);
            Alert.alert('Success', `You joined the ${challenge.title} challenge!`);
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.primaryText }]}>Active Challenges</Text>
      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.challengeCard, { backgroundColor: theme.cardBackground }]}
            onPress={() => joinChallenge(item)}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={styles.textContainer}>
              <Text style={[styles.challengeTitle, { color: theme.primaryText }]}>{item.title}</Text>
              <Text style={[styles.description, { color: theme.secondaryText }]}>{item.description}</Text>
              <Text style={[styles.reward, { color: theme.accentText }]}>🏆 {item.reward} tokens</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', padding: 20 },
  challengeCard: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginVertical: 8,
    padding: 15,
    borderRadius: 12,
    elevation: 3,
  },
  emoji: { fontSize: 40, marginRight: 15 },
  textContainer: { flex: 1 },
  challengeTitle: { fontSize: 18, fontWeight: '600' },
  description: { fontSize: 14, marginTop: 5 },
  reward: { fontSize: 12, marginTop: 5, fontWeight: '500' },
});