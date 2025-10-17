// src/screens/main/CarbonOffsetScreen.js - FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { plaidService, OFFSET_PROVIDERS } from '../../api/plaid';
import { supabase } from '../../api/supabase';
import { useTheme } from '../../context/ThemeContext';
import PlaidLinkButton from '../../components/PlaidLinkButton';

export default function CarbonOffsetScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const [userEmissions, setUserEmissions] = useState(0);
  const [offsetAmount, setOffsetAmount] = useState('1');
  const [selectedProvider, setSelectedProvider] = useState('goldstandard');
  const [userOffsets, setUserOffsets] = useState([]);
  const [totalOffset, setTotalOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasBankConnection, setHasBankConnection] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const checkBankConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: connection, error } = await supabase
        .from('user_bank_connections')
        .select('access_token')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.log('Error checking bank connection:', error);
        return false;
      }

      return !!connection;
    } catch (error) {
      console.error('Error checking bank connection:', error);
      return false;
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if bank is connected
      const bankConnected = await checkBankConnection();
      setHasBankConnection(bankConnected);

      // Only try to load transactions if bank is connected
      if (bankConnected) {
        try {
          const carbonData = await plaidService.getTransactionsAndCalculateCarbon(user.id, 30);
          setUserEmissions(carbonData.totalCarbon || 0);
        } catch (error) {
          console.log('Error loading emissions:', error.message);
          setUserEmissions(0);
        }
      } else {
        setUserEmissions(0);
      }

      // Get user's existing offsets
      try {
        const { data: offsets } = await supabase
          .from('carbon_offsets')
          .select('*')
          .eq('user_id', user.id)
          .order('purchased_at', { ascending: false });

        setUserOffsets(offsets || []);
        
        const total = offsets?.reduce((sum, offset) => sum + parseFloat(offset.tons_co2), 0) || 0;
        setTotalOffset(total);
      } catch (error) {
        console.log('Error loading offsets:', error);
        setUserOffsets([]);
        setTotalOffset(0);
      }
    } catch (error) {
      console.error('Error loading offset data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBankConnected = async () => {
    // Reload data after bank connection
    await loadData();
    Alert.alert('Success', 'Bank connected! Your carbon emissions will now be tracked automatically.');
  };

  const purchaseOffset = async () => {
    try {
      const tons = parseFloat(offsetAmount);
      if (isNaN(tons) || tons <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid amount of CO₂ to offset');
        return;
      }

      const provider = OFFSET_PROVIDERS[selectedProvider];
      if (!provider) {
        Alert.alert('Error', 'Please select a valid provider');
        return;
      }

      const totalPrice = tons * provider.pricePerTon;

      Alert.alert(
        'Confirm Purchase',
        `Purchase ${tons} tons of CO₂ offsets from ${provider.name}?\n\nTotal: $${totalPrice.toFixed(2)}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Purchase',
            onPress: async () => {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                  Alert.alert('Error', 'Please log in to purchase offsets');
                  return;
                }

                await plaidService.purchaseOffsets(user.id, selectedProvider, tons, totalPrice);
                
                Alert.alert(
                  'Purchase Successful!',
                  `You've successfully offset ${tons} tons of CO₂!\n\nYour certificate ID will be emailed to you.`
                );
                
                loadData();
                setOffsetAmount('1');
              } catch (error) {
                Alert.alert('Purchase Failed', 'Failed to purchase offsets. Please try again.');
                console.error('Purchase error:', error);
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Purchase Failed', 'Failed to purchase offsets. Please try again.');
      console.error('Purchase error:', error);
    }
  };

  const ProviderCard = ({ providerId, provider, isSelected, onSelect }) => (
    <TouchableOpacity
      style={[
        styles.providerCard,
        {
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
          borderColor: isSelected ? theme.accentText : theme.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={() => onSelect(providerId)}
    >
      <View style={styles.providerHeader}>
        <Text style={[styles.providerName, { color: theme.primaryText }]}>
          {provider.name}
        </Text>
        <View style={styles.ratingContainer}>
          {[...Array(provider.rating)].map((_, i) => (
            <Ionicons key={i} name="star" size={14} color="#F59E0B" />
          ))}
        </View>
      </View>
      
      <Text style={[styles.providerPrice, { color: theme.accentText }]}>
        ${provider.pricePerTon}/ton CO₂
      </Text>
      
      <Text style={[styles.providerProjects, { color: theme.secondaryText }]}>
        Projects: {provider.projects.join(', ')}
      </Text>
    </TouchableOpacity>
  );

  // Show bank connection prompt if not connected
  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accentText} />
      </View>
    );
  }

  if (!hasBankConnection) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emptyStateContainer}>
            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' }]}>
              <Ionicons name="leaf-outline" size={60} color={theme.accentText} />
            </View>
            
            <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>
              Connect Your Bank
            </Text>
            
            <Text style={[styles.emptyDescription, { color: theme.secondaryText }]}>
              Link your bank account to automatically track carbon emissions from your transactions. 
              This helps us calculate accurate carbon offsets for your lifestyle.
            </Text>

            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color={theme.accentText} />
                <Text style={[styles.benefitText, { color: theme.secondaryText }]}>
                  Automatic carbon tracking
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color={theme.accentText} />
                <Text style={[styles.benefitText, { color: theme.secondaryText }]}>
                  Personalized offset recommendations
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color={theme.accentText} />
                <Text style={[styles.benefitText, { color: theme.secondaryText }]}>
                  Detailed emissions breakdown
                </Text>
              </View>
            </View>

            <PlaidLinkButton 
              onSuccess={handleBankConnected}
              style={styles.connectButton}
            />

            <TouchableOpacity 
              style={styles.skipButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.skipButtonText, { color: theme.secondaryText }]}>
                I'll do this later
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Emissions Summary */}
        <View style={[styles.summaryCard, {
          backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
          borderColor: theme.accentText,
        }]}>
          <Text style={[styles.summaryTitle, { color: theme.accentText }]}>
            Your Carbon Impact
          </Text>
          
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.primaryText }]}>
                {(userEmissions / 1000).toFixed(2)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
                Tons Emitted (30 days)
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.accentText }]}>
                {totalOffset.toFixed(2)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
                Total Offset
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { 
                color: (userEmissions / 1000 - totalOffset) <= 0 ? theme.accentText : '#EF4444' 
              }]}>
                {((userEmissions / 1000) - totalOffset).toFixed(2)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
                Net Emissions
              </Text>
            </View>
          </View>
          
          {((userEmissions / 1000) - totalOffset) <= 0 && (
            <View style={[styles.neutralBadge, { backgroundColor: theme.accentText }]}>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.neutralText}>
                🎉 You're Carbon Neutral!
              </Text>
            </View>
          )}
        </View>

        {/* Purchase Form */}
        <View style={[styles.purchaseCard, {
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
        }]}>
          <Text style={[styles.cardTitle, { color: theme.primaryText }]}>
            Purchase Carbon Offsets
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: theme.secondaryText }]}>
              Amount (tons CO₂)
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#F9FAFB',
                color: theme.primaryText,
                borderColor: theme.border,
              }]}
              value={offsetAmount}
              onChangeText={setOffsetAmount}
              keyboardType="numeric"
              placeholder="1.0"
              placeholderTextColor={theme.secondaryText}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
            Select Provider
          </Text>

          {Object.entries(OFFSET_PROVIDERS).map(([key, provider]) => (
            <ProviderCard
              key={key}
              providerId={key}
              provider={provider}
              isSelected={selectedProvider === key}
              onSelect={setSelectedProvider}
            />
          ))}

          <TouchableOpacity
            style={[styles.purchaseButton, { backgroundColor: theme.accentText }]}
            onPress={purchaseOffset}
          >
            <Text style={styles.purchaseButtonText}>
              Purchase for ${(parseFloat(offsetAmount || 0) * OFFSET_PROVIDERS[selectedProvider].pricePerTon).toFixed(2)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Offset History */}
        {userOffsets.length > 0 && (
          <View style={[styles.historyCard, {
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
          }]}>
            <Text style={[styles.cardTitle, { color: theme.primaryText }]}>
              Your Offset History
            </Text>
            
            {userOffsets.map((offset) => (
              <View
                key={offset.id}
                style={[styles.historyItem, { borderColor: theme.border }]}
              >
                <View style={styles.historyContent}>
                  <Text style={[styles.historyProvider, { color: theme.primaryText }]}>
                    {OFFSET_PROVIDERS[offset.provider]?.name || offset.provider}
                  </Text>
                  <Text style={[styles.historyDate, { color: theme.secondaryText }]}>
                    {new Date(offset.purchased_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.historyAmounts}>
                  <Text style={[styles.historyTons, { color: theme.accentText }]}>
                    {offset.tons_co2} tons CO₂
                  </Text>
                  <Text style={[styles.historyPrice, { color: theme.secondaryText }]}>
                    ${offset.total_price}
                  </Text>
                </View>
              </View>
            ))}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  benefitText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  connectButton: {
    width: '100%',
    marginBottom: 16,
  },
  skipButton: {
    padding: 12,
  },
  skipButtonText: {
    fontSize: 16,
    textAlign: 'center',
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 2,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  neutralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
  },
  neutralText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  purchaseCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  providerCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  providerPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  providerProjects: {
    fontSize: 14,
  },
  purchaseButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  historyContent: {
    flex: 1,
  },
  historyProvider: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 14,
  },
  historyAmounts: {
    alignItems: 'flex-end',
  },
  historyTons: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  historyPrice: {
    fontSize: 14,
  },
});