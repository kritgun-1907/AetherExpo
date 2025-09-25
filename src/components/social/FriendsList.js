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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useFriends } from '../../hooks/useFriends'; // Fixed import path
import { Colors } from '../../styles/colors';
import { Typography, FontWeight } from '../../styles/fonts';
import { Shadows, BorderRadius, Spacing } from '../../styles/globalStyles';

export default function FriendsList({ onFriendSelect }) {
  const { theme, isDarkMode } = useTheme();
  
  // Use the useFriends hook
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
    getFriendStats,
    FREE_FRIEND_LIMIT,
    FRIEND_STATUS
  } = useFriends();

  // Local state for UI
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('username'); // 'username' or 'email'
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);

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
        // Clear search results when changing search type
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
      {/* Header */}
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
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={[styles.searchButton, { backgroundColor: Colors.primary || '#10B981' }]}
        >
          <Ionicons name="search" size={20} color={Colors.white || '#FFFFFF'} />
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
                  Search for friends to start building your network
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

          {/* Search Type Toggle */}
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
    paddingHorizontal: Spacing?.md || 16,
    paddingVertical: Spacing?.md || 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...Typography?.h5 || { fontSize: 20, fontWeight: 'bold' },
    fontWeight: FontWeight?.semiBold || 'bold',
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
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius?.full || 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing?.md || 16,
    paddingVertical: Spacing?.sm || 8,
  },
  tabButton: {
    paddingHorizontal: Spacing?.md || 16,
    paddingVertical: Spacing?.sm || 8,
    borderRadius: BorderRadius?.full || 20,
    marginRight: Spacing?.sm || 8,
  },
  tabButtonText: {
    ...Typography?.bodySmall || { fontSize: 14 },
    fontWeight: FontWeight?.medium || '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing?.md || 16,
  },
  friendCard: {
    borderRadius: BorderRadius?.lg || 12,
    padding: Spacing?.md || 16,
    marginVertical: Spacing?.sm || 8,
    borderWidth: 1,
    ...Shadows?.small || {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing?.sm || 8,
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: FontWeight?.semiBold || 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    backgroundColor: '#10B981',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  friendInfo: {
    flex: 1,
    marginLeft: Spacing?.md || 16,
  },
  friendName: {
    ...Typography?.body || { fontSize: 16 },
    fontWeight: FontWeight?.medium || '500',
  },
  friendStatus: {
    ...Typography?.captionSmall || { fontSize: 12 },
    marginTop: 2,
  },
  removeButton: {
    padding: Spacing?.sm || 8,
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
    ...Typography?.captionSmall || { fontSize: 12 },
    marginLeft: 4,
  },
  requestCard: {
    borderRadius: BorderRadius?.lg || 12,
    padding: Spacing?.md || 16,
    marginVertical: Spacing?.sm || 8,
    borderWidth: 1,
    ...Shadows?.small || {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing?.md || 16,
  },
  requestInfo: {
    flex: 1,
    marginLeft: Spacing?.md || 16,
  },
  requestTime: {
    ...Typography?.captionSmall || { fontSize: 12 },
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing?.md || 16,
    paddingVertical: Spacing?.sm || 8,
    borderRadius: BorderRadius?.full || 20,
    flex: 1,
    marginRight: Spacing?.sm || 8,
    justifyContent: 'center',
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing?.md || 16,
    paddingVertical: Spacing?.sm || 8,
    borderRadius: BorderRadius?.full || 20,
    flex: 1,
    marginLeft: Spacing?.sm || 8,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: FontWeight?.medium || '500',
    marginLeft: 4,
  },
  searchCard: {
    borderRadius: BorderRadius?.lg || 12,
    padding: Spacing?.md || 16,
    marginVertical: Spacing?.sm || 8,
    borderWidth: 1,
    ...Shadows?.small || {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInfo: {
    flex: 1,
    marginLeft: Spacing?.md || 16,
  },
  searchStats: {
    ...Typography?.captionSmall || { fontSize: 12 },
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing?.sm || 8,
    paddingVertical: 6,
    borderRadius: BorderRadius?.full || 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: FontWeight?.medium || '500',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing?.xl * 2 || 64,
  },
  emptyText: {
    ...Typography?.h6 || { fontSize: 18, fontWeight: '600' },
    marginTop: Spacing?.md || 16,
  },
  emptySubText: {
    ...Typography?.body || { fontSize: 16 },
    textAlign: 'center',
    marginTop: Spacing?.sm || 8,
    marginHorizontal: Spacing?.xl || 32,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing?.lg || 24,
    paddingTop: 60,
    paddingBottom: Spacing?.md || 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalCloseButton: {
    padding: Spacing?.sm || 8,
  },
  modalTitle: {
    ...Typography?.h5 || { fontSize: 20, fontWeight: 'bold' },
    fontWeight: FontWeight?.semiBold || 'bold',
  },
  searchTypeContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing?.lg || 24,
    paddingVertical: Spacing?.sm || 8,
    gap: 8,
  },
  searchTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius?.md || 8,
    alignItems: 'center',
  },
  searchTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: Spacing?.lg || 24,
    paddingVertical: Spacing?.md || 16,
    position: 'relative',
  },
  searchInput: {
    paddingHorizontal: Spacing?.md || 16,
    paddingVertical: Spacing?.sm || 8,
    paddingRight: 40,
    borderRadius: BorderRadius?.md || 8,
    borderWidth: 1,
    ...Typography?.body || { fontSize: 16 },
  },
  searchLoader: {
    position: 'absolute',
    right: 36,
    top: 28,
  },
  searchResults: {
    paddingHorizontal: Spacing?.lg || 24,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  premiumModalEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  premiumModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  premiumCloseButton: {
    padding: 4,
  },
  premiumModalText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  premiumFeatures: {
    marginBottom: 24,
  },
  premiumFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumFeatureText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  premiumUpgradeButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumUpgradeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  premiumLaterButton: {
    padding: 12,
    alignItems: 'center',
  },
  premiumLaterButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});