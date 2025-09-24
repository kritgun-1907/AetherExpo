// src/screens/main/ChallengesScreen.js - UPDATED WITH SOCIAL COMPONENTS
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  Alert, 
  ImageBackground, 
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../api/supabase';

// Import the social components
import ChallengeCard from '../../components/social/ChallengeCard';
import ShareButton from '../../components/social/ShareButton';

// Import store with error handling
let useCarbonStore = null;
try {
  const carbonStoreModule = require('../../store/carbonStore');
  if (carbonStoreModule && carbonStoreModule.useCarbonStore) {
    useCarbonStore = carbonStoreModule.useCarbonStore;
  }
} catch (error) {
  console.warn('CarbonStore not available, using fallback:', error.message);
  useCarbonStore = () => ({
    earnTokens: () => console.log('Fallback earnTokens called'),
  });
}

const BACKGROUND_IMAGE = require('../../../assets/hero-carbon-tracker.jpg');

export default function ChallengesScreen() {
  const themeContext = useTheme();
  const theme = themeContext?.theme || {
    primaryText: '#111827',
    secondaryText: '#6B7280',
    accentText: '#10B981',
    cardBackground: '#FFFFFF',
    background: '#F0FDF4',
    border: '#E5E7EB',
    overlayBackground: 'rgba(17, 24, 39, 0.9)',
    statusBarStyle: 'dark-content'
  };
  
  const isDarkMode = themeContext?.isDarkMode || false;
  
  const storeState = useCarbonStore ? useCarbonStore() : null;
  const earnTokens = storeState?.earnTokens || (() => {});

  const [challenges, setChallenges] = useState([
    { 
      id: '1',
      title: 'Zero Emission Day',
      description: 'Complete a full day with absolutely zero carbon emissions. Track all your activities and keep them carbon neutral!',
      emoji: '🌟',
      challengeType: 'individual',
      targetValue: 0,
      targetUnit: 'kg CO₂',
      currentProgress: 0,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      rewardTokens: 50,
      participantCount: 234,
      isActive: true
    },
    { 
      id: '2',
      title: 'Public Transport Week',
      description: 'Use only public transportation, walking, or cycling for all your travels this week. No personal vehicles!',
      emoji: '🚌',
      challengeType: 'group',
      targetValue: 7,
      targetUnit: 'days',
      currentProgress: 3,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      rewardTokens: 100,
      participantCount: 567,
      isActive: true
    },
    { 
      id: '3',
      title: 'Vegan Challenge',
      description: 'Eat only plant-based meals for 3 consecutive days. Track your food emissions and see the difference!',
      emoji: '🌱',
      challengeType: 'global',
      targetValue: 3,
      targetUnit: 'days',
      currentProgress: 1,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      rewardTokens: 75,
      participantCount: 892,
      isActive: true
    },
    { 
      id: '4',
      title: 'Energy Saver',
      description: 'Reduce your home energy consumption by 30% this week compared to your average.',
      emoji: '⚡',
      challengeType: 'individual',
      targetValue: 30,
      targetUnit: '% reduction',
      currentProgress: 12,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      rewardTokens: 60,
      participantCount: 445,
      isActive: true
    },
  ]);

  const [joinedChallenges, setJoinedChallenges] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'joined', 'completed'

  useEffect(() => {
    loadUserChallenges();
  }, []);

  const loadUserChallenges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userChallenges } = await supabase
        .from('user_challenges')
        .select('challenge_id, status, current_progress')
        .eq('user_id', user.id);

      if (userChallenges) {
        const joinedIds = userChallenges.map(uc => uc.challenge_id);
        setJoinedChallenges(joinedIds);
        
        // Update challenge progress
        setChallenges(prev => prev.map(challenge => {
          const userChallenge = userChallenges.find(uc => uc.challenge_id === challenge.id);
          if (userChallenge) {
            return {
              ...challenge,
              currentProgress: userChallenge.current_progress,
            };
          }
          return challenge;
        }));
      }
    } catch (error) {
      console.error('Error loading user challenges:', error);
    }
  };

  const handleJoinChallenge = async (challenge) => {
    Alert.alert(
      'Join Challenge',
      `Join "${challenge.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Join', 
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                Alert.alert('Error', 'Please log in to join challenges');
                return;
              }

              // Add to database
              const { error } = await supabase
                .from('user_challenges')
                .insert({
                  user_id: user.id,
                  challenge_id: challenge.id,
                  status: 'active',
                  current_progress: 0,
                });

              if (error) {
                console.error('Error joining challenge:', error);
              }

              // Update local state
              setJoinedChallenges([...joinedChallenges, challenge.id]);
              earnTokens(5);
              Alert.alert('Success', `You joined the ${challenge.title} challenge!`);
            } catch (error) {
              console.error('Error joining challenge:', error);
              Alert.alert('Error', 'Failed to join challenge');
            }
          }
        }
      ]
    );
  };

  const handleShareChallenge = async (challenge) => {
    try {
      const result = await Share.share({
        message: `Join me in the "${challenge.title}" challenge on Aether! ${challenge.description} 🌍`,
        title: challenge.title,
      });
      
      if (result.action === Share.sharedAction) {
        earnTokens(2);
        Alert.alert('Thanks for sharing!', 'You earned 2 tokens!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleViewDetails = (challenge) => {
    Alert.alert(
      challenge.title,
      `${challenge.description}\n\nReward: ${challenge.rewardTokens} tokens\nParticipants: ${challenge.participantCount}`,
      [{ text: 'OK' }]
    );
  };

  const filteredChallenges = () => {
    switch (activeTab) {
      case 'joined':
        return challenges.filter(c => joinedChallenges.includes(c.id));
      case 'completed':
        return challenges.filter(c => 
          joinedChallenges.includes(c.id) && 
          c.currentProgress >= c.targetValue
        );
      default:
        return challenges;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor="transparent" translucent />
      
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

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.primaryText }]}>Challenges</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            Complete challenges to earn rewards and reduce your carbon footprint
          </Text>
        </View>

        {/* Share Button */}
        <View style={styles.shareContainer}>
          <ShareButton
            title="Share Your Progress"
            message="I'm taking on carbon reduction challenges with Aether!"
            type="challenge"
            variant="primary"
            size="medium"
            onShareComplete={() => earnTokens(3)}
          />
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          {['all', 'joined', 'completed'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                {
                  backgroundColor: activeTab === tab ? theme.accentText : 'transparent',
                  borderColor: theme.accentText,
                  borderWidth: activeTab === tab ? 0 : 1,
                }
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  { 
                    color: activeTab === tab ? '#FFFFFF' : theme.accentText,
                    fontWeight: activeTab === tab ? 'bold' : 'normal'
                  }
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.7)' : theme.cardBackground }]}>
            <Text style={[styles.statValue, { color: theme.accentText }]}>{joinedChallenges.length}</Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.7)' : theme.cardBackground }]}>
            <Text style={[styles.statValue, { color: theme.accentText }]}>
              {challenges.filter(c => joinedChallenges.includes(c.id) && c.currentProgress >= c.targetValue).length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Completed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.7)' : theme.cardBackground }]}>
            <Text style={[styles.statValue, { color: theme.accentText }]}>
              {challenges.reduce((sum, c) => joinedChallenges.includes(c.id) ? sum + c.rewardTokens : sum, 0)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Potential Tokens</Text>
          </View>
        </View>

        {/* Challenges List */}
        <View style={styles.challengesList}>
          {filteredChallenges().map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              isJoined={joinedChallenges.includes(challenge.id)}
              onJoin={() => handleJoinChallenge(challenge)}
              onShare={() => handleShareChallenge(challenge)}
              onViewDetails={() => handleViewDetails(challenge)}
            />
          ))}
        </View>

        {filteredChallenges().length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color={theme.secondaryText} />
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
              {activeTab === 'joined' 
                ? "You haven't joined any challenges yet"
                : activeTab === 'completed'
                ? "No completed challenges yet"
                : "No challenges available"}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
  },
  shareContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 5,
  },
  challengesList: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
});