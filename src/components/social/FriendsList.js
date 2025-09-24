// src/components/social/FriendsList.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../api/supabase';
import { Colors } from '../../styles/colors';
import { Typography, FontWeight } from '../../styles/fonts';
import { Shadows, BorderRadius, Spacing } from '../../styles/globalStyles';

const FRIEND_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  BLOCKED: 'blocked'
};

export default function FriendsList({ onFriendSelect }) {
  const { theme, isDarkMode } = useTheme();
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'search'
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadCurrentUser();
    loadFriends();
    loadFriendRequests();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadFriends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: connections, error } = await supabase
        .from('user_connections')
        .select(`
          *,
          requester:user_profiles!user_connections_requester_id_fkey(id, full_name, avatar_url, eco_points, total_emissions),
          addressee:user_profiles!user_connections_addressee_id_fkey(id, full_name, avatar_url, eco_points, total_emissions)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', FRIEND_STATUS.ACCEPTED)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading friends:', error);
        return;
      }

      // Format friends data
      const friendsData = connections?.map(connection => {
        const friend = connection.requester_id === user.id 
          ? connection.addressee 
          : connection.requester;
        
        return {
          ...friend,
          connectionId: connection.id,
          connectedAt: connection.updated_at,
          isOnline: Math.random() > 0.5, // Mock online status
          lastSeen: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
        };
      }) || [];

      setFriends(friendsData);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: requests, error } = await supabase
        .from('user_connections')
        .select(`
          *,
          requester:user_profiles!user_connections_requester_id_fkey(id, full_name, avatar_url, eco_points, total_emissions)
        `)
        .eq('addressee_id', user.id)
        .eq('status', FRIEND_STATUS.PENDING)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading friend requests:', error);
        return;
      }

      setFriendRequests(requests || []);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url, eco_points, total_emissions')
        .neq('id', user.id)
        .ilike('full_name', `%${query}%`)
        .limit(20);

      if (error) {
        console.error('Error searching users:', error);
        return;
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

      const usersWithConnectionStatus = users?.map(u => ({
        ...u,
        connectionStatus: connectionsMap[u.id] || null
      })) || [];

      setSearchResults(usersWithConnectionStatus);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_connections')
        .insert([{
          requester_id: user.id,
          addressee_id: userId,
          status: FRIEND_STATUS.PENDING
        }]);

      if (error) {
        console.error('Error sending friend request:', error);
        Alert.alert('Error', 'Failed to send friend request');
        return;
      }

      Alert.alert('Success', 'Friend request sent!');
      
      // Update search results
      setSearchResults(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, connectionStatus: FRIEND_STATUS.PENDING }
            : user
        )
      );
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const respondToFriendRequest = async (connectionId, response) => {
    try {
      const { error } = await supabase
        .from('user_connections')
        .update({ status: response, updated_at: new Date().toISOString() })
        .eq('id', connectionId);

      if (error) {
        console.error('Error responding to friend request:', error);
        Alert.alert('Error', 'Failed to respond to friend request');
        return;
      }

      if (response === FRIEND_STATUS.ACCEPTED) {
        Alert.alert('Success', 'Friend request accepted!');
        loadFriends();
      }

      loadFriendRequests();
    } catch (error) {
      console.error('Error responding to friend request:', error);
      Alert.alert('Error', 'Failed to respond to friend request');
    }
  };

  const removeFriend = async (connectionId) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_connections')
                .delete()
                .eq('id', connectionId);

              if (error) {
                console.error('Error removing friend:', error);
                Alert.alert('Error', 'Failed to remove friend');
                return;
              }

              loadFriends();
              Alert.alert('Success', 'Friend removed');
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', 'Failed to remove friend');
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFriends(), loadFriendRequests()]);
    setRefreshing(false);
  };

  const FriendCard = ({ friend }) => (
    <TouchableOpacity
      style={[
        styles.friendCard,
        {
          backgroundColor: isDarkMode ? Colors.dark.card : Colors.white,
          borderColor: theme.border,
        }
      ]}
      onPress={() => onFriendSelect?.(friend)}
    >
      <View style={styles.friendHeader}>
        <View style={styles.avatarContainer}>
          {friend.avatar_url ? (
            <Image source={{ uri: friend.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: Colors.primary }]}>
              <Text style={styles.avatarText}>
                {friend.full_name?.charAt(0) || '?'}
              </Text>
            </View>
          )}
          {friend.isOnline && <View style={styles.onlineIndicator} />}
        </View>
        
        <View style={styles.friendInfo}>
          <Text style={[styles.friendName, { color: theme.primaryText }]}>
            {friend.full_name || 'Unknown User'}
          </Text>
          <Text style={[styles.friendStatus, { color: theme.secondaryText }]}>
            {friend.isOnline 
              ? 'Online' 
              : `Last seen ${friend.lastSeen?.toLocaleDateString()}`
            }
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => removeFriend(friend.connectionId)}
          style={styles.removeButton}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.secondaryText} />
        </TouchableOpacity>
      </View>

      <View style={styles.friendStats}>
        <View style={styles.statItem}>
          <Ionicons name="leaf-outline" size={16} color={Colors.success} />
          <Text style={[styles.statText, { color: theme.primaryText }]}>
            {friend.eco_points || 0} points
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="analytics-outline" size={16} color={Colors.warning} />
          <Text style={[styles.statText, { color: theme.primaryText }]}>
            {friend.total_emissions || 0} kg CO₂
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const FriendRequestCard = ({ request }) => (
    <View
      style={[
        styles.requestCard,
        {
          backgroundColor: isDarkMode ? Colors.dark.card : Colors.white,
          borderColor: theme.border,
        }
      ]}
    >
      <View style={styles.requestHeader}>
        <View style={styles.avatarContainer}>
          {request.requester.avatar_url ? (
            <Image source={{ uri: request.requester.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: Colors.primary }]}>
              <Text style={styles.avatarText}>
                {request.requester.full_name?.charAt(0) || '?'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.requestInfo}>
          <Text style={[styles.friendName, { color: theme.primaryText }]}>
            {request.requester.full_name || 'Unknown User'}
          </Text>
          <Text style={[styles.requestTime, { color: theme.secondaryText }]}>
            {new Date(request.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: Colors.success }]}
          onPress={() => respondToFriendRequest(request.id, FRIEND_STATUS.ACCEPTED)}
        >
          <Ionicons name="checkmark" size={20} color={Colors.white} />
          <Text style={styles.actionButtonText}>Accept</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.declineButton, { backgroundColor: Colors.error }]}
          onPress={() => respondToFriendRequest(request.id, FRIEND_STATUS.DECLINED)}
        >
          <Ionicons name="close" size={20} color={Colors.white} />
          <Text style={styles.actionButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const SearchUserCard = ({ user }) => (
    <View
      style={[
        styles.searchCard,
        {
          backgroundColor: isDarkMode ? Colors.dark.card : Colors.white,
          borderColor: theme.border,
        }
      ]}
    >
      <View style={styles.searchHeader}>
        <View style={styles.avatarContainer}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: Colors.primary }]}>
              <Text style={styles.avatarText}>
                {user.full_name?.charAt(0) || '?'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.searchInfo}>
          <Text style={[styles.friendName, { color: theme.primaryText }]}>
            {user.full_name || 'Unknown User'}
          </Text>
          <Text style={[styles.searchStats, { color: theme.secondaryText }]}>
            {user.eco_points || 0} eco points
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.addButton,
            {
              backgroundColor: user.connectionStatus === FRIEND_STATUS.PENDING
                ? Colors.gray[400]
                : user.connectionStatus === FRIEND_STATUS.ACCEPTED
                ? Colors.success
                : Colors.primary,
            }
          ]}
          onPress={() => {
            if (!user.connectionStatus) {
              sendFriendRequest(user.id);
            }
          }}
          disabled={!!user.connectionStatus}
        >
          <Ionicons
            name={
              user.connectionStatus === FRIEND_STATUS.ACCEPTED
                ? "checkmark"
                : user.connectionStatus === FRIEND_STATUS.PENDING
                ? "time"
                : "person-add"
            }
            size={16}
            color={Colors.white}
          />
          <Text style={styles.addButtonText}>
            {user.connectionStatus === FRIEND_STATUS.ACCEPTED
              ? "Friends"
              : user.connectionStatus === FRIEND_STATUS.PENDING
              ? "Pending"
              : "Add"
            }
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const TabButton = ({ id, title, count }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        {
          backgroundColor: activeTab === id
            ? Colors.primary
            : 'transparent',
        }
      ]}
      onPress={() => setActiveTab(id)}
    >
      <Text
        style={[
          styles.tabButtonText,
          {
            color: activeTab === id ? Colors.white : theme.primaryText,
          }
        ]}
      >
        {title}
        {count > 0 && ` (${count})`}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.primaryText }]}>Friends</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={[styles.searchButton, { backgroundColor: Colors.primary }]}
        >
          <Ionicons name="search" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TabButton id="friends" title="Friends" count={friends.length} />
        <TabButton id="requests" title="Requests" count={friendRequests.length} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'friends' && (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <FriendCard friend={item} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={theme.secondaryText} />
                <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                  No friends yet
                </Text>
                <Text style={[styles.emptySubText, { color: theme.secondaryText }]}>
                  Search for friends to start building your network
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {activeTab === 'requests' && (
          <FlatList
            data={friendRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <FriendRequestCard request={item} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="mail-outline" size={64} color={theme.secondaryText} />
                <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                  No friend requests
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Search Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={theme.primaryText} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.primaryText }]}>
              Search Friends
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.1)'
                    : theme.divider,
                  color: theme.primaryText,
                  borderColor: theme.border,
                }
              ]}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchUsers(text);
              }}
              placeholder="Search by name..."
              placeholderTextColor={theme.secondaryText}
            />
          </View>

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <SearchUserCard user={item} />}
            ListEmptyComponent={
              searchQuery.trim() ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search" size={64} color={theme.secondaryText} />
                  <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                    No users found
                  </Text>
                </View>
              ) : null
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.searchResults}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    ...Typography.h5,
    fontWeight: FontWeight.semiBold,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  tabButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  tabButtonText: {
    ...Typography.bodySmall,
    fontWeight: FontWeight.medium,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  friendCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    ...Shadows.small,
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: FontWeight.semiBold,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    backgroundColor: Colors.success,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  friendInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  friendName: {
    ...Typography.body,
    fontWeight: FontWeight.medium,
  },
  friendStatus: {
    ...Typography.captionSmall,
    marginTop: 2,
  },
  removeButton: {
    padding: Spacing.sm,
  },
  friendStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    ...Typography.captionSmall,
    marginLeft: 4,
  },
  requestCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    ...Shadows.small,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  requestInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  requestTime: {
    ...Typography.captionSmall,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    flex: 1,
    marginRight: Spacing.sm,
    justifyContent: 'center',
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    flex: 1,
    marginLeft: Spacing.sm,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: Colors.white,
    fontWeight: FontWeight.medium,
    marginLeft: 4,
  },
  searchCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    ...Shadows.small,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  searchStats: {
    ...Typography.captionSmall,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: FontWeight.medium,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    ...Typography.h6,
    marginTop: Spacing.md,
  },
  emptySubText: {
    ...Typography.body,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.xl,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalCloseButton: {
    padding: Spacing.sm,
  },
  modalTitle: {
    ...Typography.h5,
    fontWeight: FontWeight.semiBold,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchInput: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    ...Typography.body,
  },
  searchResults: {
    paddingHorizontal: Spacing.lg,
  },
});