// src/screens/main/GiftVoucherScreen.js - FIXED VERSION
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
      try {
        const userVouchers = await plaidService.getUserVouchers(user.id);
        setVouchers(userVouchers);
      } catch (error) {
        console.log('Error loading vouchers:', error);
        setVouchers([]); // Set empty array as fallback
      }

      // Calculate weekly reduction
      try {
        const reduction = await plaidService.calculateWeeklyReduction(user.id);
        setWeeklyReduction(reduction);
      } catch (error) {
        console.log('Error loading weekly reduction:', error);
        // Set default values
        setWeeklyReduction({
          currentWeek: 0,
          previousWeek: 0,
          reduction: 0,
          reductionPercentage: 0,
          qualifiesForReward: false,
        });
      }

      // Load eco points
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('eco_points')
          .eq('user_id', user.id)
          .single();
        
        setEcoPoints(profile?.eco_points || 0);
      } catch (error) {
        console.log('Error loading eco points:', error);
        setEcoPoints(0);
      }
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

  // FIXED: ReductionCard component
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
              Change vs Last Week
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={theme.primaryText} 
            colors={[theme.accentText]}
          />
        }
      >
        <Text style={[styles.header, { color: theme.primaryText }]}>Weekly Rewards</Text>
        <ReductionCard />

        {weeklyReduction?.qualifiesForReward && (
          <TouchableOpacity 
            style={[styles.claimButton, { backgroundColor: theme.accentText }]} 
            onPress={claimWeeklyReward}
          >
            <Text style={[styles.claimButtonText, { color: theme.buttonText }]}>
              Claim Your Reward!
            </Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.header, { color: theme.primaryText, marginTop: 20 }]}>
          My Vouchers
        </Text>
        
        {vouchers.length > 0 ? (
          vouchers.map((voucher, index) => (
            <VoucherCard key={voucher.id || index} voucher={voucher} />
          ))
        ) : (
          <View style={styles.centeredMessage}>
            <Text style={[styles.noVouchersText, { color: theme.secondaryText }]}>
              You have no active vouchers yet.
            </Text>
            <Text style={[styles.noVouchersSubtext, { color: theme.secondaryText }]}>
              Reduce your carbon emissions to earn rewards!
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
  contentContainer: {
    padding: 16,
    paddingTop: 60, // Account for status bar
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  
  // Voucher Card Styles
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

  // Reduction Card Styles
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
    textAlign: 'center',
  },

  // Button Styles
  claimButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Empty State
  centeredMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noVouchersText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  noVouchersSubtext: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});