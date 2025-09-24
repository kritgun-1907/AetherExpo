// src/screens/main/LeaderboardScreen.js - REAL-TIME UPDATES FIXED
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  ImageBackground, 
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../api/supabase';
import { useTheme } from '../../context/ThemeContext';

const BACKGROUND_IMAGE = require('../../../assets/hero-carbon-tracker.jpg');

export default function LeaderboardScreen() {
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
  
  // State management
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [timeRange, setTimeRange] = useState('weekly'); // 'weekly', 'monthly', 'all-time'

  useEffect(() => {
    initializeLeaderboard();
  }, [timeRange]);

  // Set up real-time subscription for emissions changes
  useEffect(() => {
    const emissionsSubscription = supabase
      .channel('emissions_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'emissions' },
        (payload) => {
          console.log('Emissions changed:', payload);
          // Refresh leaderboard when emissions change
          loadLeaderboardData();
        }
      )
      .subscribe();

    const profilesSubscription = supabase
      .channel('profiles_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_profiles' },
        (payload) => {
          console.log('Profile changed:', payload);
          // Refresh leaderboard when profiles change
          loadLeaderboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(emissionsSubscription);
      supabase.removeChannel(profilesSubscription);
    };
  }, [timeRange]);

  const initializeLeaderboard = async () => {
    setLoading(true);
    try {
      await getCurrentUser();
      await loadLeaderboardData();
    } catch (error) {
      console.error('Error initializing leaderboard:', error);
      setUsers(getFallbackLeaderboardData());
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setCurrentUser(user);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date('2020-01-01'); // All time
    }
    
    return startDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const loadLeaderboardData = async () => {
    try {
      console.log(`Loading leaderboard data for ${timeRange} range...`);
      
      const dateFilter = getDateRange();
      console.log('Date filter:', dateFilter);

      // Method 1: Try to get data with proper aggregation
      const { data: leaderboardData, error } = await supabase
        .rpc('get_leaderboard_with_emissions', {
          time_range: timeRange,
          start_date: dateFilter
        });

      if (!error && leaderboardData) {
        console.log('Got data from RPC function:', leaderboardData);
        setUsers(processLeaderboardData(leaderboardData));
        return;
      }

      console.log('RPC function not available, using alternative method');
      await loadLeaderboardDataAlternative();

    } catch (error) {
      console.error('Error loading leaderboard data:', error);
      await loadLeaderboardDataAlternative();
    }
  };

  const loadLeaderboardDataAlternative = async () => {
    try {
      const dateFilter = getDateRange();
      
      // Get all user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(100);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        throw profilesError;
      }

      console.log('Loaded profiles:', profiles?.length || 0);

      // Get emissions data for the time period
      const { data: emissions, error: emissionsError } = await supabase
        .from('emissions')
        .select('user_id, amount, created_at, category')
        .gte('created_at', dateFilter + 'T00:00:00.000Z')
        .order('created_at', { ascending: false });

      if (emissionsError) {
        console.warn('Error loading emissions:', emissionsError);
      }

      console.log('Loaded emissions:', emissions?.length || 0);
      console.log('Emissions data sample:', emissions?.slice(0, 3));

      // Process the data
      const processedUsers = profiles.map(user => {
        // Calculate recent emissions for this user
        let recentEmissions = 0;
        let emissionCount = 0;
        
        if (emissions) {
          const userEmissions = emissions.filter(emission => emission.user_id === user.id);
          recentEmissions = userEmissions.reduce((sum, emission) => {
            const amount = parseFloat(emission.amount) || 0;
            emissionCount++;
            return sum + amount;
          }, 0);
          
          console.log(`User ${user.full_name || user.email}: ${emissionCount} emissions, total: ${recentEmissions}`);
        }

        // Use recent emissions if available, otherwise fall back to total_emissions
        const displayEmissions = timeRange === 'all-time' ? 
          (user.total_emissions || 0) : 
          (recentEmissions > 0 ? recentEmissions : (user.total_emissions || 0));

        return {
          id: user.id,
          name: user.full_name || user.email?.split('@')[0] || 'Anonymous',
          emissions: displayEmissions,
          totalEmissions: user.total_emissions || 0,
          ecoPoints: user.eco_points || 0,
          avatar_url: user.avatar_url,
          isCurrentUser: currentUser?.id === user.id,
          rank: 0 // Will be set after sorting
        };
      });

      // Filter out users with 0 emissions for better display
      const usersWithEmissions = processedUsers.filter(user => user.emissions > 0);
      
      // Sort by emissions (lower is better for carbon footprint)
      const sortedUsers = usersWithEmissions.sort((a, b) => a.emissions - b.emissions);
      
      // Add ranks
      const rankedUsers = sortedUsers.map((user, index) => ({
        ...user,
        rank: index + 1
      }));

      console.log('Final processed users:', rankedUsers.length);
      console.log('Top 3 users:', rankedUsers.slice(0, 3).map(u => ({ name: u.name, emissions: u.emissions })));

      setUsers(rankedUsers);

    } catch (error) {
      console.error('Alternative loading method failed:', error);
      setUsers(getFallbackLeaderboardData());
    }
  };

  const processLeaderboardData = (data) => {
    return data.map((user, index) => ({
      id: user.id || user.user_id,
      name: user.full_name || user.email?.split('@')[0] || 'Anonymous',
      emissions: parseFloat(user.recent_emissions) || parseFloat(user.total_emissions) || 0,
      totalEmissions: parseFloat(user.total_emissions) || 0,
      ecoPoints: user.eco_points || 0,
      avatar_url: user.avatar_url,
      isCurrentUser: currentUser?.id === (user.id || user.user_id),
      rank: index + 1
    }));
  };

  const getFallbackLeaderboardData = () => [
    { 
      id: 'sample-1', 
      name: 'Sarah Green', 
      emissions: 6.2, 
      totalEmissions: 6.2,
      ecoPoints: 150,
      isCurrentUser: false,
      rank: 1
    },
    { 
      id: 'sample-2', 
      name: 'You', 
      emissions: 7.1, 
      totalEmissions: 7.1,
      ecoPoints: 130,
      isCurrentUser: true,
      rank: 2
    },
    { 
      id: 'sample-3', 
      name: 'John Eco', 
      emissions: 8.5, 
      totalEmissions: 8.5,
      ecoPoints: 120,
      isCurrentUser: false,
      rank: 3
    },
    { 
      id: 'sample-4', 
      name: 'Emma Carbon', 
      emissions: 9.2, 
      totalEmissions: 9.2,
      ecoPoints: 110,
      isCurrentUser: false,
      rank: 4
    },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadLeaderboardData();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTimeRangeChange = (newRange) => {
    setTimeRange(newRange);
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏅';
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return theme.accentText;
    }
  };

  if (loading) {
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

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accentText} />
          <Text style={[styles.loadingText, { color: theme.primaryText }]}>
            Loading leaderboard...
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

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.primaryText }]}>Leaderboard</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          Lowest carbon footprint wins!
        </Text>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {['weekly', 'monthly', 'all-time'].map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeRangeButton,
              {
                backgroundColor: timeRange === range ? theme.accentText : 'transparent',
                borderColor: theme.accentText,
              }
            ]}
            onPress={() => handleTimeRangeChange(range)}
          >
            <Text
              style={[
                styles.timeRangeText,
                { 
                  color: timeRange === range ? '#FFFFFF' : theme.accentText,
                  fontWeight: timeRange === range ? 'bold' : 'normal'
                }
              ]}
            >
              {range === 'all-time' ? 'All Time' : range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.7)' : theme.cardBackground }]}>
          <Text style={[styles.statValue, { color: theme.accentText }]}>{users.length}</Text>
          <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Participants</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.7)' : theme.cardBackground }]}>
          <Text style={[styles.statValue, { color: theme.accentText }]}>
            {users.find(u => u.isCurrentUser)?.rank || '-'}
          </Text>
          <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Your Rank</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.7)' : theme.cardBackground }]}>
          <Text style={[styles.statValue, { color: theme.accentText }]}>
            {users.length > 0 ? users[0].emissions.toFixed(1) : '0'}
          </Text>
          <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Best Score</Text>
        </View>
      </View>

      {/* Debug Info */}
      <View style={styles.debugContainer}>
        <Text style={[styles.debugText, { color: theme.secondaryText }]}>
          Range: {timeRange} | Users: {users.length} | Updated: {new Date().toLocaleTimeString()}
        </Text>
      </View>

      {/* Leaderboard List */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={true}
        indicatorStyle={isDarkMode ? "white" : "black"}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.accentText}
          />
        }
        renderItem={({ item }) => (
          <View style={[
            styles.card,
            {
              backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.7)' : theme.cardBackground,
              borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : theme.border,
              shadowColor: isDarkMode ? 'transparent' : '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDarkMode ? 0 : 0.1,
              shadowRadius: 3,
              elevation: isDarkMode ? 0 : 3,
            },
            item.isCurrentUser && {
              backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : '#D1FAE5',
              borderColor: theme.accentText,
              borderWidth: 2,
            }
          ]}>
            <View style={styles.rankContainer}>
              <Text style={styles.rankEmoji}>{getRankIcon(item.rank)}</Text>
              <Text style={[styles.rank, { color: getRankColor(item.rank) }]}>
                #{item.rank}
              </Text>
            </View>
            
            <View style={styles.userInfo}>
              <Text style={[styles.name, { color: theme.primaryText }]}>
                {item.name} {item.isCurrentUser && '(You)'}
              </Text>
              <Text style={[styles.points, { color: theme.secondaryText }]}>
                {item.ecoPoints} eco points
              </Text>
            </View>
            
            <View style={styles.emissionsContainer}>
              <Text style={[styles.emissions, { color: theme.accentText }]}>
                {item.emissions.toFixed(1)}kg CO₂
              </Text>
              <Text style={[styles.emissionsLabel, { color: theme.secondaryText }]}>
                {timeRange}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color={theme.secondaryText} />
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
              No leaderboard data available
            </Text>
            <TouchableOpacity 
              style={[styles.retryButton, { borderColor: theme.accentText }]}
              onPress={() => loadLeaderboardData()}
            >
              <Text style={[styles.retryText, { color: theme.accentText }]}>
                Retry Loading
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 60 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
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
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
  },
  timeRangeText: {
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 5,
  },
  debugContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  debugText: {
    fontSize: 10,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginVertical: 5,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  rankContainer: {
    alignItems: 'center',
    width: 60,
  },
  rankEmoji: {
    fontSize: 20,
  },
  rank: { 
    fontSize: 14, 
    fontWeight: 'bold',
    marginTop: 2,
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  name: { 
    fontSize: 16,
    fontWeight: '600',
  },
  points: {
    fontSize: 12,
    marginTop: 2,
  },
  emissionsContainer: {
    alignItems: 'flex-end',
  },
  emissions: { 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  emissionsLabel: {
    fontSize: 12,
    marginTop: 2,
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
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});