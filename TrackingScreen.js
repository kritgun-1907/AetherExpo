// TrackingScreen.js - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import CarbonCalculator from './src/components/carbon/CarbonCalculator';
import TripTracker from './src/components/carbon/TripTracker';
import EmissionService from './src/services/EmissionService';
import SmartActivityInput from './src/components/carbon/SmartActivityInput';
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
import { supabase } from './src/api/supabase';
import { useTheme } from './src/context/ThemeContext';
import * as Location from 'expo-location';

// Import store conditionally
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

export default function TrackingScreen() {
  const { theme, isDarkMode } = useTheme();
  const { addEmission: storeAddEmission } = useCarbonStore();
  
  const [showFinder, setShowFinder] = useState(false);
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

  // Setup test
  useEffect(() => {
    const testSetup = async () => {
      console.log('=== SETUP TEST ===');
      const { status } = await Location.getForegroundPermissionsAsync();
      console.log('Location permission:', status);
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User authenticated:', !!user);
    };
    
    testSetup();
  }, []);

  // 🔥 FIX: Early return for location view (full screen)
  if (activeView === 'location') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        {/* Floating back button */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 50,
            left: 16,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 25,
            zIndex: 1000,
            gap: 8,
          }}
          onPress={() => setActiveView('quick')}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            Back
          </Text>
        </TouchableOpacity>
        
        {/* Full screen TripTracker */}
        <TripTracker onTripComplete={handleTripComplete} />
      </View>
    );
  }

  // ActivityIdFinder full screen view
  if (showFinder) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
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

  // Handlers
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

  const clearForm = () => {
    setDistance('');
    setMealCount('1');
    setEnergyHours('');
    setItemCount('1');
  };

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
      
      const syncResult = await EmissionSyncService.addEmission(
        selectedCategory,
        activityId,
        amount,
        { 
          unit: unit,
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

  const handleSubmit = async () => {
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
      await calculateEmissions();
    } catch (error) {
      console.error('Error submitting emission:', error);
      Alert.alert('Error', 'Failed to track emission. Please try again.');
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

  // Main render (Quick Track, Smart, Calculator views)
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
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            Log your daily carbon emissions
          </Text>

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
                <Text style={[styles.formTitle, { color: theme.primaryText }]}>
                  Transportation Details
                </Text>
                
                <Text style={[styles.label, { color: theme.secondaryText }]}>
                  Mode of Transport
                </Text>
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

                <Text style={[styles.label, { color: theme.secondaryText }]}>
                  Distance (km)
                </Text>
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
                <Text style={[styles.formTitle, { color: theme.primaryText }]}>
                  Food Details
                </Text>
                
                <Text style={[styles.label, { color: theme.secondaryText }]}>
                  Meal Type
                </Text>
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

                <Text style={[styles.label, { color: theme.secondaryText }]}>
                  Number of Meals
                </Text>
                <TextInput
                  style={[dynamicStyles.input, { color: theme.primaryText }]}
                  placeholder="Enter meal count"
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
                <Text style={[styles.formTitle, { color: theme.primaryText }]}>
                  Energy Details
                </Text>
                
                <Text style={[styles.label, { color: theme.secondaryText }]}>
                  Energy Type
                </Text>
                <View style={styles.optionContainer}>
                  {[
                    { key: 'electricity', label: 'Electricity', emoji: '⚡' },
                    { key: 'gas', label: 'Natural Gas', emoji: '🔥' },
                    { key: 'water', label: 'Water', emoji: '💧' }
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

                <Text style={[styles.label, { color: theme.secondaryText }]}>
                  Usage Amount
                </Text>
                <TextInput
                  style={[dynamicStyles.input, { color: theme.primaryText }]}
                  placeholder="Enter usage hours/units"
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
                <Text style={[styles.formTitle, { color: theme.primaryText }]}>
                  Shopping Details
                </Text>
                
                <Text style={[styles.label, { color: theme.secondaryText }]}>
                  Item Type
                </Text>
                <View style={styles.optionContainer}>
                  {[
                    { key: 'clothing', label: 'Clothing', emoji: '👕' },
                    { key: 'electronics', label: 'Electronics', emoji: '📱' },
                    { key: 'furniture', label: 'Furniture', emoji: '🛋️' }
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

                <Text style={[styles.label, { color: theme.secondaryText }]}>
                  Item Quantity
                </Text>
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
            <TouchableOpacity 
              style={[dynamicStyles.submitButton]} 
              onPress={handleSubmit}
            >
              <Text style={[styles.submitButtonText, { color: theme.buttonText }]}>
                Track Activity
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Carbon Calculator View */}
        {activeView === 'calculator' && (
          <CarbonCalculator onCalculationComplete={handleCalculationComplete} />
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
          <Text style={[styles.infoTitle, { color: isDarkMode ? '#F59E0B' : '#92400E' }]}>
            💡 Did you know?
          </Text>
          <Text style={[styles.infoText, { color: isDarkMode ? '#FCD34D' : '#78350F' }]}>
            The average person produces about 4 tons of CO₂ per year. 
            Small changes in daily habits can significantly reduce your carbon footprint!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// Dynamic styles function
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
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : theme.border,
  },
  option: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.3)' : theme.divider,
    borderRadius: 10,
    padding: 12,
    margin: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : theme.border,
  },
  optionActive: {
    backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : '#D1FAE5',
    borderColor: theme.accentText,
  },
  input: {
    backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : theme.divider,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : theme.border,
  },
  submitButton: {
    backgroundColor: theme.buttonBackground,
    borderRadius: 15,
    padding: 18,
    marginHorizontal: 15,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: isDarkMode ? 'transparent' : theme.accentText,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0 : 0.3,
    shadowRadius: 8,
    elevation: isDarkMode ? 0 : 8,
  },
  infoCard: {
    backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : '#FCD34D',
  },
});

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
  },
  finderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 15,
    alignSelf: 'flex-start',
    gap: 8,
  },
  finderButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    zIndex: 1000,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  viewSelector: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
    gap: 8,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  categoryIcon: {
    fontSize: 30,
    marginBottom: 5,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
  },
  optionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  optionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});