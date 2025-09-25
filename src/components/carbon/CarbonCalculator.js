// src/components/carbon/CarbonCalculator.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../api/supabase';
import { calculateRealEmissions } from '../../api/climatiq';

// Carbon emission factors (kg CO2 per unit)
const EMISSION_FACTORS = {
  transport: {
    car_petrol: { factor: 0.21, unit: 'km', label: 'Petrol Car' },
    car_diesel: { factor: 0.17, unit: 'km', label: 'Diesel Car' },
    car_electric: { factor: 0.05, unit: 'km', label: 'Electric Car' },
    car_hybrid: { factor: 0.12, unit: 'km', label: 'Hybrid Car' },
    motorcycle: { factor: 0.113, unit: 'km', label: 'Motorcycle' },
    bus: { factor: 0.089, unit: 'km', label: 'Bus' },
    train: { factor: 0.041, unit: 'km', label: 'Train' },
    metro: { factor: 0.033, unit: 'km', label: 'Metro/Subway' },
    flight_domestic: { factor: 0.255, unit: 'km', label: 'Domestic Flight' },
    flight_international: { factor: 0.195, unit: 'km', label: 'International Flight' },
    ferry: { factor: 0.115, unit: 'km', label: 'Ferry' },
    bicycle: { factor: 0, unit: 'km', label: 'Bicycle' },
    walking: { factor: 0, unit: 'km', label: 'Walking' },
    uber_taxi: { factor: 0.21, unit: 'km', label: 'Uber/Taxi' },
  },
  food: {
    beef: { factor: 27, unit: 'kg', label: 'Beef' },
    lamb: { factor: 39, unit: 'kg', label: 'Lamb' },
    pork: { factor: 12, unit: 'kg', label: 'Pork' },
    chicken: { factor: 6.9, unit: 'kg', label: 'Chicken' },
    fish: { factor: 6.1, unit: 'kg', label: 'Fish' },
    eggs: { factor: 4.8, unit: 'dozen', label: 'Eggs' },
    dairy_milk: { factor: 1.9, unit: 'liter', label: 'Milk' },
    cheese: { factor: 13.5, unit: 'kg', label: 'Cheese' },
    rice: { factor: 4, unit: 'kg', label: 'Rice' },
    bread: { factor: 1.1, unit: 'kg', label: 'Bread' },
    vegetables: { factor: 2, unit: 'kg', label: 'Vegetables' },
    fruits: { factor: 1.1, unit: 'kg', label: 'Fruits' },
    tofu: { factor: 3, unit: 'kg', label: 'Tofu' },
    coffee: { factor: 0.39, unit: 'cup', label: 'Coffee' },
    tea: { factor: 0.07, unit: 'cup', label: 'Tea' },
    beer: { factor: 0.5, unit: 'pint', label: 'Beer' },
    wine: { factor: 1.2, unit: 'bottle', label: 'Wine' },
  },
  home: {
    electricity: { factor: 0.233, unit: 'kWh', label: 'Electricity' },
    natural_gas: { factor: 2.04, unit: 'm³', label: 'Natural Gas' },
    heating_oil: { factor: 2.52, unit: 'liter', label: 'Heating Oil' },
    propane: { factor: 1.51, unit: 'liter', label: 'Propane' },
    water_usage: { factor: 0.0003, unit: 'liter', label: 'Water Usage' },
    waste_general: { factor: 0.467, unit: 'kg', label: 'General Waste' },
    waste_recycling: { factor: 0.02, unit: 'kg', label: 'Recycling' },
    waste_compost: { factor: 0.01, unit: 'kg', label: 'Compost' },
  },
  shopping: {
    clothing_new: { factor: 8.11, unit: 'item', label: 'New Clothing' },
    clothing_used: { factor: 0.5, unit: 'item', label: 'Used Clothing' },
    shoes: { factor: 14, unit: 'pair', label: 'Shoes' },
    electronics_phone: { factor: 70, unit: 'item', label: 'Smartphone' },
    electronics_laptop: { factor: 300, unit: 'item', label: 'Laptop' },
    electronics_tv: { factor: 400, unit: 'item', label: 'Television' },
    furniture_wood: { factor: 25, unit: 'item', label: 'Wooden Furniture' },
    furniture_metal: { factor: 50, unit: 'item', label: 'Metal Furniture' },
    books: { factor: 2.3, unit: 'item', label: 'Books' },
    plastic_bags: { factor: 0.033, unit: 'bag', label: 'Plastic Bags' },
  },
  lifestyle: {
    hotel_night: { factor: 21, unit: 'night', label: 'Hotel Stay' },
    restaurant_meal: { factor: 6.5, unit: 'meal', label: 'Restaurant Meal' },
    takeaway_meal: { factor: 4.5, unit: 'meal', label: 'Takeaway Meal' },
    cinema_visit: { factor: 1.2, unit: 'visit', label: 'Cinema Visit' },
    gym_hour: { factor: 0.5, unit: 'hour', label: 'Gym Session' },
    streaming_hour: { factor: 0.055, unit: 'hour', label: 'Video Streaming' },
    gaming_hour: { factor: 0.072, unit: 'hour', label: 'Gaming' },
  },
};

export default function CarbonCalculator({ onCalculationComplete }) {
  const { theme, isDarkMode } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('transport');
  const [selectedItem, setSelectedItem] = useState(null);
  const [amount, setAmount] = useState('');
  const [customItem, setCustomItem] = useState('');
  const [customFactor, setCustomFactor] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [yearlyProjection, setYearlyProjection] = useState(0);
  const [comparisonModalVisible, setComparisonModalVisible] = useState(false);
  const [calculationHistory, setCalculationHistory] = useState([]);
  const [useClimatiqAPI, setUseClimatiqAPI] = useState(false);
  
  // Load user's calculation history
  useEffect(() => {
    loadCalculationHistory();
  }, []);

  const loadCalculationHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get last 30 days of emissions
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const { data: emissions } = await supabase
        .from('emissions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (emissions) {
        setCalculationHistory(emissions);
        
        // Calculate monthly total
        const total = emissions.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        setMonthlyTotal(total);
        setYearlyProjection(total * 12);
      }
    } catch (error) {
      console.error('Error loading calculation history:', error);
    }
  };

  const calculateEmissions = async () => {
    if (!selectedItem && (!customItem || !customFactor)) {
      Alert.alert('Missing Information', 'Please select an item or enter custom values');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    setIsCalculating(true);

    try {
      let emissions = 0;
      let itemLabel = '';
      let unit = '';

      if (selectedItem) {
        const factor = EMISSION_FACTORS[selectedCategory][selectedItem];
        itemLabel = factor.label;
        unit = factor.unit;

        if (useClimatiqAPI) {
          // Try to use Climatiq API for more accurate calculation
          try {
            emissions = await calculateRealEmissions(
              `${selectedCategory}.${selectedItem}`,
              parseFloat(amount)
            );
          } catch (apiError) {
            console.log('Climatiq API failed, using local factors');
            emissions = parseFloat(amount) * factor.factor;
          }
        } else {
          emissions = parseFloat(amount) * factor.factor;
        }
      } else {
        // Custom calculation
        itemLabel = customItem;
        unit = 'units';
        emissions = parseFloat(amount) * parseFloat(customFactor);
      }

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('emissions')
          .insert({
            user_id: user.id,
            category: selectedCategory,
            subcategory: selectedItem || 'custom',
            amount: emissions,
            unit: 'kg_co2e',
            description: `${itemLabel}: ${amount} ${unit}`,
            emission_factor: selectedItem 
              ? EMISSION_FACTORS[selectedCategory][selectedItem].factor 
              : parseFloat(customFactor),
            metadata: {
              item: itemLabel,
              quantity: parseFloat(amount),
              unit: unit,
              calculation_method: useClimatiqAPI ? 'climatiq_api' : 'local_factors'
            }
          });

        if (error) {
          console.error('Error saving emission:', error);
        } else {
          // Update totals
          setMonthlyTotal(prev => prev + emissions);
          setYearlyProjection(prev => prev + (emissions * 12));
          
          // Reload history
          loadCalculationHistory();
        }
      }

      // Show result
      Alert.alert(
        '🌍 Carbon Footprint Calculated',
        `${itemLabel}: ${amount} ${unit}\n\nEmissions: ${emissions.toFixed(2)} kg CO₂\n\nMonthly Total: ${(monthlyTotal + emissions).toFixed(2)} kg CO₂\nYearly Projection: ${((monthlyTotal + emissions) * 12).toFixed(2)} kg CO₂`,
        [
          { text: 'View Comparisons', onPress: () => setComparisonModalVisible(true) },
          { text: 'OK', onPress: () => clearForm() }
        ]
      );

      // Callback to parent
      if (onCalculationComplete) {
        onCalculationComplete({
          category: selectedCategory,
          item: itemLabel,
          amount: parseFloat(amount),
          unit: unit,
          emissions: emissions
        });
      }

    } catch (error) {
      console.error('Calculation error:', error);
      Alert.alert('Error', 'Failed to calculate emissions');
    } finally {
      setIsCalculating(false);
    }
  };

  const clearForm = () => {
    setSelectedItem(null);
    setAmount('');
    setCustomItem('');
    setCustomFactor('');
  };

  const getComparisonData = () => {
    const yearlyKg = yearlyProjection;
    const yearlyTons = yearlyKg / 1000;

    return {
      trees: Math.ceil(yearlyKg / 21), // Trees needed to offset
      flights: (yearlyKg / 1000).toFixed(1), // Number of transatlantic flights
      cars: (yearlyKg / 2400).toFixed(1), // Cars off road for a year
      worldAverage: ((yearlyTons / 4.8) * 100).toFixed(0), // % of world average
      countryRank: yearlyTons < 4 ? 'Below Average ✅' : yearlyTons < 8 ? 'Average ⚠️' : 'Above Average ❌'
    };
  };

  const comparisons = getComparisonData();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.primaryText }]}>
            🧮 Carbon Calculator
          </Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            Calculate your exact carbon footprint
          </Text>
        </View>

        {/* Current Totals */}
        <View style={[styles.totalsCard, {
          backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
          borderColor: theme.accentText,
        }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.secondaryText }]}>
              Monthly Total:
            </Text>
            <Text style={[styles.totalValue, { color: theme.accentText }]}>
              {monthlyTotal.toFixed(2)} kg CO₂
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.secondaryText }]}>
              Yearly Projection:
            </Text>
            <Text style={[styles.totalValue, { color: theme.accentText }]}>
              {(yearlyProjection / 1000).toFixed(2)} tons CO₂
            </Text>
          </View>
        </View>

        {/* Category Selection */}
        <View style={styles.categoryContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.keys(EMISSION_FACTORS).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor: selectedCategory === cat 
                      ? theme.accentText 
                      : isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
                    borderColor: selectedCategory === cat ? theme.accentText : theme.border,
                  }
                ]}
                onPress={() => {
                  setSelectedCategory(cat);
                  setSelectedItem(null);
                }}
              >
                <Text style={[
                  styles.categoryText,
                  { color: selectedCategory === cat ? '#FFFFFF' : theme.primaryText }
                ]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Item Selection */}
        <View style={[styles.itemsContainer, {
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
          borderColor: theme.border,
        }]}>
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
            Select Item
          </Text>
          <View style={styles.itemsGrid}>
            {Object.entries(EMISSION_FACTORS[selectedCategory]).map(([key, item]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.itemButton,
                  {
                    backgroundColor: selectedItem === key 
                      ? theme.accentText 
                      : isDarkMode ? 'rgba(255, 255, 255, 0.05)' : theme.divider,
                    borderColor: selectedItem === key ? theme.accentText : 'transparent',
                  }
                ]}
                onPress={() => setSelectedItem(key)}
              >
                <Text style={[
                  styles.itemText,
                  { color: selectedItem === key ? '#FFFFFF' : theme.primaryText }
                ]}>
                  {item.label}
                </Text>
                <Text style={[
                  styles.itemFactor,
                  { color: selectedItem === key ? 'rgba(255,255,255,0.8)' : theme.secondaryText }
                ]}>
                  {item.factor} kg/{item.unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Amount Input */}
        <View style={[styles.inputContainer, {
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
          borderColor: theme.border,
        }]}>
          <Text style={[styles.inputLabel, { color: theme.primaryText }]}>
            Amount {selectedItem && `(${EMISSION_FACTORS[selectedCategory][selectedItem].unit})`}
          </Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : theme.divider,
              color: theme.primaryText,
              borderColor: theme.border,
            }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount..."
            placeholderTextColor={theme.secondaryText}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Custom Calculation */}
        <TouchableOpacity
          style={[styles.customSection, {
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
            borderColor: theme.border,
          }]}
        >
          <Text style={[styles.customTitle, { color: theme.primaryText }]}>
            Custom Item
          </Text>
          <View style={styles.customInputs}>
            <TextInput
              style={[styles.customInput, {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : theme.divider,
                color: theme.primaryText,
                borderColor: theme.border,
                flex: 1,
                marginRight: 10,
              }]}
              value={customItem}
              onChangeText={setCustomItem}
              placeholder="Item name..."
              placeholderTextColor={theme.secondaryText}
            />
            <TextInput
              style={[styles.customInput, {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : theme.divider,
                color: theme.primaryText,
                borderColor: theme.border,
                width: 100,
              }]}
              value={customFactor}
              onChangeText={setCustomFactor}
              placeholder="Factor..."
              placeholderTextColor={theme.secondaryText}
              keyboardType="decimal-pad"
            />
          </View>
          <Text style={[styles.customHint, { color: theme.secondaryText }]}>
            Enter emission factor (kg CO₂ per unit)
          </Text>
        </TouchableOpacity>

        {/* API Toggle */}
        <TouchableOpacity
          style={[styles.apiToggle, {
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
            borderColor: theme.border,
          }]}
          onPress={() => setUseClimatiqAPI(!useClimatiqAPI)}
        >
          <Ionicons 
            name={useClimatiqAPI ? "checkbox" : "square-outline"} 
            size={24} 
            color={theme.accentText} 
          />
          <Text style={[styles.apiToggleText, { color: theme.primaryText }]}>
            Use Climatiq API for accurate calculations
          </Text>
        </TouchableOpacity>

        {/* Calculate Button */}
        <TouchableOpacity
          style={[styles.calculateButton, { backgroundColor: theme.accentText }]}
          onPress={calculateEmissions}
          disabled={isCalculating}
        >
          {isCalculating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.calculateButtonText}>Calculate Emissions</Text>
          )}
        </TouchableOpacity>

        {/* Recent Calculations */}
        {calculationHistory.length > 0 && (
          <View style={[styles.historyContainer, {
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
            borderColor: theme.border,
          }]}>
            <Text style={[styles.historyTitle, { color: theme.primaryText }]}>
              Recent Calculations
            </Text>
            {calculationHistory.slice(0, 5).map((item, index) => (
              <View key={item.id || index} style={styles.historyItem}>
                <Text style={[styles.historyText, { color: theme.primaryText }]}>
                  {item.description || `${item.category}: ${item.amount} kg CO₂`}
                </Text>
                <Text style={[styles.historyDate, { color: theme.secondaryText }]}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Comparison Modal */}
      <Modal
        visible={comparisonModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setComparisonModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
          }]}>
            <Text style={[styles.modalTitle, { color: theme.primaryText }]}>
              🌍 Your Carbon Impact
            </Text>

            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: theme.secondaryText }]}>
                Trees needed to offset:
              </Text>
              <Text style={[styles.comparisonValue, { color: theme.accentText }]}>
                🌳 {comparisons.trees} trees/year
              </Text>
            </View>

            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: theme.secondaryText }]}>
                Equivalent to:
              </Text>
              <Text style={[styles.comparisonValue, { color: theme.accentText }]}>
                ✈️ {comparisons.flights} transatlantic flights
              </Text>
            </View>

            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: theme.secondaryText }]}>
                Like taking off road:
              </Text>
              <Text style={[styles.comparisonValue, { color: theme.accentText }]}>
                🚗 {comparisons.cars} cars/year
              </Text>
            </View>

            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: theme.secondaryText }]}>
                World average comparison:
              </Text>
              <Text style={[styles.comparisonValue, { color: theme.accentText }]}>
                📊 {comparisons.worldAverage}% of average
              </Text>
            </View>

            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: theme.secondaryText }]}>
                Your rating:
              </Text>
              <Text style={[styles.comparisonValue, { color: theme.primaryText }]}>
                {comparisons.countryRank}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.accentText }]}
              onPress={() => setComparisonModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
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
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 5,
  },
  totalsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoryContainer: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  itemButton: {
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    minWidth: 100,
  },
  itemText: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemFactor: {
    fontSize: 10,
    marginTop: 2,
  },
  inputContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  customSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  customTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  customInputs: {
    flexDirection: 'row',
  },
  customInput: {
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
  },
  customHint: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  apiToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  apiToggleText: {
    fontSize: 14,
    marginLeft: 10,
  },
  calculateButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  calculateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  historyText: {
    fontSize: 14,
    flex: 1,
  },
  historyDate: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 20,
    padding: 25,
    width: '90%',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  comparisonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  comparisonLabel: {
    fontSize: 14,
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});