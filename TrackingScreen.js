// TrackingScreen.js - Complete Updated Version with Theme Support

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,        // 🔥 STEP 1: Add StatusBar import
  ImageBackground,  // 🔥 STEP 2: Add ImageBackground import
} from 'react-native';
import { supabase, addEmission } from './src/api/supabase';
import { useCarbonStore } from './src/store/carbonStore';

// 🔥 STEP 3: Import theme hook
import { useTheme } from './src/context/ThemeContext';

// 🔥 STEP 4: Add background image import
const BACKGROUND_IMAGE = require('./assets/hero-carbon-tracker.jpg');

export default function TrackingScreen() {
  // 🔥 STEP 5: Get theme data
  const { theme, isDarkMode } = useTheme();
  const { addEmission: storeAddEmission } = useCarbonStore();
  const [selectedCategory, setSelectedCategory] = useState('transport');
  
  // Transport state
  const [transportMode, setTransportMode] = useState('car');
  const [distance, setDistance] = useState('');
  
  // Food state
  const [mealType, setMealType] = useState('vegetarian');
  const [mealCount, setMealCount] = useState('1');
  
  // Home state
  const [energyType, setEnergyType] = useState('electricity');
  const [energyHours, setEnergyHours] = useState('');
  
  // Shopping state
  const [itemType, setItemType] = useState('clothing');
  const [itemCount, setItemCount] = useState('1');

  const calculateEmissions = () => {
    let emissions = 0;
    let description = '';

    switch(selectedCategory) {
      case 'transport':
        const transportFactors = {
          car: 0.21,
          bus: 0.089,
          train: 0.041,
          bike: 0,
          walk: 0
        };
        emissions = parseFloat(distance || 0) * transportFactors[transportMode];
        description = `${distance}km by ${transportMode}`;
        break;
        
      case 'food':
        const foodFactors = {
          meat: 6.61,
          vegetarian: 1.43,
          vegan: 0.89
        };
        emissions = parseFloat(mealCount || 0) * foodFactors[mealType];
        description = `${mealCount} ${mealType} meal(s)`;
        break;
        
      case 'home':
        const energyFactors = {
          electricity: 0.23,
          gas: 0.18,
          oil: 0.27
        };
        emissions = parseFloat(energyHours || 0) * energyFactors[energyType];
        description = `${energyHours} hours of ${energyType}`;
        break;
        
      case 'shopping':
        const shoppingFactors = {
          clothing: 5.5,
          electronics: 12.4,
          furniture: 8.2,
          groceries: 2.1
        };
        emissions = parseFloat(itemCount || 0) * shoppingFactors[itemType];
        description = `${itemCount} ${itemType} item(s)`;
        break;
    }

    return { emissions, description };
  };

  const handleSubmit = async () => {
    const { emissions, description } = calculateEmissions();
    
    if (emissions <= 0) {
      Alert.alert('Error', 'Please enter valid values');
      return;
    }

    // Add to local store
    storeAddEmission(emissions, selectedCategory);

    // Add to database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await addEmission(user.id, selectedCategory, emissions);
    }

    Alert.alert(
      'Activity Tracked!',
      `You added ${emissions.toFixed(2)}kg CO₂e\n${description}`,
      [{ text: 'OK', onPress: clearForm }]
    );
  };

  const clearForm = () => {
    setDistance('');
    setEnergyHours('');
    setMealCount('1');
    setItemCount('1');
  };

  // 🔥 STEP 6: Create dynamic styles based on theme
  const dynamicStyles = createDynamicStyles(theme, isDarkMode);

  return (
    // 🔥 STEP 7: Use theme background color
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 🔥 STEP 8: Theme-aware status bar */}
      <StatusBar barStyle={theme.statusBarStyle} />
      
      {/* 🔥 STEP 9: Background image only in dark mode */}
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
          {/* 🔥 STEP 10: Theme-aware text colors */}
          <Text style={[styles.title, { color: theme.primaryText }]}>Track Activity</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Log your daily carbon emissions</Text>
        </View>

        {/* 🔥 STEP 11: Theme-aware category selector */}
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
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 🔥 STEP 12: Transport Form with theme colors */}
        {selectedCategory === 'transport' && (
          <View style={[dynamicStyles.form]}>
            <Text style={[styles.formTitle, { color: theme.primaryText }]}>Transportation Details</Text>
            
            <Text style={[styles.label, { color: theme.secondaryText }]}>Mode of Transport</Text>
            <View style={styles.optionContainer}>
              {['car', 'bus', 'train', 'bike', 'walk'].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    dynamicStyles.option,
                    transportMode === mode && dynamicStyles.optionActive
                  ]}
                  onPress={() => setTransportMode(mode)}
                >
                  <Text style={[
                    styles.optionText,
                    { color: transportMode === mode ? theme.buttonText : theme.secondaryText }
                  ]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
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

        {/* 🔥 STEP 13: Food Form with theme colors */}
        {selectedCategory === 'food' && (
          <View style={[dynamicStyles.form]}>
            <Text style={[styles.formTitle, { color: theme.primaryText }]}>Food Details</Text>
            
            <Text style={[styles.label, { color: theme.secondaryText }]}>Meal Type</Text>
            <View style={styles.optionContainer}>
              {['meat', 'vegetarian', 'vegan'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    dynamicStyles.option,
                    mealType === type && dynamicStyles.optionActive
                  ]}
                  onPress={() => setMealType(type)}
                >
                  <Text style={[
                    styles.optionText,
                    { color: mealType === type ? theme.buttonText : theme.secondaryText }
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
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

        {/* 🔥 STEP 14: Home Form with theme colors */}
        {selectedCategory === 'home' && (
          <View style={[dynamicStyles.form]}>
            <Text style={[styles.formTitle, { color: theme.primaryText }]}>Home Energy Details</Text>
            
            <Text style={[styles.label, { color: theme.secondaryText }]}>Energy Type</Text>
            <View style={styles.optionContainer}>
              {['electricity', 'gas', 'oil'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    dynamicStyles.option,
                    energyType === type && dynamicStyles.optionActive
                  ]}
                  onPress={() => setEnergyType(type)}
                >
                  <Text style={[
                    styles.optionText,
                    { color: energyType === type ? theme.buttonText : theme.secondaryText }
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: theme.secondaryText }]}>Hours of Usage</Text>
            <TextInput
              style={[dynamicStyles.input, { color: theme.primaryText }]}
              placeholder="Enter hours"
              placeholderTextColor={theme.secondaryText}
              value={energyHours}
              onChangeText={setEnergyHours}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* 🔥 STEP 15: Shopping Form with theme colors */}
        {selectedCategory === 'shopping' && (
          <View style={[dynamicStyles.form]}>
            <Text style={[styles.formTitle, { color: theme.primaryText }]}>Shopping Details</Text>
            
            <Text style={[styles.label, { color: theme.secondaryText }]}>Item Type</Text>
            <View style={styles.optionContainer}>
              {['clothing', 'electronics', 'furniture', 'groceries'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    dynamicStyles.option,
                    itemType === type && dynamicStyles.optionActive
                  ]}
                  onPress={() => setItemType(type)}
                >
                  <Text style={[
                    styles.optionText,
                    { color: itemType === type ? theme.buttonText : theme.secondaryText }
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: theme.secondaryText }]}>Number of Items</Text>
            <TextInput
              style={[dynamicStyles.input, { color: theme.primaryText }]}
              placeholder="Enter number of items"
              placeholderTextColor={theme.secondaryText}
              value={itemCount}
              onChangeText={setItemCount}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* 🔥 STEP 16: Theme-aware submit button */}
        <TouchableOpacity style={[dynamicStyles.submitButton]} onPress={handleSubmit}>
          <Text style={[styles.submitButtonText, { color: theme.buttonText }]}>Track Activity</Text>
        </TouchableOpacity>

        {/* 🔥 STEP 17: Theme-aware info card */}
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

// 🔥 STEP 18: Create dynamic styles function
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
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : theme.divider,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
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

// 🔥 STEP 19: Update base styles (remove hardcoded colors)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor removed - now using theme
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
    // color removed - now using theme
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
    // color removed - now using theme
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
    // color removed - now using theme
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    // color removed - now using theme
  },
  label: {
    fontSize: 14,
    marginBottom: 10,
    fontWeight: '500',
    // color removed - now using theme
  },
  optionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  optionText: {
    fontSize: 14,
    // color removed - now using theme
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    // color removed - now using theme
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    // color removed - now using theme
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    // color removed - now using theme
  },
});