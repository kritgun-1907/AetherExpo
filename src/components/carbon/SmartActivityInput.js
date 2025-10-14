// src/components/carbon/SmartActivityInput.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import AutopilotEmissionService from '../../services/AutopilotEmissionService';
import { supabase } from '../../api/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SmartActivityInput({ onActivityAdded }) {
  const { theme, isDarkMode } = useTheme();
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('km');
  const [unitType, setUnitType] = useState('distance');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [region, setRegion] = useState('GLOBAL');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recentQueries, setRecentQueries] = useState([]);

  // Common activity examples
  const examples = [
    { text: "Drove 20 km to work", quantity: 20, unit: 'km', unitType: 'distance' },
    { text: "Had a beef burger for lunch", quantity: 0.2, unit: 'kg', unitType: 'weight' },
    { text: "Bought a new cotton t-shirt", quantity: 1, unit: 'items', unitType: 'number' },
    { text: "Used 50 kWh electricity this week", quantity: 50, unit: 'kWh', unitType: 'energy' },
    { text: "Took a 2-hour domestic flight", quantity: 500, unit: 'km', unitType: 'distance' },
    { text: "Grocery shopping worth $50", quantity: 50, unit: 'USD', unitType: 'money' },
  ];

  // Unit type options
  const unitTypes = [
    { type: 'distance', units: ['km', 'mi', 'm'], icon: 'navigate', label: 'Distance' },
    { type: 'weight', units: ['kg', 'g', 'lb'], icon: 'scale', label: 'Weight' },
    { type: 'number', units: ['items', 'pieces'], icon: 'grid', label: 'Count' },
    { type: 'money', units: ['USD', 'EUR', 'GBP'], icon: 'cash', label: 'Cost' },
    { type: 'volume', units: ['L', 'gal', 'mL'], icon: 'water', label: 'Volume' },
    { type: 'energy', units: ['kWh', 'MWh', 'GJ'], icon: 'flash', label: 'Energy' },
  ];

  // Load recent queries on mount
  useEffect(() => {
    loadRecentQueries();
  }, []);

  const loadRecentQueries = async () => {
    try {
      const stored = await AsyncStorage.getItem('recentQueries');
      if (stored) {
        setRecentQueries(JSON.parse(stored).slice(0, 5));
      }
    } catch (error) {
      console.log('Error loading recent queries:', error);
    }
  };

  // In SmartActivityInput.js, update the handleGetSuggestions function:

const handleGetSuggestions = async () => {
  if (!description.trim()) {
    Alert.alert('Missing Information', 'Please describe your activity');
    return;
  }

  setLoading(true);
  try {
    const results = await AutopilotEmissionService.getSuggestions(
      description,
      unitType,
      {
        region,
        regionFallback: true,
        units: [unitType],
      }
    );

    setSuggestions(results || []);
    
    if (!results || results.length === 0) {
      Alert.alert(
        'No Matches Found',
        'Unable to find emission factors for this activity. Try describing it differently or use the manual calculator instead.'
      );
    } else {
      // Auto-select if high confidence
      const topMatch = results[0];
      if (topMatch.similarity_score >= 0.85) {
        setSelectedSuggestion(topMatch);
      }
    }
  } catch (error) {
    console.error('Error getting suggestions:', error);
    Alert.alert(
      'Connection Error', 
      'Unable to connect to the emission database. Please check your internet connection or try the manual calculator.'
    );
  } finally {
    setLoading(false);
  }
};


  const handleCalculateAndSave = async () => {
    if (!selectedSuggestion || !quantity) {
      Alert.alert('Missing Information', 'Please select an emission factor and enter quantity');
      return;
    }

    setCalculating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to track activities');
        return;
      }

      // Calculate emissions using selected factor
      const emissions = await AutopilotEmissionService.estimateEmissions(
        selectedSuggestion.suggestion_id,
        parseFloat(quantity),
        unitType,
        unit
      );

      // Save to database
      await supabase.from('emissions').insert({
        user_id: user.id,
        category: inferCategory(description),
        amount: emissions.co2e,
        unit: emissions.co2e_unit,
        description: `${description} (${quantity} ${unit})`,
        source: 'autopilot',
        emission_factor: selectedSuggestion.similarity_score,
        metadata: {
          autopilot_suggestion_id: selectedSuggestion.suggestion_id,
          emission_factor: selectedSuggestion,
          calculation: emissions,
          confidence: selectedSuggestion.similarity_score,
        }
      });

      // Save to recent queries
      const newQuery = { description, quantity, unit, unitType };
      const updatedQueries = [newQuery, ...recentQueries.slice(0, 4)];
      setRecentQueries(updatedQueries);
      await AsyncStorage.setItem('recentQueries', JSON.stringify(updatedQueries));

      Alert.alert(
        '✅ Activity Tracked!',
        `${description}\n` +
        `Quantity: ${quantity} ${unit}\n` +
        `Emissions: ${emissions.co2e.toFixed(2)} ${emissions.co2e_unit}\n` +
        `Confidence: ${(selectedSuggestion.similarity_score * 100).toFixed(0)}%\n` +
        `Source: ${selectedSuggestion.source}`,
        [{ text: 'OK', onPress: clearForm }]
      );

      // Callback
      onActivityAdded?.({
        description,
        emissions: emissions.co2e,
        unit: emissions.co2e_unit,
        confidence: selectedSuggestion.similarity_score
      });

    } catch (error) {
      console.error('Error calculating emissions:', error);
      Alert.alert('Error', 'Failed to calculate emissions');
    } finally {
      setCalculating(false);
    }
  };

  const clearForm = () => {
    setDescription('');
    setQuantity('');
    setSuggestions([]);
    setSelectedSuggestion(null);
  };

  const inferCategory = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes('car') || lower.includes('bus') || lower.includes('train') || lower.includes('flight')) {
      return 'transport';
    } else if (lower.includes('food') || lower.includes('meal') || lower.includes('eat')) {
      return 'food';
    } else if (lower.includes('electricity') || lower.includes('gas') || lower.includes('heating')) {
      return 'home';
    } else if (lower.includes('buy') || lower.includes('purchase') || lower.includes('shopping')) {
      return 'shopping';
    }
    return 'other';
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.suggestionCard,
        {
          backgroundColor: selectedSuggestion?.suggestion_id === item.suggestion_id
            ? theme.accentText + '20'
            : isDarkMode ? 'rgba(255, 255, 255, 0.05)' : theme.cardBackground,
          borderColor: selectedSuggestion?.suggestion_id === item.suggestion_id
            ? theme.accentText
            : theme.border,
        }
      ]}
      onPress={() => setSelectedSuggestion(item)}
    >
      <View style={styles.suggestionHeader}>
        <Text style={[styles.suggestionName, { color: theme.primaryText }]} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={[styles.confidenceBadge, {
          backgroundColor: item.similarity_score >= 0.85 ? '#10B981' :
                          item.similarity_score >= 0.70 ? '#F59E0B' : '#EF4444'
        }]}>
          <Text style={styles.confidenceText}>
            {(item.similarity_score * 100).toFixed(0)}%
          </Text>
        </View>
      </View>
      
      <View style={styles.suggestionDetails}>
        <Text style={[styles.detailText, { color: theme.secondaryText }]}>
          Source: {item.source}
        </Text>
        <Text style={[styles.detailText, { color: theme.secondaryText }]}>
          Region: {item.region || 'Global'}
        </Text>
        {item.year && (
          <Text style={[styles.detailText, { color: theme.secondaryText }]}>
            Year: {item.year}
          </Text>
        )}
      </View>

      {selectedSuggestion?.suggestion_id === item.suggestion_id && (
        <Ionicons 
          name="checkmark-circle" 
          size={20} 
          color={theme.accentText}
          style={styles.selectedIcon}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Input Section */}
        <View style={[styles.inputSection, { 
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : theme.cardBackground,
          borderColor: theme.border
        }]}>
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
            🤖 Smart Activity Tracking
          </Text>
          
          <Text style={[styles.label, { color: theme.secondaryText }]}>
            Describe your activity in plain language:
          </Text>
          
          <TextInput
            style={[styles.textInput, {
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : theme.divider,
              color: theme.primaryText,
              borderColor: theme.border,
            }]}
            placeholder="e.g., 'Drove 20km to office' or 'Had chicken sandwich for lunch'"
            placeholderTextColor={theme.secondaryText}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
          />

          {/* Quick Examples */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examplesRow}>
            {examples.map((example, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.exampleChip, { backgroundColor: theme.divider }]}
                onPress={() => {
                  setDescription(example.text);
                  setQuantity(example.quantity.toString());
                  setUnit(example.unit);
                  setUnitType(example.unitType);
                }}
              >
                <Text style={[styles.exampleText, { color: theme.secondaryText }]}>
                  {example.text}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quantity and Unit */}
          <View style={styles.quantityRow}>
            <View style={styles.quantityInput}>
              <Text style={[styles.label, { color: theme.secondaryText }]}>
                Quantity:
              </Text>
              <TextInput
                style={[styles.textInput, {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : theme.divider,
                  color: theme.primaryText,
                  borderColor: theme.border,
                }]}
                placeholder="Amount"
                placeholderTextColor={theme.secondaryText}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.unitSelector}>
              <Text style={[styles.label, { color: theme.secondaryText }]}>
                Unit Type:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {unitTypes.map((type) => (
                  <TouchableOpacity
                    key={type.type}
                    style={[
                      styles.unitTypeButton,
                      {
                        backgroundColor: unitType === type.type ? theme.accentText : theme.divider,
                        borderColor: unitType === type.type ? theme.accentText : theme.border,
                      }
                    ]}
                    onPress={() => {
                      setUnitType(type.type);
                      setUnit(type.units[0]);
                    }}
                  >
                    <Ionicons 
                      name={type.icon} 
                      size={16} 
                      color={unitType === type.type ? '#FFFFFF' : theme.secondaryText} 
                    />
                    <Text style={[
                      styles.unitTypeText,
                      { color: unitType === type.type ? '#FFFFFF' : theme.primaryText }
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Advanced Options */}
          <TouchableOpacity 
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(!showAdvanced)}
          >
            <Text style={[styles.advancedText, { color: theme.secondaryText }]}>
              Advanced Options
            </Text>
            <Ionicons 
              name={showAdvanced ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={theme.secondaryText} 
            />
          </TouchableOpacity>

          {showAdvanced && (
            <View style={styles.advancedOptions}>
              <View style={styles.regionSelector}>
                <Text style={[styles.label, { color: theme.secondaryText }]}>
                  Region:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['GLOBAL', 'US', 'EU', 'GB', 'CN', 'IN'].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.regionButton,
                        {
                          backgroundColor: region === r ? theme.accentText : theme.divider,
                        }
                      ]}
                      onPress={() => setRegion(r)}
                    >
                      <Text style={[
                        styles.regionText,
                        { color: region === r ? '#FFFFFF' : theme.primaryText }
                      ]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Get Suggestions Button */}
          <TouchableOpacity
            style={[styles.suggestButton, { backgroundColor: theme.accentText }]}
            onPress={handleGetSuggestions}
            disabled={loading || !description.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                <Text style={styles.suggestButtonText}>
                  Find Emission Factors
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Suggestions Section */}
        {suggestions.length > 0 && (
          <View style={[styles.suggestionsSection, { 
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : theme.cardBackground,
            borderColor: theme.border
          }]}>
            <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
              📊 Emission Factor Matches
            </Text>
            
            <Text style={[styles.helperText, { color: theme.secondaryText }]}>
              Select the best matching emission factor (higher % = better match):
            </Text>

            <FlatList
              data={suggestions}
              renderItem={renderSuggestion}
              keyExtractor={(item) => item.suggestion_id}
              scrollEnabled={false}
            />

            {selectedSuggestion && (
              <TouchableOpacity
                style={[styles.calculateButton, { backgroundColor: theme.accentText }]}
                onPress={handleCalculateAndSave}
                disabled={calculating || !quantity}
              >
                {calculating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="calculator" size={20} color="#FFFFFF" />
                    <Text style={styles.calculateButtonText}>
                      Calculate & Save Emissions
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Recent Activities */}
        {recentQueries.length > 0 && (
          <View style={[styles.recentSection, { 
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : theme.cardBackground,
            borderColor: theme.border
          }]}>
            <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
              🕐 Recent Activities
            </Text>
            {recentQueries.map((query, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.recentItem, { borderColor: theme.border }]}
                onPress={() => {
                  setDescription(query.description);
                  setQuantity(query.quantity);
                  setUnit(query.unit);
                  setUnitType(query.unitType);
                }}
              >
                <Text style={[styles.recentText, { color: theme.primaryText }]}>
                  {query.description}
                </Text>
                <Text style={[styles.recentMeta, { color: theme.secondaryText }]}>
                  {query.quantity} {query.unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputSection: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  examplesRow: {
    marginBottom: 16,
  },
  exampleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  exampleText: {
    fontSize: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  quantityInput: {
    flex: 1,
  },
  unitSelector: {
    flex: 2,
  },
  unitTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  unitTypeText: {
    fontSize: 12,
    marginLeft: 4,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  advancedText: {
    fontSize: 14,
    marginRight: 4,
  },
  advancedOptions: {
    marginTop: 12,
  },
  regionSelector: {
    marginBottom: 12,
  },
  regionButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  regionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  suggestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  suggestButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  suggestionsSection: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  helperText: {
    fontSize: 13,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  suggestionCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    position: 'relative',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailText: {
    fontSize: 12,
  },
  selectedIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  calculateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  recentSection: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  recentItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  recentText: {
    fontSize: 14,
    marginBottom: 4,
  },
  recentMeta: {
    fontSize: 12,
  },
});