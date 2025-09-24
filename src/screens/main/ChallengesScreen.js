// src/screens/main/ChallengesScreen.js - UPDATED WITH OVERLAY EFFECT
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ImageBackground, 
  StatusBar 
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../api/supabase';
import { useCarbonStore } from '../../store/carbonStore';

// Add the same background image import as HomeScreen
const BACKGROUND_IMAGE = require('../../../assets/hero-carbon-tracker.jpg');

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
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor="transparent" translucent />
      
      {/* Add the same overlay effect as HomeScreen */}
      {isDarkMode && (
        <>
          <ImageBackground 
            source={BACKGROUND_IMAGE} 
            resizeMode="cover" 
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.overlayBackground }]} />
        </>
      )}

      <Text style={[styles.title, { color: theme.primaryText }]}>Active Challenges</Text>
      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={true}
        indicatorStyle={isDarkMode ? "white" : "black"}
        scrollIndicatorInsets={{ right: 1 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[
              styles.challengeCard, 
              { 
                backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.7)' : theme.cardBackground,
                borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : theme.border,
                shadowColor: isDarkMode ? 'transparent' : '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDarkMode ? 0 : 0.1,
                shadowRadius: 3,
                elevation: isDarkMode ? 0 : 3,
              }
            ]}
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
  container: { 
    flex: 1, 
    paddingTop: 60 
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    padding: 20 
  },
  challengeCard: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginVertical: 8,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  emoji: { 
    fontSize: 40, 
    marginRight: 15 
  },
  textContainer: { 
    flex: 1 
  },
  challengeTitle: { 
    fontSize: 18, 
    fontWeight: '600' 
  },
  description: { 
    fontSize: 14, 
    marginTop: 5 
  },
  reward: { 
    fontSize: 12, 
    marginTop: 5, 
    fontWeight: '500' 
  },
});