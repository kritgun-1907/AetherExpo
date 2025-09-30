// src/components/social/FriendsList.js - COMPLETE FIXED VERSION
import React, { useState } from 'react';
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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useFriends } from '../../hooks/useFriends';
import { Colors } from '../../styles/colors';
import { Typography, FontWeight } from '../../styles/fonts';
import { Shadows, BorderRadius, Spacing } from '../../styles/globalStyles';

export default function FriendsList({ onFriendSelect }) {
  const { theme, isDarkMode } = useTheme();
  
  const {
    friends,
    friendRequests,
    searchResults,
    loading,
    isPremium,
    friendCount,
    searchUsers,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    refreshData,
    FREE_FRIEND_LIMIT,
    FRIEND_STATUS
  } = useFriends();

  // Local state for UI
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('username');
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  
  // Add Friend by Email Modal State
  const [addFriendModalVisible, setAddFriendModalVisible] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  const handleSearchUsers = async (query) => {
    setSearchQuery(query);
    await searchUsers(query, searchType);
  };

  const handleSendFriendRequest = async (userId) => {
    const result = await sendFriendRequest(userId);
    if (result.success) {
      Alert.alert('Success', result.message);
    } else if (result.error === 'Friend limit reached') {
      setPremiumModalVisible(true);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  // Handle Add Friend by Email
  const handleAddFriendByEmail = async () => {
    if (!friendEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(friendEmail.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setSendingRequest(true);

    try {
      // Search for user by email
      const results = await searchUsers(friendEmail.trim(), 'email');
      
      if (!results || results.length === 0) {
        Alert.alert(
          'User Not Found',
          'No user found with this email address. Make sure they have an account on Aether.',
          [{ text: 'OK' }]
        );
        setSendingRequest(false);
        return;
      }

      // If user found, send friend request
      const targetUser = results[0];
      
      // Check if already friends or request pending
      if (targetUser.connectionStatus === FRIEND_STATUS.ACCEPTED) {
        Alert.alert('Already Friends', 'You are already friends with this user!');
        setSendingRequest(false);
        setFriendEmail('');
        setAddFriendModalVisible(false);
        return;
      }
      
      if (targetUser.connectionStatus === FRIEND_STATUS.PENDING) {
        Alert.alert('Request Pending', 'You have already sent a friend request to this user.');
        setSendingRequest(false);
        setFriendEmail('');
        setAddFriendModalVisible(false);
        return;
      }

      const result = await sendFriendRequest(targetUser.id);
      
      if (result.success) {
        Alert.alert(
          'Friend Request Sent!',
          `Your friend request has been sent to ${targetUser.full_name || targetUser.email}.`,
          [{ 
            text: 'OK', 
            onPress: () => {
              setFriendEmail('');
              setAddFriendModalVisible(false);
            }
          }]
        );
      } else if (result.error === 'Friend limit reached') {
        setAddFriendModalVisible(false);
        setPremiumModalVisible(true);
      } else {
        Alert.alert('Error', result.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error adding friend by email:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleRespondToRequest = async (connectionId, response) => {
    const result = await respondToFriendRequest(connectionId, response);
    if (result.success) {
      Alert.alert('Success', result.message);
    } else if (result.error === 'Friend limit reached') {
      setPremiumModalVisible(true);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleRemoveFriend = async (connectionId) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await removeFriend(connectionId);
            if (result.success) {
              Alert.alert('Success', result.message);
            } else {
              Alert.alert('Error', result.error);
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handlePremiumUpgrade = () => {
    setPremiumModalVisible(false);
    Alert.alert(
      'Premium Required',
      'Upgrade to Premium to add unlimited friends and unlock exclusive features!',
      [
        { text: 'Maybe Later', style: 'cancel' },
        { text: 'Upgrade Now', onPress: () => {
          Alert.alert('Coming Soon', 'Premium upgrade functionality will be available soon!');
        }}
      ]
    );
  };

  const FriendCard = ({ friend }) => (
    <TouchableOpacity
      style={[
        styles.friendCard,
        {
          backgroundColor: isDarkMode ? Colors.dark?.card || 'rgba(255,255,255,0.1)' : Colors.white || '#FFFFFF',
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
            <View style={[styles.avatarPlaceholder, { backgroundColor: Colors.primary || '#10B981' }]}>
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
          onPress={() => handleRemoveFriend(friend.connectionId)}
          style={styles.removeButton}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.secondaryText} />
        </TouchableOpacity>
      </View>

      <View style={styles.friendStats}>
        <View style={styles.statItem}>
          <Ionicons name="leaf-outline" size={16} color={Colors.success || '#10B981'} />
          <Text style={[styles.statText, { color: theme.primaryText }]}>
            {friend.eco_points || 0} points
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="analytics-outline" size={16} color={Colors.warning || '#F59E0B'} />
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
          backgroundColor: isDarkMode ? Colors.dark?.card || 'rgba(255,255,255,0.1)' : Colors.white || '#FFFFFF',
          borderColor: theme.border,
        }
      ]}
    >
      <View style={styles.requestHeader}>
        <View style={styles.avatarContainer}>
          {request.requester.avatar_url ? (
            <Image source={{ uri: request.requester.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: Colors.primary || '#10B981' }]}>
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
          style={[styles.acceptButton, { backgroundColor: Colors.success || '#10B981' }]}
          onPress={() => handleRespondToRequest(request.id, FRIEND_STATUS.ACCEPTED)}
        >
          <Ionicons name="checkmark" size={20} color={Colors.white || '#FFFFFF'} />
          <Text style={styles.actionButtonText}>Accept</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.declineButton, { backgroundColor: Colors.error || '#EF4444' }]}
          onPress={() => handleRespondToRequest(request.id, FRIEND_STATUS.DECLINED)}
        >
          <Ionicons name="close" size={20} color={Colors.white || '#FFFFFF'} />
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
          backgroundColor: isDarkMode ? Colors.dark?.card || 'rgba(255,255,255,0.1)' : Colors.white || '#FFFFFF',
          borderColor: theme.border,
        }
      ]}
    >
      <View style={styles.searchHeader}>
        <View style={styles.avatarContainer}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: Colors.primary || '#10B981' }]}>
              <Text style={styles.avatarText}>
                {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.searchInfo}>
          <Text style={[styles.friendName, { color: theme.primaryText }]}>
            {user.full_name || 'Unknown User'}
          </Text>
          <Text style={[styles.searchStats, { color: theme.secondaryText }]}>
            {searchType === 'email' ? user.email : `${user.eco_points || 0} eco points`}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.addButton,
            {
              backgroundColor: user.connectionStatus === FRIEND_STATUS.PENDING
                ? Colors.gray?.[400] || '#9CA3AF'
                : user.connectionStatus === FRIEND_STATUS.ACCEPTED
                ? Colors.success || '#10B981'
                : Colors.primary || '#10B981',
            }
          ]}
          onPress={() => {
            if (!user.connectionStatus) {
              handleSendFriendRequest(user.id);
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
            color={Colors.white || '#FFFFFF'}
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
            ? Colors.primary || '#10B981'
            : 'transparent',
        }
      ]}
      onPress={() => setActiveTab(id)}
    >
      <Text
        style={[
          styles.tabButtonText,
          {
            color: activeTab === id ? Colors.white || '#FFFFFF' : theme.primaryText,
          }
        ]}
      >
        {title}
        {count > 0 && ` (${count})`}
      </Text>
    </TouchableOpacity>
  );

  const SearchTypeButton = ({ type, label }) => (
    <TouchableOpacity
      style={[
        styles.searchTypeButton,
        {
          backgroundColor: searchType === type
            ? Colors.primary || '#10B981'
            : isDarkMode 
            ? 'rgba(255, 255, 255, 0.1)'
            : Colors.gray?.[200] || '#E5E7EB',
        }
      ]}
      onPress={() => {
        setSearchType(type);
        setSearchQuery('');
        searchUsers('', type);
      }}
    >
      <Text
        style={[
          styles.searchTypeText,
          {
            color: searchType === type 
              ? Colors.white || '#FFFFFF' 
              : theme.primaryText,
          }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with Add Friend Button */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.primaryText }]}>Friends</Text>
          <View style={styles.friendLimitBadge}>
            <Text style={[styles.friendLimitText, { color: theme.secondaryText }]}>
              {friendCount}/{isPremium ? '∞' : FREE_FRIEND_LIMIT}
            </Text>
            {!isPremium && friendCount >= FREE_FRIEND_LIMIT && (
              <Ionicons name="lock-closed" size={14} color={Colors.warning || '#F59E0B'} style={{ marginLeft: 4 }} />
            )}
          </View>
        </View>
        
        <View style={styles.headerButtons}>
          {/* Add Friend by Email Button - THIS IS THE KEY BUTTON */}
          <TouchableOpacity
            onPress={() => setAddFriendModalVisible(true)}
            style={[styles.addFriendButton, { backgroundColor: Colors.primary || '#10B981' }]}
          >
            <Ionicons name="person-add" size={20} color={Colors.white || '#FFFFFF'} />
          </TouchableOpacity>
          
          {/* Search Button */}
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={[styles.searchButton, { backgroundColor: Colors.primary || '#10B981' }]}
          >
            <Ionicons name="search" size={20} color={Colors.white || '#FFFFFF'} />
          </TouchableOpacity>
        </View>
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
                colors={[Colors.primary || '#10B981']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={theme.secondaryText} />
                <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                  No friends yet
                </Text>
                <Text style={[styles.emptySubText, { color: theme.secondaryText }]}>
                  Tap the + button to add friends by email
                </Text>
                {!isPremium && (
                  <Text style={[styles.emptySubText, { color: Colors.warning || '#F59E0B', marginTop: 10 }]}>
                    Free users can add up to {FREE_FRIEND_LIMIT} friends
                  </Text>
                )}
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
                colors={[Colors.primary || '#10B981']}
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

      {/* Add Friend by Email Modal - THIS IS THE KEY MODAL */}
      <Modal
        visible={addFriendModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setAddFriendModalVisible(false);
          setFriendEmail('');
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.addFriendModalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setAddFriendModalVisible(false);
              setFriendEmail('');
            }}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.addFriendModalContent, {
                backgroundColor: theme.cardBackground || theme.background,
                borderColor: isDarkMode ? theme.border : 'transparent',
              }]}>
                <View style={styles.addFriendModalHeader}>
                  <Text style={[styles.addFriendModalTitle, { color: theme.primaryText }]}>
                    Add Friend
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setAddFriendModalVisible(false);
                      setFriendEmail('');
                    }}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color={theme.secondaryText} />
                  </TouchableOpacity>
                </View>

                <View style={styles.addFriendInputContainer}>
                  <Ionicons name="mail-outline" size={20} color={theme.secondaryText} style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.addFriendInput, {
                      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.divider,
                      color: theme.primaryText,
                      flex: 1,
                    }]}
                    placeholder="Enter friend's email address"
                    placeholderTextColor={theme.secondaryText}
                    value={friendEmail}
                    onChangeText={setFriendEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!sendingRequest}
                  />
                </View>

                <Text style={[styles.addFriendHint, { color: theme.secondaryText }]}>
                  Enter the email address of the person you want to add as a friend. They must have an Aether account.
                </Text>

                <TouchableOpacity
                  style={[
                    styles.sendRequestButton,
                    { 
                      backgroundColor: Colors.primary || '#10B981',
                      opacity: sendingRequest || !friendEmail.trim() ? 0.6 : 1,
                    }
                  ]}
                  onPress={handleAddFriendByEmail}
                  disabled={sendingRequest || !friendEmail.trim()}
                >
                  {sendingRequest ? (
                    <ActivityIndicator color={Colors.white || '#FFFFFF'} size="small" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={20} color={Colors.white || '#FFFFFF'} />
                      <Text style={[styles.sendRequestButtonText, { color: Colors.white || '#FFFFFF' }]}>
                        Send Friend Request
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

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

          <View style={styles.searchTypeContainer}>
            <SearchTypeButton type="username" label="Username" />
            <SearchTypeButton type="email" label="Email" />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.1)'
                    : theme.divider || '#F3F4F6',
                  color: theme.primaryText,
                  borderColor: theme.border,
                }
              ]}
              value={searchQuery}
              onChangeText={handleSearchUsers}
              placeholder={`Search by ${searchType}...`}
              placeholderTextColor={theme.secondaryText}
              keyboardType={searchType === 'email' ? 'email-address' : 'default'}
              autoCapitalize={searchType === 'email' ? 'none' : 'words'}
            />
            {loading && (
              <ActivityIndicator 
                style={styles.searchLoader}
                color={Colors.primary || '#10B981'}
                size="small"
              />
            )}
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
                  <Text style={[styles.emptySubText, { color: theme.secondaryText }]}>
                    Try searching with a different {searchType}
                  </Text>
                </View>
              ) : null
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.searchResults}
          />
        </View>
      </Modal>

      {/* Premium Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={premiumModalVisible}
        onRequestClose={() => setPremiumModalVisible(false)}
      >
        <View style={styles.premiumModalOverlay}>
          <View style={[styles.premiumModalContent, {
            backgroundColor: theme.cardBackground || theme.background,
            borderColor: isDarkMode ? theme.border : 'transparent',
          }]}>
            <View style={styles.premiumModalHeader}>
              <Text style={styles.premiumModalEmoji}>👑</Text>
              <Text style={[styles.premiumModalTitle, { color: theme.primaryText }]}>
                Friend Limit Reached
              </Text>
              <TouchableOpacity 
                onPress={() => setPremiumModalVisible(false)} 
                style={styles.premiumCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.premiumModalText, { color: theme.secondaryText }]}>
              Free users can add up to {FREE_FRIEND_LIMIT} friends. Upgrade to Premium to add unlimited friends and unlock exclusive features!
            </Text>

            <View style={styles.premiumFeatures}>
              <View style={styles.premiumFeature}>
                <Ionicons name="people" size={20} color={Colors.success || '#10B981'} />
                <Text style={[styles.premiumFeatureText, { color: theme.primaryText }]}>
                  Unlimited friends
                </Text>
              </View>
              <View style={styles.premiumFeature}>
                <Ionicons name="analytics" size={20} color={Colors.success || '#10B981'} />
                <Text style={[styles.premiumFeatureText, { color: theme.primaryText }]}>
                  Advanced analytics
                </Text>
              </View>
              <View style={styles.premiumFeature}>
                <Ionicons name="gift" size={20} color={Colors.success || '#10B981'} />
                <Text style={[styles.premiumFeatureText, { color: theme.primaryText }]}>
                  Premium rewards
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.premiumUpgradeButton, { backgroundColor: Colors.primary || '#10B981' }]}
              onPress={handlePremiumUpgrade}
            >
              <Text style={[styles.premiumUpgradeButtonText, { color: Colors.white || '#FFFFFF' }]}>
                Upgrade to Premium
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.premiumLaterButton}
              onPress={() => setPremiumModalVisible(false)}
            >
              <Text style={[styles.premiumLaterButtonText, { color: theme.secondaryText }]}>
                Maybe Later
              </Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  friendLimitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  friendLimitText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addFriendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  friendCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  friendStatus: {
    fontSize: 14,
  },
  removeButton: {
    padding: 8,
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
    fontSize: 14,
    marginLeft: 6,
  },
  requestCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
    marginLeft: 12,
  },
  requestTime: {
    fontSize: 12,
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  acceptButton: {
    flexDirection: 'row',
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  declineButton: {
    flexDirection: 'row',
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  searchCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchStats: {
    fontSize: 12,
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Add Friend Modal Styles - THESE ARE CRITICAL
  addFriendModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  addFriendModalContent: {
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
  },
  addFriendModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addFriendModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  addFriendInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addFriendInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  addFriendHint: {
    fontSize: 12,
    marginBottom: 20,
    lineHeight: 18,
  },
  sendRequestButton: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendRequestButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Search Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchTypeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  searchTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  searchLoader: {
    position: 'absolute',
    right: 30,
    top: 12,
  },
  searchResults: {
    paddingBottom: 20,
  },
  
  // Premium Modal Styles
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumModalContent: {
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
  },
  premiumModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  premiumModalEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  premiumModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  premiumCloseButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 5,
  },
  premiumModalText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  premiumFeatures: {
    marginBottom: 20,
  },
  premiumFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  premiumFeatureText: {
    fontSize: 14,
    marginLeft: 12,
  },
  premiumUpgradeButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumUpgradeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  premiumLaterButton: {
    padding: 12,
    alignItems: 'center',
  },
  premiumLaterButtonText: {
    fontSize: 14,
  },
});