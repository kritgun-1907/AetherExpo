// src/screens/main/CarbonOffsetScreen.js - COMPLETE VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { plaidService, OFFSET_PROVIDERS } from '../../api/plaid';
import { supabase } from '../../api/supabase';
import { useTheme } from '../../context/ThemeContext';

export default function CarbonOffsetScreen() {
  const { theme, isDarkMode } = useTheme();
  const [userEmissions, setUserEmissions] = useState(0);
  const [offsetAmount, setOffsetAmount] = useState('1');
  const [selectedProvider, setSelectedProvider] = useState('goldstandard');
  const [userOffsets, setUserOffsets] = useState([]);
  const [totalOffset, setTotalOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's carbon emissions for the last 30 days
      try {
        const carbonData = await plaidService.getTransactionsAndCalculateCarbon(user.id, 30);
        setUserEmissions(carbonData.totalCarbon || 0);
      } catch (error) {
        console.log('Error loading emissions:', error);
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
                
                loadData(); // Reload data
                setOffsetAmount('1'); // Reset form
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
        <Image 
          source={{ uri: provider.logo }} 
          style={styles.providerLogo}
          defaultSource={require('../../../assets/icon.png')}
        />
        <View style={styles.providerInfo}>
          <Text style={[styles.providerName, { color: theme.primaryText }]}>
            {provider.name}
          </Text>
          <Text style={[styles.providerPrice, { color: theme.accentText }]}>
            ${provider.pricePerTon}/ton CO₂
          </Text>
        </View>
        <View style={styles.rating}>
          {[...Array(provider.rating)].map((_, i) => (
            <Text key={i} style={styles.star}>⭐</Text>
          ))}
        </View>
      </View>
      
      <View style={styles.projectsList}>
        <Text style={[styles.projectsTitle, { color: theme.secondaryText }]}>
          Project Types:
        </Text>
        {provider.projects.map((project, index) => (
          <Text key={index} style={[styles.projectItem, { color: theme.secondaryText }]}>
            • {project}
          </Text>
        ))}
      </View>
      
      {isSelected && (
        <View style={[styles.selectedIndicator, { backgroundColor: theme.accentText }]}>
          <Text style={[styles.selectedText, { color: theme.buttonText }]}>
            ✓ Selected
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const OffsetHistoryCard = ({ offset }) => (
    <View style={[styles.historyCard, {
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
      borderColor: theme.border,
    }]}>
      <View style={styles.historyHeader}>
        <Text style={[styles.historyProvider, { color: theme.primaryText }]}>
          {OFFSET_PROVIDERS[offset.provider]?.name || 'Unknown Provider'}
        </Text>
        <Text style={[styles.historyAmount, { color: theme.accentText }]}>
          {parseFloat(offset.tons_co2).toFixed(1)} tons CO₂
        </Text>
      </View>
      
      <View style={styles.historyDetails}>
        <Text style={[styles.historyPrice, { color: theme.secondaryText }]}>
          ${parseFloat(offset.total_price).toFixed(2)} • {new Date(offset.purchased_at).toLocaleDateString()}
        </Text>
        <Text style={[styles.certificateId, { color: theme.secondaryText }]}>
          Certificate: {offset.certificate_id}
        </Text>
      </View>
    </View>
  );

  const calculatePrice = () => {
    const tons = parseFloat(offsetAmount) || 0;
    const provider = OFFSET_PROVIDERS[selectedProvider];
    return provider ? (tons * provider.pricePerTon).toFixed(2) : '0.00';
  };

  const getNetEmissions = () => {
    const monthlyEmissions = userEmissions || 0;
    const yearlyProjected = monthlyEmissions * 12;
    const netEmissions = Math.max(0, yearlyProjected - (totalOffset * 1000)); // Convert tons to kg
    return {
      yearly: yearlyProjected,
      offset: totalOffset * 1000,
      net: netEmissions,
    };
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accentText} />
        <Text style={[styles.loadingText, { color: theme.primaryText }]}>Loading...</Text>
      </View>
    );
  }

  const emissions = getNetEmissions();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.primaryText }]}>
            🌍 Carbon Offsets
          </Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            Invest in high-quality projects to offset your carbon footprint
          </Text>
        </View>

        {/* Impact Summary */}
        <View style={[styles.impactCard, {
          backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
          borderColor: theme.accentText,
        }]}>
          <Text style={[styles.impactTitle, { color: theme.accentText }]}>
            Your Carbon Impact
          </Text>
          
          <View style={styles.impactStats}>
            <View style={styles.impactStat}>
              <Text style={[styles.impactValue, { color: theme.primaryText }]}>
                {(emissions.yearly / 1000).toFixed(1)}
              </Text>
              <Text style={[styles.impactLabel, { color: theme.secondaryText }]}>
                Yearly Emissions (tons)
              </Text>
            </View>
            
            <View style={styles.impactStat}>
              <Text style={[styles.impactValue, { color: theme.accentText }]}>
                {totalOffset.toFixed(1)}
              </Text>
              <Text style={[styles.impactLabel, { color: theme.secondaryText }]}>
                Total Offset (tons)
              </Text>
            </View>
            
            <View style={styles.impactStat}>
              <Text style={[styles.impactValue, { 
                color: emissions.net <= 0 ? theme.accentText : '#EF4444' 
              }]}>
                {(emissions.net / 1000).toFixed(1)}
              </Text>
              <Text style={[styles.impactLabel, { color: theme.secondaryText }]}>
                Net Emissions (tons)
              </Text>
            </View>
          </View>
          
          {emissions.net <= 0 && (
            <View style={[styles.carbonNeutralBadge, { backgroundColor: theme.accentText }]}>
              <Text style={[styles.carbonNeutralText, { color: theme.buttonText }]}>
                🎉 You're Carbon Neutral!
              </Text>
            </View>
          )}
        </View>

        {/* Purchase Form */}
        <View style={[styles.purchaseCard, {
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
          borderColor: theme.border,
        }]}>
          <Text style={[styles.cardTitle, { color: theme.primaryText }]}>
            Purchase Carbon Offsets
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: theme.secondaryText }]}>
              Amount (tons CO₂)
            </Text>
            <TextInput
              style={[styles.amountInput, {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.divider,
                color: theme.primaryText,
                borderColor: theme.border,
              }]}
              value={offsetAmount}
              onChangeText={setOffsetAmount}
              placeholder="1.0"
              keyboardType="decimal-pad"
              placeholderTextColor={theme.secondaryText}
            />
          </View>
          
          <Text style={[styles.formLabel, { color: theme.secondaryText }]}>
            Select Offset Provider
          </Text>
        </View>

        {/* Provider Selection */}
        <View style={styles.providersContainer}>
          {Object.entries(OFFSET_PROVIDERS).map(([providerId, provider]) => (
            <ProviderCard
              key={providerId}
              providerId={providerId}
              provider={provider}
              isSelected={selectedProvider === providerId}
              onSelect={setSelectedProvider}
            />
          ))}
        </View>

        {/* Purchase Button */}
        <View style={[styles.purchaseSummary, {
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
          borderColor: theme.border,
        }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.secondaryText }]}>
              Amount:
            </Text>
            <Text style={[styles.summaryValue, { color: theme.primaryText }]}>
              {offsetAmount} tons CO₂
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.secondaryText }]}>
              Provider:
            </Text>
            <Text style={[styles.summaryValue, { color: theme.primaryText }]}>
              {OFFSET_PROVIDERS[selectedProvider]?.name || 'Unknown'}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: theme.primaryText }]}>
              Total:
            </Text>
            <Text style={[styles.totalValue, { color: theme.accentText }]}>
              ${calculatePrice()}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.purchaseButton, { backgroundColor: theme.accentText }]}
            onPress={purchaseOffset}
          >
            <Text style={[styles.purchaseButtonText, { color: theme.buttonText }]}>
              Purchase Offsets
            </Text>
          </TouchableOpacity>
        </View>

        {/* Offset History */}
        {userOffsets.length > 0 && (
          <View style={styles.historySection}>
            <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
              Your Offset History
            </Text>
            {userOffsets.map((offset, index) => (
              <OffsetHistoryCard key={offset.id || index} offset={offset} />
            ))}
          </View>
        )}

        <View style={styles.bottomSpacing} />
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
    marginTop: 10,
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },

  // Impact Card
  impactCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
  },
  impactTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  impactStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  impactStat: {
    alignItems: 'center',
    flex: 1,
  },
  impactValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  impactLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  carbonNeutralBadge: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center',
  },
  carbonNeutralText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Purchase Card
  purchaseCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  formGroup: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  amountInput: {
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
  },

  // Provider Cards
  providersContainer: {
    marginBottom: 20,
  },
  providerCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  providerLogo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#F3F4F6',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  providerPrice: {
    fontSize: 14,
    fontWeight: '500',
  },
  rating: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 16,
  },
  projectsList: {
    marginBottom: 10,
  },
  projectsTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 5,
  },
  projectItem: {
    fontSize: 12,
    marginBottom: 2,
  },
  selectedIndicator: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  selectedText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Purchase Summary
  purchaseSummary: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  purchaseButton: {
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // History Section
  historySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  historyCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  historyProvider: {
    fontSize: 16,
    fontWeight: '500',
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyPrice: {
    fontSize: 12,
  },
  certificateId: {
    fontSize: 12,
    fontStyle: 'italic',
  },

  bottomSpacing: {
    height: 50,
  },
});