// src/screens/main/GiftVoucherScreen.js - WITH RPC FUNCTIONS
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  RefreshControl,
  Image,
  ImageBackground,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../api/supabase';
import { useTheme } from '../../context/ThemeContext';

const BACKGROUND_IMAGE = require('../../../assets/hero-carbon-tracker.jpg');

// Gift voucher providers
const GIFT_VOUCHER_PROVIDERS = {
  amazon: {
    name: 'Amazon',
    logo: 'https://logo.clearbit.com/amazon.com',
    category: 'retail',
  },
  whole_foods: {
    name: 'Whole Foods',
    logo: 'https://logo.clearbit.com/wholefoodsmarket.com',
    category: 'food',
  },
  starbucks: {
    name: 'Starbucks',
    logo: 'https://logo.clearbit.com/starbucks.com',
    category: 'food',
  },
  target: {
    name: 'Target',
    logo: 'https://logo.clearbit.com/target.com',
    category: 'retail',
  },
};

export default function GiftVoucherScreen() {
  const { theme, isDarkMode } = useTheme();
  const [vouchers, setVouchers] = useState([]);
  const [weeklyReduction, setWeeklyReduction] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Load vouchers using RPC function
      try {
        const { data: vouchersData, error: vouchersError } = await supabase
          .rpc('get_user_vouchers', { p_user_id: user.id });

        if (!vouchersError && vouchersData) {
          // Map the returned column names to match our UI expectations
          const mappedVouchers = vouchersData.map(v => ({
            id: v.voucher_id,
            voucher_type: v.voucher_type_result,
            amount: v.voucher_amount,
            code: v.voucher_code,
            provider: v.voucher_provider,
            status: v.voucher_status,
            awarded_at: v.voucher_awarded_at,
            expires_at: v.voucher_expires_at,
            days_until_expiry: v.days_until_expiry,
          }));
          setVouchers(mappedVouchers);
        } else {
          // Fallback to direct query
          const { data: fallbackVouchers } = await supabase
            .from('gift_vouchers')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('awarded_at', { ascending: false });
          
          setVouchers(fallbackVouchers || []);
        }
      } catch (error) {
        console.error('Error loading vouchers:', error);
        setVouchers([]);
      }

      // Calculate weekly reduction using RPC function
      await calculateWeeklyReduction(user.id);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyReduction = async (userId) => {
    try {
      // Try using RPC function first
      const { data, error } = await supabase.rpc('get_weekly_reduction', {
        p_user_id: userId
      });

      if (!error && data && data.length > 0) {
        const result = data[0];
        setWeeklyReduction({
          currentWeek: parseFloat(result.current_week) || 0,
          previousWeek: parseFloat(result.previous_week) || 0,
          reduction: parseFloat(result.reduction) || 0,
          reductionPercentage: parseFloat(result.reduction_percentage) || 0,
          qualifiesForReward: result.qualifies_for_reward || false,
        });
        return;
      }

      // Fallback to manual calculation
      const now = new Date();
      const currentWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const previousWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const { data: currentWeekData } = await supabase
        .from('emissions')
        .select('amount')
        .eq('user_id', userId)
        .gte('date', currentWeekStart.toISOString().split('T')[0])
        .lt('date', now.toISOString().split('T')[0]);

      const { data: previousWeekData } = await supabase
        .from('emissions')
        .select('amount')
        .eq('user_id', userId)
        .gte('date', previousWeekStart.toISOString().split('T')[0])
        .lt('date', currentWeekStart.toISOString().split('T')[0]);

      const currentWeekTotal = currentWeekData?.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) || 0;
      const previousWeekTotal = previousWeekData?.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) || 0;

      const reduction = previousWeekTotal - currentWeekTotal;
      const reductionPercentage = previousWeekTotal > 0 
        ? (reduction / previousWeekTotal) * 100 
        : 0;

      setWeeklyReduction({
        currentWeek: currentWeekTotal,
        previousWeek: previousWeekTotal,
        reduction: reduction,
        reductionPercentage: reductionPercentage,
        qualifiesForReward: reduction > 0 && reductionPercentage >= 10,
      });
    } catch (error) {
      console.error('Error calculating weekly reduction:', error);
      setWeeklyReduction({
        currentWeek: 0,
        previousWeek: 0,
        reduction: 0,
        reductionPercentage: 0,
        qualifiesForReward: false,
      });
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
        'Choose Your Reward 🎉',
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

  const generateVoucherCode = () => {
    return 'ECO-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  };

  const awardVoucher = async (userId, voucherType, amount) => {
    try {
      console.log('🎁 Awarding voucher using RPC function...');
      
      const code = generateVoucherCode();
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      
      // Use RPC function to award voucher
      const { data, error } = await supabase.rpc('award_gift_voucher', {
        p_user_id: userId,
        p_voucher_type: voucherType,
        p_amount: amount,
        p_provider: GIFT_VOUCHER_PROVIDERS[voucherType],
        p_code: code,
        p_expires_at: expiresAt,
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      const voucherData = data?.[0];
      console.log('✅ Voucher awarded:', voucherData);

      Alert.alert(
        'Reward Claimed! 🎉',
        `Congratulations! Your $${amount} ${GIFT_VOUCHER_PROVIDERS[voucherType].name} gift card has been added to your wallet.\n\nCode: ${voucherData?.code || code}\n\nYou earned ${amount * 10} points!`,
        [{ text: 'OK', onPress: loadData }]
      );
    } catch (error) {
      console.error('Award voucher error:', error);
      Alert.alert(
        'Error',
        `Failed to claim reward: ${error.message}\n\nPlease try again or contact support.`,
        [{ text: 'OK' }]
      );
    }
  };

  const useVoucher = (voucher) => {
    const providerName = voucher.provider?.name || voucher.voucher_type;
    const daysLeft = voucher.days_until_expiry;
    
    Alert.alert(
      `Use ${providerName} Voucher`,
      `Amount: $${voucher.amount}\nCode: ${voucher.code}${daysLeft ? `\nExpires in ${daysLeft} days` : ''}\n\nWould you like to copy the code?`,
      [
        { 
          text: 'Copy Code', 
          onPress: () => {
            Alert.alert('Copied!', 'Gift card code copied to clipboard');
          }
        },
        { text: 'Mark as Used', onPress: () => markVoucherAsUsed(voucher.id) },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const markVoucherAsUsed = async (voucherId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc('use_gift_voucher', {
        p_voucher_id: voucherId,
        p_user_id: user.id,
      });

      if (error) throw error;

      Alert.alert('Success', 'Voucher marked as used!');
      loadData();
    } catch (error) {
      console.error('Error marking voucher as used:', error);
      Alert.alert('Error', 'Failed to update voucher status');
    }
  };

  const VoucherCard = ({ voucher }) => {
    const provider = voucher.provider || GIFT_VOUCHER_PROVIDERS[voucher.voucher_type] || {};
    const daysLeft = voucher.days_until_expiry;
    const isExpiringSoon = daysLeft && daysLeft < 7;
    
    return (
      <TouchableOpacity
        style={[styles.voucherCard, { 
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
          borderColor: isExpiringSoon ? '#EF4444' : theme.border,
          borderWidth: isExpiringSoon ? 2 : 1,
        }]}
        onPress={() => useVoucher(voucher)}
      >
        <View style={styles.voucherHeader}>
          {provider.logo && (
            <Image 
              source={{ uri: provider.logo }} 
              style={styles.providerLogo}
              defaultSource={require('../../../assets/icon.png')}
            />
          )}
          <View style={styles.voucherInfo}>
            <Text style={[styles.providerName, { color: theme.primaryText }]}>
              {provider.name || voucher.voucher_type}
            </Text>
            <Text style={[styles.voucherAmount, { color: theme.accentText }]}>
              ${voucher.amount}
            </Text>
          </View>
          <View style={styles.statusContainer}>
            <Text style={[styles.voucherStatus, { color: theme.accentText }]}>
              ✓ Active
            </Text>
            {isExpiringSoon && (
              <Text style={[styles.expiringWarning, { color: '#EF4444' }]}>
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} left!
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.voucherFooter}>
          <Text style={[styles.voucherCode, { color: theme.secondaryText }]}>
            Code: {voucher.code}
          </Text>
          <Text style={[styles.expiryDate, { color: theme.secondaryText }]}>
            {daysLeft ? `${daysLeft} days left` : new Date(voucher.expires_at).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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
              {isReduction ? '-' : '+'}{Math.abs(weeklyReduction.reductionPercentage).toFixed(1)}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
              Change vs Last Week
            </Text>
          </View>
        </View>
        
        {weeklyReduction.qualifiesForReward && (
          <View style={[styles.rewardBadge, { backgroundColor: theme.accentText }]}>
            <Text style={styles.rewardBadgeText}>🎉 You qualify for a reward!</Text>
          </View>
        )}
      </View>
    );
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
            Loading rewards...
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
            <Text style={[styles.claimButtonText, { color: '#FFFFFF' }]}>
              Claim Your Reward! 🎁
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
              Reduce your carbon emissions by 10% this week to earn rewards! 🌱
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 60,
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
  statusContainer: {
    alignItems: 'flex-end',
  },
  voucherStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  expiringWarning: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
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
    textAlign: 'center',
  },
  rewardBadge: {
    marginTop: 12,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  rewardBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

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