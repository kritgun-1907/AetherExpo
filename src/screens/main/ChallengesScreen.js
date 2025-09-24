// src/screens/main/ChallengesScreen.js - PROPERLY CONNECTED TO BACKEND
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  ImageBackground, 
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Share,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../api/supabase';

// Import the social components (with fallback)
let ChallengeCard, ShareButton;
try {
  ChallengeCard = require('../../components/social/ChallengeCard').default;
  ShareButton = require('../../components/social/ShareButton').default;
} catch (error) {
  console.warn('Social components not available, using fallbacks');
  // Fallback components
  ChallengeCard = ({ challenge, isJoined, onJoin, onShare, onViewDetails }) => (
    <View style={styles.fallbackCard}>
      <Text style={styles.fallbackTitle}>{challenge.emoji} {challenge.title}</Text>
      <Text style={styles.fallbackDesc}>{challenge.description}</Text>
      <TouchableOpacity 
        style={[styles.fallbackButton, { backgroundColor: isJoined ? '#6B7280' : '#10B981' }]}
        onPress={isJoined ? onViewDetails : onJoin}
      >
        <Text style={styles.fallbackButtonText}>
          {isJoined ? 'View Details' : 'Join Challenge'}
        </Text>
      </TouchableOpacity>
    </View>
  );
  ShareButton = ({ title, onShareComplete }) => (
    <TouchableOpacity style={styles.fallbackButton} onPress={onShareComplete}>
      <Text style={styles.fallbackButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

// Import store with error handling
let useCarbonStore = null;
try {
  const carbonStoreModule = require('../../store/carbonStore');
  if (carbonStoreModule && carbonStoreModule.useCarbonStore) {
    useCarbonStore = carbonStoreModule.useCarbonStore;
  }
} catch (error) {
  console.warn('CarbonStore not available, using fallback:', error.message);
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
  const earnTokens = storeState?.earnTokens || (() => console.log('Earning tokens...'));

  // State management
  const [challenges, setChallenges] = useState([]);
  const [joinedChallenges, setJoinedChallenges] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    setLoading(true);
    try {
      await checkUser();
      await loadChallengesFromBackend();
    } catch (error) {
      console.error('Error initializing screen:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadChallengesFromBackend();
      if (currentUser) {
        await loadUserChallenges(currentUser.id);
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting user:', error);
        return;
      }
      
      setCurrentUser(user);
      
      if (user) {
        await ensureUserProfile(user);
        await loadUserChallenges(user.id);
      }
    } catch (error) {
      console.error('Error in checkUser:', error);
    }
  };

  const ensureUserProfile = async (user) => {
    try {
      // First check if profile exists
      const { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching user profile:', fetchError);
        return;
      }

      // If profile doesn't exist, create it
      if (!profile) {
        console.log('Creating user profile...');
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            eco_points: 0,
            total_emissions: 0,
            streak_count: 0,
            is_premium: false
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating user profile:', insertError);
          // Try alternative approach - user might already exist in auth.users
          console.log('Profile creation failed, user might already be set up');
        } else {
          console.log('User profile created successfully:', newProfile);
        }
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  };

  const loadChallengesFromBackend = async () => {
    try {
      // Try to load from backend first
      const { data: backendChallenges, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Backend challenges not available, using fallback data:', error.message);
        // Use fallback data if backend is not set up yet
        setChallenges(getFallbackChallenges());
      } else if (backendChallenges && backendChallenges.length > 0) {
        console.log('Loaded challenges from backend:', backendChallenges.length);
        setChallenges(backendChallenges);
      } else {
        console.log('No challenges in backend, using fallback data');
        // Insert fallback challenges into backend
        await insertFallbackChallenges();
        setChallenges(getFallbackChallenges());
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
      setChallenges(getFallbackChallenges());
    }
  };

  const getFallbackChallenges = () => [
    { 
      id: 'zero-emission-day',
      title: 'Zero Emission Day',
      description: 'Complete a full day with absolutely zero carbon emissions. Track all your activities and keep them carbon neutral!',
      emoji: '🌟',
      challenge_type: 'individual',
      target_value: 0,
      target_unit: 'kg CO₂',
      reward_tokens: 50,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    { 
      id: 'public-transport-week',
      title: 'Public Transport Week',
      description: 'Use only public transportation, walking, or cycling for all your travels this week. No personal vehicles!',
      emoji: '🚌',
      challenge_type: 'group',
      target_value: 7,
      target_unit: 'days',
      reward_tokens: 100,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    { 
      id: 'vegan-challenge',
      title: 'Vegan Challenge',
      description: 'Eat only plant-based meals for 3 consecutive days. Track your food emissions and see the difference!',
      emoji: '🌱',
      challenge_type: 'global',
      target_value: 3,
      target_unit: 'days',
      reward_tokens: 75,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    { 
      id: 'energy-saver',
      title: 'Energy Saver',
      description: 'Reduce your home energy consumption by 30% this week compared to your average.',
      emoji: '⚡',
      challenge_type: 'individual',
      target_value: 30,
      target_unit: '% reduction',
      reward_tokens: 60,
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];

  const insertFallbackChallenges = async () => {
    try {
      const fallbackChallenges = getFallbackChallenges();
      const { error } = await supabase
        .from('challenges')
        .upsert(fallbackChallenges, { onConflict: 'id' });

      if (error) {
        console.error('Error inserting fallback challenges:', error);
      } else {
        console.log('Fallback challenges inserted successfully');
      }
    } catch (error) {
      console.error('Error in insertFallbackChallenges:', error);
    }
  };

  const loadUserChallenges = async (userId) => {
    if (!userId) return;

    try {
      const { data: userChallenges, error } = await supabase
        .from('user_challenges')
        .select('challenge_id, status, current_progress')
        .eq('user_id', userId);

      if (error) {
        console.error('Error loading user challenges:', error);
        return;
      }

      if (userChallenges) {
        const joinedIds = userChallenges.map(uc => uc.challenge_id);
        setJoinedChallenges(joinedIds);
        
        // Update challenge progress
        setChallenges(prev => prev.map(challenge => {
          const userChallenge = userChallenges.find(uc => uc.challenge_id === challenge.id);
          if (userChallenge) {
            return {
              ...challenge,
              currentProgress: userChallenge.current_progress || 0,
              userStatus: userChallenge.status
            };
          }
          return { ...challenge, currentProgress: 0 };
        }));
      }
    } catch (error) {
      console.error('Error loading user challenges:', error);
    }
  };

  const handleJoinChallenge = async (challenge) => {
    if (!currentUser) {
      Alert.alert('Error', 'Please log in to join challenges');
      return;
    }

    Alert.alert(
      'Join Challenge',
      `Join "${challenge.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Join', 
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_challenges')
                .insert({
                  user_id: currentUser.id,
                  challenge_id: challenge.id,
                  status: 'active',
                  current_progress: 0,
                });

              if (error) {
                console.error('Error joining challenge:', error);
                
                // Check if it's a foreign key error
                if (error.message.includes('foreign key') || error.code === '23503') {
                  Alert.alert(
                    'Setup Required', 
                    'Your account needs to be set up. Please try refreshing the app or contact support.'
                  );
                } else {
                  Alert.alert('Error', `Failed to join challenge: ${error.message}`);
                }
                return;
              }

              // Update local state
              setJoinedChallenges(prev => [...prev, challenge.id]);
              earnTokens(5);
              Alert.alert('Success', `You joined the ${challenge.title} challenge!`);
            } catch (error) {
              console.error('Error joining challenge:', error);
              Alert.alert('Error', 'Failed to join challenge. Please try again.');
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
    const rewardTokens = challenge.reward_tokens || challenge.rewardTokens || 0;
    const participantCount = challenge.participant_count || challenge.participantCount || 0;
    
    Alert.alert(
      challenge.title,
      `${challenge.description}\n\nReward: ${rewardTokens} tokens\nParticipants: ${participantCount}`,
      [{ text: 'OK' }]
    );
  };

  const filteredChallenges = () => {
    switch (activeTab) {
      case 'joined':
        return challenges.filter(c => joinedChallenges.includes(c.id));
      case 'completed':
        return challenges.filter(c => {
          const isJoined = joinedChallenges.includes(c.id);
          const targetValue = c.target_value || c.targetValue || 0;
          const currentProgress = c.currentProgress || 0;
          return isJoined && currentProgress >= targetValue;
        });
      default:
        return challenges;
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.statusBarStyle} backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color={theme.accentText} />
        <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Loading challenges...</Text>
      </View>
    );
  }

  // Show login required message if user is not authenticated
  if (!currentUser) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.statusBarStyle} backgroundColor="transparent" translucent />
        
        <View style={styles.loginRequired}>
          <Ionicons name="lock-closed-outline" size={64} color={theme.secondaryText} />
          <Text style={[styles.loginText, { color: theme.primaryText }]}>
            Please log in to view challenges
          </Text>
          <Text style={[styles.loginSubtext, { color: theme.secondaryText }]}>
            Sign up or log in to join challenges and track your progress
          </Text>
        </View>
      </View>
    );
  }

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
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.accentText}
          />
        }
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
              {filteredChallenges().filter(c => c.userStatus === 'completed').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Completed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.7)' : theme.cardBackground }]}>
            <Text style={[styles.statValue, { color: theme.accentText }]}>
              {challenges.reduce((sum, c) => {
                if (joinedChallenges.includes(c.id)) {
                  return sum + (c.reward_tokens || c.rewardTokens || 0);
                }
                return sum;
              }, 0)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Potential Tokens</Text>
          </View>
        </View>

        {/* Challenges List */}
        <View style={styles.challengesList}>
          {filteredChallenges().map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={{
                ...challenge,
                // Normalize field names for compatibility
                challengeType: challenge.challenge_type || challenge.challengeType,
                targetValue: challenge.target_value || challenge.targetValue,
                targetUnit: challenge.target_unit || challenge.targetUnit,
                rewardTokens: challenge.reward_tokens || challenge.rewardTokens,
                participantCount: challenge.participant_count || challenge.participantCount || 0,
                isActive: challenge.is_active !== false,
              }}
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  loginRequired: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loginText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  loginSubtext: {
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  // Fallback component styles
  fallbackCard: {
    backgroundColor: '#FFFFFF',
    margin: 10,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  fallbackDesc: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  fallbackButton: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  fallbackButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});