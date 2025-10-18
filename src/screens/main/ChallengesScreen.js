// src/screens/main/ChallengesScreen.js - WITH CUSTOM CHALLENGES FEATURE
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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../api/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import the social components (with fallback)
let ChallengeCard, ShareButton;
try {
  ChallengeCard = require('../../components/social/ChallengeCard').default;
  ShareButton = require('../../components/social/ShareButton').default;
} catch (error) {
  console.warn('Social components not available, using fallbacks');
  // Fallback components
  ChallengeCard = ({ challenge, isJoined, onJoin, onShare, onViewDetails, onDelete, showDelete }) => (
    <View style={styles.fallbackCard}>
      {showDelete && (
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={onDelete}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      )}
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
  const [customChallenges, setCustomChallenges] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // ✅ Added here
  
  // Custom challenge modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    targetValue: '',
    targetUnit: 'days',
    rewardTokens: '10',
    emoji: '🎯'
  });

  // Emoji and unit options
  const availableEmojis = ['🎯', '🌟', '💪', '🔥', '⚡', '🌱', '♻️', '🚴', '🌍', '💚'];
  const unitOptions = ['days', 'kg CO₂', 'km', 'items', 'meals'];

  // ✅ SINGLE onRefresh function
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadChallengesFromBackend(),
        currentUser ? loadUserChallenges(currentUser.id) : Promise.resolve(),
        currentUser ? loadCustomChallenges() : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ Initialize screen on mount
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
        await loadCustomChallenges();
      }
    } catch (error) {
      console.error('Error in checkUser:', error);
    }
  };

  const ensureUserProfile = async (user) => {
    try {
      const { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching user profile:', fetchError);
        return;
      }

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
      const { data: backendChallenges, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .is('created_by', null) // ✅ Only load system challenges, not custom ones
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Backend challenges not available, using fallback data');
        setChallenges(getFallbackChallenges());
      } else if (backendChallenges && backendChallenges.length > 0) {
        // ✅ Remove duplicates by ID
        const uniqueChallenges = backendChallenges.filter((challenge, index, self) =>
          index === self.findIndex((c) => c.id === challenge.id)
        );
        setChallenges(uniqueChallenges);
      } else {
        console.log('No challenges in backend, using fallback data');
        setChallenges(getFallbackChallenges());
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
      setChallenges(getFallbackChallenges());
    }
  };

  // ⭐ CUSTOM CHALLENGES FUNCTIONS
  const loadCustomChallenges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('created_by', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Using local custom challenges');
        const stored = await AsyncStorage.getItem(`custom_challenges_${user.id}`);
        if (stored) {
          setCustomChallenges(JSON.parse(stored));
        }
      } else {
        setCustomChallenges(data || []);
      }
    } catch (error) {
      console.error('Error loading custom challenges:', error);
    }
  };

  const createCustomChallenge = async () => {
    if (!newChallenge.title || !newChallenge.description || !newChallenge.targetValue) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create challenges');
        return;
      }

      const challengeData = {
        id: `custom-${Date.now()}`,
        title: newChallenge.title,
        description: newChallenge.description,
        emoji: newChallenge.emoji,
        challenge_type: 'individual',
        target_value: parseFloat(newChallenge.targetValue),
        target_unit: newChallenge.targetUnit,
        reward_tokens: parseInt(newChallenge.rewardTokens),
        is_active: true,
        created_by: user.id,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('challenges')
        .insert(challengeData);

      if (error) {
        const updatedCustom = [...customChallenges, challengeData];
        setCustomChallenges(updatedCustom);
        await AsyncStorage.setItem(`custom_challenges_${user.id}`, JSON.stringify(updatedCustom));
      } else {
        await loadCustomChallenges();
      }

      setNewChallenge({
        title: '',
        description: '',
        targetValue: '',
        targetUnit: 'days',
        rewardTokens: '10',
        emoji: '🎯'
      });
      setShowCustomModal(false);
      
      Alert.alert('Success! 🎉', 'Your custom challenge has been created!');
    } catch (error) {
      console.error('Error creating custom challenge:', error);
      Alert.alert('Error', 'Failed to create challenge. Please try again.');
    }
  };

 const deleteCustomChallenge = async (challengeId) => {
  Alert.alert(
    'Delete Challenge',
    'Are you sure you want to delete this custom challenge?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          console.log('🗑️ Deleting challenge:', challengeId);
          
          // ✅ Update UI immediately using functional setState
          setCustomChallenges(prevChallenges => {
            const updated = prevChallenges.filter(c => c.id !== challengeId);
            
            // Also update AsyncStorage
            (async () => {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await AsyncStorage.setItem(`custom_challenges_${user.id}`, JSON.stringify(updated));
              }
            })();
            
            return updated;
          });
          
          // Delete from database in background
          try {
            await supabase
              .from('challenges')
              .delete()
              .eq('id', challengeId);
            console.log('✅ Deleted from database');
          } catch (error) {
            console.error('Database delete error:', error);
          }
          
          // Show success
          Alert.alert('Deleted ✅', 'Challenge removed successfully');
        }
      }
    ]
  );
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
      description: 'Eat only plant-based meals for 3 consecutive days.',
      emoji: '🌱',
      challenge_type: 'global',
      target_value: 3,
      target_unit: 'days',
      reward_tokens: 75,
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
                Alert.alert('Error', 'Failed to join challenge. Please try again.');
                return;
              }

              setJoinedChallenges(prev => [...prev, challenge.id]);
              earnTokens(5);
              Alert.alert('Success', `You joined the ${challenge.title} challenge!`);
            } catch (error) {
              console.error('Error joining challenge:', error);
              Alert.alert('Error', 'Failed to join challenge.');
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
      case 'custom':
        return customChallenges;
      default:
        return challenges;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.statusBarStyle} backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color={theme.accentText} />
        <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Loading challenges...</Text>
      </View>
    );
  }

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
            colors={[theme.accentText]}
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

        {/* Tab Selector - WITH CUSTOM TAB */}
        <View style={styles.tabContainer}>
          {['all', 'joined', 'completed', 'custom'].map((tab) => (
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
                {tab === 'custom' ? '✨ Custom' : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
              {activeTab === 'custom' ? customChallenges.length : challenges.reduce((sum, c) => {
                if (joinedChallenges.includes(c.id)) {
                  return sum + (c.reward_tokens || c.rewardTokens || 0);
                }
                return sum;
              }, 0)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
              {activeTab === 'custom' ? 'Custom' : 'Potential Tokens'}
            </Text>
          </View>
        </View>

        {/* Create Custom Challenge Button */}
        {activeTab === 'custom' && (
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: theme.accentText }]}
            onPress={() => setShowCustomModal(true)}
          >
            <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create Custom Challenge</Text>
          </TouchableOpacity>
        )}

        {/* Challenges List */}
        <View style={styles.challengesList}>
          {filteredChallenges().map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={{
                ...challenge,
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
              onDelete={activeTab === 'custom' ? () => deleteCustomChallenge(challenge.id) : undefined}
              showDelete={activeTab === 'custom'}
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
                : activeTab === 'custom'
                ? "No custom challenges yet. Create one!"
                : "No challenges available"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Custom Challenge Creation Modal */}
      <Modal
        visible={showCustomModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: theme.primaryText }]}>
                Create Custom Challenge
              </Text>

              {/* Emoji Picker */}
              <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>Choose Icon</Text>
              <View style={styles.emojiContainer}>
                {availableEmojis.map(emoji => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiOption,
                      newChallenge.emoji === emoji && styles.emojiSelected
                    ]}
                    onPress={() => setNewChallenge({...newChallenge, emoji})}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title Input */}
              <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>Challenge Title *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                  color: theme.primaryText
                }]}
                placeholder="e.g., Walk 10,000 steps daily"
                placeholderTextColor={theme.secondaryText}
                value={newChallenge.title}
                onChangeText={(text) => setNewChallenge({...newChallenge, title: text})}
              />

              {/* Description Input */}
              <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>Description *</Text>
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                  color: theme.primaryText
                }]}
                placeholder="Describe your challenge goals..."
                placeholderTextColor={theme.secondaryText}
                value={newChallenge.description}
                onChangeText={(text) => setNewChallenge({...newChallenge, description: text})}
                multiline
                numberOfLines={4}
              />

              {/* Target Value */}
              <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>Target Value *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                  color: theme.primaryText
                }]}
                placeholder="e.g., 7"
                placeholderTextColor={theme.secondaryText}
                value={newChallenge.targetValue}
                onChangeText={(text) => setNewChallenge({...newChallenge, targetValue: text})}
                keyboardType="numeric"
              />

              {/* Unit Picker */}
              <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>Unit</Text>
              <View style={styles.unitContainer}>
                {unitOptions.map(unit => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitOption,
                      { borderColor: theme.accentText },
                      newChallenge.targetUnit === unit && { backgroundColor: theme.accentText }
                    ]}
                    onPress={() => setNewChallenge({...newChallenge, targetUnit: unit})}
                  >
                    <Text style={[
                      styles.unitText,
                      { color: newChallenge.targetUnit === unit ? '#FFFFFF' : theme.accentText }
                    ]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reward Tokens */}
              <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>Reward Tokens</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                  color: theme.primaryText
                }]}
                placeholder="10"
                placeholderTextColor={theme.secondaryText}
                value={newChallenge.rewardTokens}
                onChangeText={(text) => setNewChallenge({...newChallenge, rewardTokens: text})}
                keyboardType="numeric"
              />

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]}
                  onPress={() => setShowCustomModal(false)}
                >
                  <Text style={[styles.buttonText, { color: theme.secondaryText }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.createChallengeButton, { backgroundColor: theme.accentText }]}
                  onPress={createCustomChallenge}
                >
                  <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Create</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  textArea: {
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    height: 100,
    textAlignVertical: 'top',
  },
  emojiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  emojiOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  emojiText: {
    fontSize: 24,
  },
  unitContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  createChallengeButton: {
    // backgroundColor set inline
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
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
    position: 'relative',
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
  deleteButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    zIndex: 10,
  },
});