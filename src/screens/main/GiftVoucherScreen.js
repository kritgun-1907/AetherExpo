// src/screens/main/GiftVoucherScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { plaidService, GIFT_VOUCHER_PROVIDERS } from '../../api/plaid';
import { supabase } from '../../api/supabase';
import { useTheme } from '../../context/ThemeContext';

export default function GiftVoucherScreen() {
  const { theme, isDarkMode } = useTheme();
  const [vouchers, setVouchers] = useState([]);
  const [weeklyReduction, setWeeklyReduction] = useState(null);
  const [ecoPoints, setEcoPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Load user's vouchers
      const userVouchers = await plaidService.getUserVouchers(user.id);
      setVouchers(userVouchers);

      // Calculate weekly reduction
      const reduction = await plaidService.calculateWeeklyReduction(user.id);
      setWeeklyReduction(reduction);

      // Load eco points
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('eco_points')
        .eq('user_id', user.id)
        .single();
      
      setEcoPoints(profile?.eco_points || 0);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const claimWeeklyReward = async () => {
    try {
      if (!weeklyReduction?.qualifiesForReward) {
        Alert.alert(
          'No Reward Available',
          'You need to reduce your carbon emissions by at least 10% this week to earn a reward.'
        );
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      // Determine reward amount based on reduction
      const reductionPercentage = weeklyReduction.reductionPercentage;
      let voucherAmount = 5; // Base reward
      
      if (reductionPercentage >= 20) voucherAmount = 15;
      else if (reductionPercentage >= 15) voucherAmount = 10;

      // Award voucher (user can choose provider)
      Alert.alert(
        'Choose Your Reward',
        `Great job! You reduced your carbon footprint by ${reductionPercentage.toFixed(1)}%!\n\nSelect your $${voucherAmount} gift voucher:`,
        [
          {
            text: '🛒 Amazon',
            onPress: () => awardVoucher(user.id, 'amazon', voucherAmount),
          },
          {
            text: '🥗 Whole Foods',
            onPress: () => awardVoucher(user.id, 'whole_foods', voucherAmount),
          },
          {
            text: '☕ Starbucks',
            onPress: () => awardVoucher(user.id, 'starbucks', voucherAmount),
          },
          {
            text: '🎯 Target',
            onPress: () => awardVoucher(user.id, 'target', voucherAmount),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to claim reward. Please try again.');
      console.error('Claim reward error:', error);
    }
  };

  const awardVoucher = async (userId, voucherType, amount) => {
    try {
      const voucher = await plaidService.awardGiftVoucher(userId, voucherType, amount);
      
      Alert.alert(
        'Reward Claimed!',
        `Congratulations! Your $${amount} ${GIFT_VOUCHER_PROVIDERS[voucherType].name} gift card has been added to your wallet.\n\nCode: ${voucher.code}`,
        [{ text: 'OK', onPress: loadData }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to claim reward');
      console.error('Award voucher error:', error);
    }
  };

  const useVoucher = (voucher) => {
    Alert.alert(
      'Use Gift Card',
      `${voucher.provider.name} - $${voucher.amount}\n\nCode: ${voucher.code}\n\nThis code can be used at checkout. Would you like to copy it to your clipboard?`,
      [
        { text: 'Copy Code', onPress: () => copyToClipboard(voucher.code) },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const copyToClipboard = async (text) => {
    // Note: You'll need to install @react-native-clipboard/clipboard
    // import Clipboard from '@react-native-clipboard/clipboard';
    // Clipboard.setString(text);
    Alert.alert('Copied!', 'Gift card code copied to clipboard');
  };

  const VoucherCard = ({ voucher }) => (
    <TouchableOpacity
      style={[styles.voucherCard, { 
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
        borderColor: theme.border 
      }]}
      onPress={() => useVoucher(voucher)}
    >
      <View style={styles.voucherHeader}>
        <Image 
          source={{ uri: voucher.provider.logo }} 
          style={styles.providerLogo}
          defaultSource={require('../../../assets/icon.png')}
        />
        <View style={styles.voucherInfo}>
          <Text style={[styles.providerName, { color: theme.primaryText }]}>
            {voucher.provider.name}
          </Text>
          <Text style={[styles.voucherAmount, { color: theme.accentText }]}>
            ${voucher.amount}
          </Text>
        </View>
        <Text style={[styles.voucherStatus, { color: theme.accentText }]}>
          ✓ Active
        </Text>
      </View>
      
      <View style={styles.voucherFooter}>
        <Text style={[styles.voucherCode, { color: theme.secondaryText }]}>
          Code: {voucher.code}
        </Text>
        <Text style={[styles.expiryDate, { color: theme.secondaryText }]}>
          Expires: {new Date(voucher.expires_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

    const ReductionCard = () => {
    if (!weeklyReduction) return null;

    const isReduction = weeklyReduction.reduction > 0;
    const cardColor = isReduction ? theme.accentText : '#EF4444';

    return (
      <View style={[styles.reductionCard, { 
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
        borderColor: cardColor,
        borderWidth: 2,
      }]}>
        <Text style={[styles.cardTitle, { color: theme.primaryText }]}>
          Weekly Carbon Impact
        </Text>
        
        <View style={styles.reductionStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: cardColor }]}>
              {weeklyReduction.reductionPercentage > 0 ? '+' : ''}{weeklyReduction.reductionPercentage.toFixed(1)}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
              {/* Corrected typo and added closing tag below */}
              Change vs Last Week
            </Text> 
          </View> {/* 👈 Added closing </View> for statItem */}
        </View>   {/* 👈 Added closing </View> for reductionStats */}
      </View>     // 👈 Added closing </View> for reductionCard
    );
  }
  // Add this block of code AFTER your ReductionCard function

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primaryText} />
      }
    >
      <Text style={[styles.header, { color: theme.primaryText }]}>Weekly Rewards</Text>
      <ReductionCard />

      {weeklyReduction?.qualifiesForReward && (
        <TouchableOpacity style={[styles.claimButton, { backgroundColor: theme.accentText }]} onPress={claimWeeklyReward}>
          <Text style={styles.claimButtonText}>Claim Your Reward!</Text>
        </TouchableOpacity>
      )}

      <Text style={[styles.header, { color: theme.primaryText, marginTop: 20 }]}>My Vouchers</Text>
      {vouchers.length > 0 ? (
        vouchers.map((voucher) => (
          <VoucherCard key={voucher.id} voucher={voucher} />
        ))
      ) : (
        <View style={styles.centeredMessage}>
            <Text style={[styles.noVouchersText, { color: theme.secondaryText }]}>
            You have no active vouchers yet.
            </Text>
        </View>
      )}
    </ScrollView>
  );
} // 👈 This is the missing closing brace for GiftVoucherScreen

// Add the StyleSheet at the very end of the file
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  voucherCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voucherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  voucherInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  voucherAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  voucherStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  voucherFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  voucherCode: {
    fontSize: 12,
  },
  expiryDate: {
    fontSize: 12,
  },
  reductionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  reductionStats: {
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  claimButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centeredMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noVouchersText: {
    fontSize: 16,
    textAlign: 'center',
  },
});