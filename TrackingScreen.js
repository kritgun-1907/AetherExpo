// TrackingScreen.js - Fixed with proper React imports
import React, { useState, useEffect } from 'react';
import ActivityTracker from './src/components/carbon/ActivityTracker';
import { calculateRealEmissions } from './src/api/climatiq';
import CarbonCalculator from './src/components/carbon/CarbonCalculator';
import TripTracker from './src/components/carbon/TripTracker';
import EmissionService from './src/services/EmissionService';
import SmartActivityInput from './src/components/carbon/SmartActivityInput';
import AutopilotEmissionService from './src/services/AutopilotEmissionService';
import ActivityIdFinder from './src/components/ActivityIDFinder';
import EmissionSyncService from './src/services/EmissionSyncService';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, addEmission } from './src/api/supabase';
import { useTheme } from './src/context/ThemeContext';
import * as Location from 'expo-location';

// Import store conditionally to avoid errors
let useCarbonStore;
try {
  const carbonStoreModule = require('./src/store/carbonStore');
  useCarbonStore = carbonStoreModule.useCarbonStore;
} catch (error) {
  console.warn('CarbonStore not available:', error);
  useCarbonStore = () => ({
    addEmission: () => {},
    earnTokens: () => {},
  });
}

const BACKGROUND_IMAGE = require('./assets/hero-carbon-tracker.jpg');
const GOOGLE_MAPS_API_KEY = 'AIzaSyAXwZK2l4RP6fTuGvKglvWFfJwu30KtlyE';

export default function TrackingScreen() {
  const { theme, isDarkMode } = useTheme();
  const { addEmission: storeAddEmission } = useCarbonStore();
  
  const [showFinder, setShowFinder] = useState(false);

  // State hooks for category selection
  const [selectedCategory, setSelectedCategory] = useState('transport');
  const [activeView, setActiveView] = useState('quick');
  
  // Transportation state
 const [transportMode, setTransportMode] = useState('car_petrol');
  const [distance, setDistance] = useState('');
  
  // Food state
  const [mealType, setMealType] = useState('meat');
  const [mealCount, setMealCount] = useState('1');
  
  // Home/Energy state
  const [energyType, setEnergyType] = useState('electricity');
  const [energyHours, setEnergyHours] = useState('');
  
  // Shopping state
  const [itemType, setItemType] = useState('clothing');
  const [itemCount, setItemCount] = useState('1');

  // Setup test - NOW INSIDE THE COMPONENT
  useEffect(() => {
    const testSetup = async () => {
      console.log('=== SETUP TEST ===');
      console.log('Google Maps Key exists:', !!GOOGLE_MAPS_API_KEY);
      
      const { status } = await Location.getForegroundPermissionsAsync();
      console.log('Location permission:', status);
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User authenticated:', !!user);

      console.log('=== TESTING CLIMATIQ API ===');
      const apiResult = await EmissionService.testApiConnection();
      console.log('API test result:', apiResult);

    };
    
    testSetup();
  }, []);

  if (showFinder) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        {/* Back button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setShowFinder(false)}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
          <Text style={styles.backButtonText}>Back to Tracking</Text>
        </TouchableOpacity>
        
        <ActivityIdFinder />
      </View>
    );
  }

  const handleActivityAdded = (activityData) => {
    console.log('Activity added:', activityData);
    if (storeAddEmission) {
      storeAddEmission(activityData.carbon_kg, activityData.category);
    }
  };

  const handleCalculationComplete = (calculationData) => {
    console.log('Calculation complete:', calculationData);
    if (storeAddEmission) {
      storeAddEmission(calculationData.emissions, calculationData.category);
    }
  };

  const handleTripComplete = (tripData) => {
    console.log('Trip complete:', tripData);
    if (storeAddEmission) {
      storeAddEmission(tripData.emissions, 'transport');
    }
  };

// REPLACE the calculateEmissions function in TrackingScreen.js with this:

const calculateEmissions = async () => {
  let itemLabel = '';
  let activityId = '';
  
  switch(selectedCategory) {
    case 'transport':
      if (!distance || parseFloat(distance) <= 0) {
        Alert.alert('Error', 'Please enter a valid distance');
        return;
      }
      activityId = transportMode;
      itemLabel = `${transportMode.replace('_', ' ')} - ${distance} km`;
      break;
      
    case 'food':
      if (!mealCount || parseFloat(mealCount) <= 0) {
        Alert.alert('Error', 'Please enter number of meals');
        return;
      }
      activityId = mealType;
      itemLabel = `${mealType} meal(s) - ${mealCount}`;
      break;
      
    case 'home':
      if (!energyHours || parseFloat(energyHours) <= 0) {
        Alert.alert('Error', 'Please enter usage amount');
        return;
      }
      activityId = energyType;
      itemLabel = `${energyType} - ${energyHours} units`;
      break;
      
    case 'shopping':
      if (!itemCount || parseFloat(itemCount) <= 0) {
        Alert.alert('Error', 'Please enter item quantity');
        return;
      }
      activityId = itemType;
      itemLabel = `${itemType} - ${itemCount} item(s)`;
      break;
  }
  
  try {
    // Get the appropriate amount and unit
    let amount, unit;
    
    switch(selectedCategory) {
      case 'transport':
        amount = parseFloat(distance);
        unit = 'km';
        break;
      case 'food':
        amount = parseFloat(mealCount) * 0.3;
        unit = 'kg';
        break;
      case 'home':
        amount = parseFloat(energyHours);
        unit = energyType === 'electricity' ? 'kWh' : 
               energyType === 'gas' ? 'm³' : 'L';
        break;
      case 'shopping':
        amount = parseFloat(itemCount);
        unit = 'item';
        break;
      default:
        throw new Error('Invalid category');
    }
    
    // 🔥 FIX: Pass original input values to EmissionSyncService
    // Let it handle the calculation internally
    const syncResult = await EmissionSyncService.addEmission(
      selectedCategory,
      activityId,
      amount,           // ✅ Original amount (e.g., 2 km)
      { 
        unit: unit,     // ✅ Original unit (e.g., 'km')
        region: 'US',
        description: itemLabel
      }
    );
    
    if (syncResult.success) {
      Alert.alert(
        '✅ Activity Tracked!',
        `${itemLabel}\n\n` +
        `🌍 Emissions: ${syncResult.calculation.emissions.toFixed(2)} ${syncResult.calculation.unit}\n` +
        `📊 Source: ${syncResult.calculation.source}\n` +
        `🎯 Confidence: ${syncResult.calculation.confidence}`,
        [{ text: 'OK', onPress: clearForm }]
      );
      
      // Notify parent component
      if (storeAddEmission) {
        storeAddEmission(syncResult.calculation.emissions, selectedCategory);
      }
    } else {
      throw new Error(syncResult.error);
    }
  } catch (error) {
    console.error('❌ Emission calculation error:', error);
    Alert.alert('Error', 'Failed to calculate emissions: ' + error.message);
  }
};

// Add this at the beginning of handleSubmit:
console.log('DEBUG: Form values:', {
  selectedCategory,
  distance,
  mealCount,
  energyHours,
  itemCount,
  transportMode,
  mealType,
  energyType,
  itemType
});

// NEW FUNCTION ADDED:
const clearForm = () => {
  setDistance('');
  setMealCount('1');
  setEnergyHours('');
  setItemCount('1');
};

  const handleSubmit = async () => {
  // First validate input
  let hasValidInput = false;
  
  switch(selectedCategory) {
    case 'transport':
      hasValidInput = distance && parseFloat(distance) > 0;
      break;
    case 'food':
      hasValidInput = mealCount && parseFloat(mealCount) > 0;
      break;
    case 'home':
      hasValidInput = energyHours && parseFloat(energyHours) > 0;
      break;
    case 'shopping':
      hasValidInput = itemCount && parseFloat(itemCount) > 0;
      break;
  }
  
  if (!hasValidInput) {
    Alert.alert('Error', 'Please enter valid values');
    return;
  }

  try {
    // Call calculateEmissions and wait for it since it's async
    await calculateEmissions();
    // calculateEmissions already handles everything including alerts and clearing form
  } catch (error) {
    console.error('Error submitting emission:', error);
    Alert.alert('Error', 'Failed to track emission. Please try again.');
    console.log('DEBUG: Calculated emissions:', { emissions, description });
  }
  
};


  const inferCategory = (description) => {
    const lower = description.toLowerCase();
    if (lower.includes('drive') || lower.includes('car') || lower.includes('bus') || lower.includes('flight')) {
      return 'transport';
    } else if (lower.includes('food') || lower.includes('meal') || lower.includes('eat')) {
      return 'food';
    } else if (lower.includes('electricity') || lower.includes('gas') || lower.includes('energy')) {
      return 'home';
    } else if (lower.includes('buy') || lower.includes('shop') || lower.includes('purchase')) {
      return 'shopping';
    }
    return 'other';
  };

  const dynamicStyles = createDynamicStyles(theme, isDarkMode);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.statusBarStyle} />
      
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

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.primaryText }]}>Track Activity</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Log your daily carbon emissions</Text>

            {/* ADD THIS BUTTON */}
          <TouchableOpacity 
            style={styles.finderButton}
            onPress={() => setShowFinder(true)}
          >
            <Ionicons name="search-outline" size={20} color="#10B981" />
            <Text style={styles.finderButtonText}>🔍 Find Activity IDs</Text>
          </TouchableOpacity>
          
        </View>

        {/* View Selector */}
        <View style={styles.viewSelector}>
          <TouchableOpacity
            style={[
              styles.viewButton,
              {
                backgroundColor: activeView === 'quick' ? theme.accentText : 'transparent',
                borderColor: theme.accentText,
              }
            ]}
            onPress={() => setActiveView('quick')}
          >
            <Ionicons 
              name="flash-outline" 
              size={20} 
              color={activeView === 'quick' ? '#FFFFFF' : theme.accentText} 
            />
            <Text style={[
              styles.viewButtonText,
              { color: activeView === 'quick' ? '#FFFFFF' : theme.accentText }
            ]}>
              Quick Track
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
  style={[
    styles.viewButton,
    {
      backgroundColor: activeView === 'smart' ? theme.accentText : 'transparent',
      borderColor: theme.accentText,
    }
  ]}
  onPress={() => setActiveView('smart')}
>
  <Ionicons 
    name="sparkles-outline" 
    size={20} 
    color={activeView === 'smart' ? '#FFFFFF' : theme.accentText} 
  />
  <Text style={[
    styles.viewButtonText,
    { color: activeView === 'smart' ? '#FFFFFF' : theme.accentText }
  ]}>
    AI Smart
  </Text>
</TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewButton,
              {
                backgroundColor: activeView === 'calculator' ? theme.accentText : 'transparent',
                borderColor: theme.accentText,
              }
            ]}
            onPress={() => setActiveView('calculator')}
          >
            <Ionicons 
              name="calculator-outline" 
              size={20} 
              color={activeView === 'calculator' ? '#FFFFFF' : theme.accentText} 
            />
            <Text style={[
              styles.viewButtonText,
              { color: activeView === 'calculator' ? '#FFFFFF' : theme.accentText }
            ]}>
              Calculator
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewButton,
              {
                backgroundColor: activeView === 'location' ? theme.accentText : 'transparent',
                borderColor: theme.accentText,
              }
            ]}
            onPress={() => setActiveView('location')}
          >
            <Ionicons 
              name="location-outline" 
              size={20} 
              color={activeView === 'location' ? '#FFFFFF' : theme.accentText} 
            />
            <Text style={[
              styles.viewButtonText,
              { color: activeView === 'location' ? '#FFFFFF' : theme.accentText }
            ]}>
              Location
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Track View */}
        {activeView === 'quick' && (
          <>
            {/* Category selector */}
            <View style={styles.categoryContainer}>
              {['transport', 'food', 'home', 'shopping'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    dynamicStyles.categoryButton,
                    selectedCategory === cat && dynamicStyles.categoryButtonActive
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={styles.categoryIcon}>
                    {cat === 'transport' ? '🚗' :
                     cat === 'food' ? '🍽️' :
                     cat === 'home' ? '🏠' : '🛍️'}
                  </Text>
                  <Text style={[
                    styles.categoryText,
                    { color: selectedCategory === cat ? theme.buttonText : theme.secondaryText }
                  ]}>
                    {cat === 'transport' ? 'Transport' :
                     cat === 'food' ? 'Food' :
                     cat === 'home' ? 'Home' :
                     'Shopping'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* TRANSPORTATION FORM */}
            {selectedCategory === 'transport' && (
              <View style={[dynamicStyles.form]}>
                <Text style={[styles.formTitle, { color: theme.primaryText }]}>Transportation Details</Text>
                
                <Text style={[styles.label, { color: theme.secondaryText }]}>Mode of Transport</Text>
               <View style={styles.optionContainer}>
              {[
                  { key: 'car_petrol', label: 'Car (Petrol)', emoji: '🚗' },
                  { key: 'car_diesel', label: 'Car (Diesel)', emoji: '🚙' },
                  { key: 'car_electric', label: 'Electric Car', emoji: '⚡' },
                  { key: 'bus', label: 'Bus', emoji: '🚌' },
                  { key: 'train', label: 'Train', emoji: '🚆' },
                  { key: 'motorcycle', label: 'Motorcycle', emoji: '🏍️' }
                ].map((mode) => (
                  <TouchableOpacity
                    key={mode.key}
                    style={[
                      dynamicStyles.option,
                      transportMode === mode.key && dynamicStyles.optionActive
                    ]}
                    onPress={() => setTransportMode(mode.key)}
                  >
                    <Text style={styles.optionEmoji}>{mode.emoji}</Text>
                    <Text style={[
                      styles.optionText,
                      { color: transportMode === mode.key ? theme.buttonText : theme.secondaryText }
                    ]}>
                      {mode.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

                <Text style={[styles.label, { color: theme.secondaryText }]}>Distance (km)</Text>
                <TextInput
                  style={[dynamicStyles.input, { color: theme.primaryText }]}
                  placeholder="Enter distance"
                  placeholderTextColor={theme.secondaryText}
                  value={distance}
                  onChangeText={setDistance}
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* FOOD FORM */}
            {selectedCategory === 'food' && (
              <View style={[dynamicStyles.form]}>
                <Text style={[styles.formTitle, { color: theme.primaryText }]}>Food Details</Text>
                
                <Text style={[styles.label, { color: theme.secondaryText }]}>Meal Type</Text>
                <View style={styles.optionContainer}>
                  {[
                    { key: 'meat', label: 'Meat', emoji: '🥩' },
                    { key: 'vegetarian', label: 'Vegetarian', emoji: '🥗' },
                    { key: 'vegan', label: 'Vegan', emoji: '🌱' }
                  ].map((meal) => (
                    <TouchableOpacity
                      key={meal.key}
                      style={[
                        dynamicStyles.option,
                        mealType === meal.key && dynamicStyles.optionActive
                      ]}
                      onPress={() => setMealType(meal.key)}
                    >
                      <Text style={styles.optionEmoji}>{meal.emoji}</Text>
                      <Text style={[
                        styles.optionText,
                        { color: mealType === meal.key ? theme.buttonText : theme.secondaryText }
                      ]}>
                        {meal.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { color: theme.secondaryText }]}>Number of Meals</Text>
                <TextInput
                  style={[dynamicStyles.input, { color: theme.primaryText }]}
                  placeholder="Enter number of meals"
                  placeholderTextColor={theme.secondaryText}
                  value={mealCount}
                  onChangeText={setMealCount}
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* HOME/ENERGY FORM */}
            {selectedCategory === 'home' && (
              <View style={[dynamicStyles.form]}>
                <Text style={[styles.formTitle, { color: theme.primaryText }]}>Home Energy Details</Text>
                
                <Text style={[styles.label, { color: theme.secondaryText }]}>Energy Type</Text>
                <View style={styles.optionContainer}>
                  {[
                    { key: 'electricity', label: 'Electricity', emoji: '⚡' },
                    { key: 'gas', label: 'Natural Gas', emoji: '🔥' },
                    { key: 'oil', label: 'Heating Oil', emoji: '🛢️' }
                  ].map((energy) => (
                    <TouchableOpacity
                      key={energy.key}
                      style={[
                        dynamicStyles.option,
                        energyType === energy.key && dynamicStyles.optionActive
                      ]}
                      onPress={() => setEnergyType(energy.key)}
                    >
                      <Text style={styles.optionEmoji}>{energy.emoji}</Text>
                      <Text style={[
                        styles.optionText,
                        { color: energyType === energy.key ? theme.buttonText : theme.secondaryText }
                      ]}>
                        {energy.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { color: theme.secondaryText }]}>Usage Hours</Text>
                <TextInput
                  style={[dynamicStyles.input, { color: theme.primaryText }]}
                  placeholder="Enter usage hours"
                  placeholderTextColor={theme.secondaryText}
                  value={energyHours}
                  onChangeText={setEnergyHours}
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* SHOPPING FORM */}
            {selectedCategory === 'shopping' && (
              <View style={[dynamicStyles.form]}>
                <Text style={[styles.formTitle, { color: theme.primaryText }]}>Shopping Details</Text>
                
                <Text style={[styles.label, { color: theme.secondaryText }]}>Item Type</Text>
                <View style={styles.optionContainer}>
                  {[
                    { key: 'clothing', label: 'Clothing', emoji: '👕' },
                    { key: 'electronics', label: 'Electronics', emoji: '📱' },
                    { key: 'furniture', label: 'Furniture', emoji: '🪑' },
                    { key: 'groceries', label: 'Groceries', emoji: '🛒' }
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        dynamicStyles.option,
                        itemType === item.key && dynamicStyles.optionActive
                      ]}
                      onPress={() => setItemType(item.key)}
                    >
                      <Text style={styles.optionEmoji}>{item.emoji}</Text>
                      <Text style={[
                        styles.optionText,
                        { color: itemType === item.key ? theme.buttonText : theme.secondaryText }
                      ]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { color: theme.secondaryText }]}>Item Quantity</Text>
                <TextInput
                  style={[dynamicStyles.input, { color: theme.primaryText }]}
                  placeholder="Enter item quantity"
                  placeholderTextColor={theme.secondaryText}
                  value={itemCount}
                  onChangeText={setItemCount}
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity style={[dynamicStyles.submitButton]} onPress={handleSubmit}>
              <Text style={[styles.submitButtonText, { color: theme.buttonText }]}>Track Activity</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Carbon Calculator View */}
        {activeView === 'calculator' && (
          <CarbonCalculator onCalculationComplete={handleCalculationComplete} />
        )}

        {/* Location-Based Trip Tracker View */}
        {activeView === 'location' && (
          <View style={[dynamicStyles.form]}>
            <Text style={[styles.formTitle, { color: theme.primaryText }]}>
              Location-Based Tracking
            </Text>
            <TripTracker onTripComplete={handleTripComplete} />
          </View>
        )}
        {/* Smart Activity Input View */}
        {activeView === 'smart' && (
  <View style={[dynamicStyles.form]}>
    <SmartActivityInput 
      onActivityAdded={(data) => {
        console.log('Smart activity added:', data);
        if (storeAddEmission) {
          storeAddEmission(data.emissions, inferCategory(data.description));
        }
      }}
    />
  </View>
)}

        {/* Info Card */}
        <View style={[dynamicStyles.infoCard]}>
          <Text style={[styles.infoTitle, { color: isDarkMode ? '#F59E0B' : '#92400E' }]}>💡 Did you know?</Text>
          <Text style={[styles.infoText, { color: isDarkMode ? '#FCD34D' : '#78350F' }]}>
            The average person produces about 4 tons of CO₂ per year. 
            Small changes in daily habits can significantly reduce your carbon footprint!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// Create dynamic styles function
const createDynamicStyles = (theme, isDarkMode) => ({
  categoryButton: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : theme.cardBackground,
    marginHorizontal: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : theme.border,
  },
  categoryButtonActive: {
    borderColor: theme.accentText,
    backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : '#D1FAE5',
  },
  form: {
    backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : theme.cardBackground,
    marginHorizontal: 15,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : theme.divider,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 80,
  },
  optionActive: {
    backgroundColor: theme.buttonBackground,
    borderColor: theme.accentText,
  },
  input: {
    backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : theme.divider,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: isDarkMode ? theme.border : 'transparent',
  },
  submitButton: {
    backgroundColor: theme.buttonBackground,
    marginHorizontal: 15,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'transparent',
  },
  infoCard: {
    backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
    marginHorizontal: 15,
    borderRadius: 12,
    padding: 15,
    marginBottom: 30,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'transparent',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    padding: 20,
    paddingTop: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
  },
  viewSelector: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  categoryText: {
    fontSize: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 10,
    fontWeight: '500',
  },
  optionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  optionEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  optionText: {
    fontSize: 14,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});