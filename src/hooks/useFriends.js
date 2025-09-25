// src/hooks/useFriends.js - Complete hook for managing friends functionality
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { Alert } from 'react-native';

const FRIEND_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  BLOCKED: 'blocked'
};

const FREE_FRIEND_LIMIT = 5;

export const useFriends = () => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [searchResults, setSearchResults] = useState([]);

  // Load current user
  const loadCurrentUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Error loading current user:', error);
      return null;
    }
  }, []);

  // Check premium status
  const checkPremiumStatus = useCallback(async (user = null) => {
    try {
      const currentUser = user || await loadCurrentUser();
      if (!currentUser) return false;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_premium')
        .eq('id', currentUser.id)
        .single();

      const premium = profile?.is_premium || false;
      setIsPremium(premium);
      return premium;
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
      return false;
    }
  }, [loadCurrentUser]);

  // Load friends list
  const loadFriends = useCallback(async (user = null) => {
    try {
      setLoading(true);
      const currentUser = user || await loadCurrentUser();
      if (!currentUser) return [];

      const { data: connections, error } = await supabase
        .from('user_connections')
        .select(`
          *,
          requester:user_profiles!user_connections_requester_id_fkey(id, full_name, email, avatar_url, eco_points, total_emissions),
          addressee:user_profiles!user_connections_addressee_id_fkey(id, full_name, email, avatar_url, eco_points, total_emissions)
        `)
        .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`)
        .eq('status', FRIEND_STATUS.ACCEPTED)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading friends:', error);
        return [];
      }

      const friendsData = connections?.map(connection => {
        const friend = connection.requester_id === currentUser.id 
          ? connection.addressee 
          : connection.requester;
        
        return {
          ...friend,
          connectionId: connection.id,
          connectedAt: connection.updated_at,
          isOnline: Math.random() > 0.5, // Replace with real online status logic
          lastSeen: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
        };
      }) || [];

      setFriends(friendsData);
      setFriendCount(friendsData.length);
      return friendsData;
    } catch (error) {
      console.error('Error loading friends:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [loadCurrentUser]);

  // Load friend requests
  const loadFriendRequests = useCallback(async (user = null) => {
    try {
      const currentUser = user || await loadCurrentUser();
      if (!currentUser) return [];

      const { data: requests, error } = await supabase
        .from('user_connections')
        .select(`
          *,
          requester:user_profiles!user_connections_requester_id_fkey(id, full_name, email, avatar_url, eco_points, total_emissions)
        `)
        .eq('addressee_id', currentUser.id)
        .eq('status', FRIEND_STATUS.PENDING)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading friend requests:', error);
        return [];
      }

      setFriendRequests(requests || []);
      return requests || [];
    } catch (error) {
      console.error('Error loading friend requests:', error);
      return [];
    }
  }, [loadCurrentUser]);

  // Search users by email or username
  const searchUsers = useCallback(async (query, searchType = 'username') => {
    if (!query.trim()) {
      setSearchResults([]);
      return [];
    }

    try {
      setLoading(true);
      const user = currentUser || await loadCurrentUser();
      if (!user) return [];

      let searchData;
      
      if (searchType === 'email') {
        const { data: users, error } = await supabase
          .from('user_profiles')
          .select('id, full_name, email, avatar_url, eco_points, total_emissions')
          .neq('id', user.id)
          .ilike('email', `%${query}%`)
          .limit(20);
        
        if (error) {
          console.error('Error searching users by email:', error);
          return [];
        }
        searchData = users;
      } else {
        // Search by full_name (username)
        const { data: users, error } = await supabase
          .from('user_profiles')
          .select('id, full_name, email, avatar_url, eco_points, total_emissions')
          .neq('id', user.id)
          .ilike('full_name', `%${query}%`)
          .limit(20);
          
        if (error) {
          console.error('Error searching users by username:', error);
          return [];
        }
        searchData = users;
      }

      // Check existing connections
      const { data: existingConnections } = await supabase
        .from('user_connections')
        .select('requester_id, addressee_id, status')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      const connectionsMap = {};
      existingConnections?.forEach(conn => {
        const otherId = conn.requester_id === user.id ? conn.addressee_id : conn.requester_id;
        connectionsMap[otherId] = conn.status;
      });

      const usersWithConnectionStatus = searchData?.map(u => ({
        ...u,
        connectionStatus: connectionsMap[u.id] || null
      })) || [];

      setSearchResults(usersWithConnectionStatus);
      return usersWithConnectionStatus;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser, loadCurrentUser]);

  // Check friend limit before actions
  const checkFriendLimit = useCallback(() => {
    if (!isPremium && friendCount >= FREE_FRIEND_LIMIT) {
      return false;
    }
    return true;
  }, [isPremium, friendCount]);

  // Send friend request
  const sendFriendRequest = useCallback(async (userId) => {
    // Check friend limit
    if (!checkFriendLimit()) {
      Alert.alert(
        'Friend Limit Reached',
        `Free users can add up to ${FREE_FRIEND_LIMIT} friends. Upgrade to Premium for unlimited friends!`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade', onPress: () => {
            // Handle premium upgrade navigation
            Alert.alert('Premium Upgrade', 'Premium upgrade feature coming soon!');
          }}
        ]
      );
      return { success: false, error: 'Friend limit reached' };
    }

    try {
      const user = currentUser || await loadCurrentUser();
      if (!user) return { success: false, error: 'User not authenticated' };

      const { error } = await supabase
        .from('user_connections')
        .insert([{
          requester_id: user.id,
          addressee_id: userId,
          status: FRIEND_STATUS.PENDING
        }]);

      if (error) {
        console.error('Error sending friend request:', error);
        return { success: false, error: 'Failed to send friend request' };
      }

      // Update search results to reflect the change
      setSearchResults(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, connectionStatus: FRIEND_STATUS.PENDING }
            : user
        )
      );

      return { success: true, message: 'Friend request sent successfully!' };
    } catch (error) {
      console.error('Error sending friend request:', error);
      return { success: false, error: 'Failed to send friend request' };
    }
  }, [currentUser, checkFriendLimit, loadCurrentUser]);

  // Respond to friend request (accept/decline)
  const respondToFriendRequest = useCallback(async (connectionId, response) => {
    // Check friend limit when accepting
    if (response === FRIEND_STATUS.ACCEPTED && !checkFriendLimit()) {
      Alert.alert(
        'Friend Limit Reached',
        `Free users can add up to ${FREE_FRIEND_LIMIT} friends. Upgrade to Premium for unlimited friends!`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade', onPress: () => {
            Alert.alert('Premium Upgrade', 'Premium upgrade feature coming soon!');
          }}
        ]
      );
      return { success: false, error: 'Friend limit reached' };
    }

    try {
      const { error } = await supabase
        .from('user_connections')
        .update({ status: response, updated_at: new Date().toISOString() })
        .eq('id', connectionId);

      if (error) {
        console.error('Error responding to friend request:', error);
        return { success: false, error: 'Failed to respond to friend request' };
      }

      // Reload data
      if (response === FRIEND_STATUS.ACCEPTED) {
        await loadFriends();
      }
      await loadFriendRequests();

      const message = response === FRIEND_STATUS.ACCEPTED 
        ? 'Friend request accepted!' 
        : 'Friend request declined.';

      return { success: true, message };
    } catch (error) {
      console.error('Error responding to friend request:', error);
      return { success: false, error: 'Failed to respond to friend request' };
    }
  }, [checkFriendLimit, loadFriends, loadFriendRequests]);

  // Remove friend
  const removeFriend = useCallback(async (connectionId) => {
    try {
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', connectionId);

      if (error) {
        console.error('Error removing friend:', error);
        return { success: false, error: 'Failed to remove friend' };
      }

      // Reload friends list
      await loadFriends();
      
      return { success: true, message: 'Friend removed successfully' };
    } catch (error) {
      console.error('Error removing friend:', error);
      return { success: false, error: 'Failed to remove friend' };
    }
  }, [loadFriends]);

  // Block user
  const blockUser = useCallback(async (userId) => {
    try {
      const user = currentUser || await loadCurrentUser();
      if (!user) return { success: false, error: 'User not authenticated' };

      // Check if connection exists
      const { data: existingConnection } = await supabase
        .from('user_connections')
        .select('id')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
        .single();

      if (existingConnection) {
        // Update existing connection
        const { error } = await supabase
          .from('user_connections')
          .update({ status: FRIEND_STATUS.BLOCKED, updated_at: new Date().toISOString() })
          .eq('id', existingConnection.id);

        if (error) throw error;
      } else {
        // Create new blocked connection
        const { error } = await supabase
          .from('user_connections')
          .insert([{
            requester_id: user.id,
            addressee_id: userId,
            status: FRIEND_STATUS.BLOCKED
          }]);

        if (error) throw error;
      }

      // Reload data
      await Promise.all([loadFriends(), loadFriendRequests()]);

      return { success: true, message: 'User blocked successfully' };
    } catch (error) {
      console.error('Error blocking user:', error);
      return { success: false, error: 'Failed to block user' };
    }
  }, [currentUser, loadCurrentUser, loadFriends, loadFriendRequests]);

  // Get friend statistics
  const getFriendStats = useCallback(() => {
    return {
      totalFriends: friendCount,
      maxFriends: isPremium ? 'Unlimited' : FREE_FRIEND_LIMIT,
      canAddMore: isPremium || friendCount < FREE_FRIEND_LIMIT,
      remainingSlots: isPremium ? 'Unlimited' : Math.max(0, FREE_FRIEND_LIMIT - friendCount),
      isPremium
    };
  }, [friendCount, isPremium]);

  // Initialize data on mount
  useEffect(() => {
    const initializeData = async () => {
      const user = await loadCurrentUser();
      if (user) {
        await Promise.all([
          checkPremiumStatus(user),
          loadFriends(user),
          loadFriendRequests(user)
        ]);
      }
    };

    initializeData();
  }, [loadCurrentUser, checkPremiumStatus, loadFriends, loadFriendRequests]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    const user = currentUser || await loadCurrentUser();
    if (user) {
      await Promise.all([
        checkPremiumStatus(user),
        loadFriends(user),
        loadFriendRequests(user)
      ]);
    }
  }, [currentUser, loadCurrentUser, checkPremiumStatus, loadFriends, loadFriendRequests]);

  return {
    // State
    friends,
    friendRequests,
    searchResults,
    loading,
    currentUser,
    isPremium,
    friendCount,

    // Actions
    searchUsers,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    blockUser,
    refreshData,
    loadFriends,
    loadFriendRequests,
    checkFriendLimit,

    // Utilities
    getFriendStats,
    
    // Constants
    FRIEND_STATUS,
    FREE_FRIEND_LIMIT
  };
};