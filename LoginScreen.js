import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import { supabase, addEmission } from './src/api/supabase';
import { useCarbonStore } from './src/store/carbonStore';

export default function TrackingScreen() {
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Track Activity</Text>
        <Text style={styles.subtitle}>Log your daily carbon emissions</Text>
      </View>

      {/* Category Selector */}
      <View style={styles.categoryContainer}>
        {['transport', 'food', 'home', 'shopping'].map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryButton,
              selectedCategory === cat && styles.categoryButtonActive
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
              selectedCategory === cat && styles.categoryTextActive
            ]}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transport Form */}
      {selectedCategory === 'transport' && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Transportation Details</Text>
          
          <Text style={styles.label}>Mode of Transport</Text>
          <View style={styles.optionContainer}>
            {['car', 'bus', 'train', 'bike', 'walk'].map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.option,
                  transportMode === mode && styles.optionActive
                ]}
                onPress={() => setTransportMode(mode)}
              >
                <Text style={[
                  styles.optionText,
                  transportMode === mode && styles.optionTextActive
                ]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Distance (km)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter distance"
            placeholderTextColor="#9CA3AF"
            value={distance}
            onChangeText={setDistance}
            keyboardType="numeric"
          />
        </View>
      )}

      {/* Food Form */}
      {selectedCategory === 'food' && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Food Details</Text>
          
          <Text style={styles.label}>Meal Type</Text>
          <View style={styles.optionContainer}>
            {['meat', 'vegetarian', 'vegan'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.option,
                  mealType === type && styles.optionActive
                ]}
                onPress={() => setMealType(type)}
              >
                <Text style={[
                  styles.optionText,
                  mealType === type && styles.optionTextActive
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Number of Meals</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter number of meals"
            placeholderTextColor="#9CA3AF"
            value={mealCount}
            onChangeText={setMealCount}
            keyboardType="numeric"
          />
        </View>
      )}

      {/* Home Form */}
      {selectedCategory === 'home' && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Home Energy Details</Text>
          
          <Text style={styles.label}>Energy Type</Text>
          <View style={styles.optionContainer}>
            {['electricity', 'gas', 'oil'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.option,
                  energyType === type && styles.optionActive
                ]}
                onPress={() => setEnergyType(type)}
              >
                <Text style={[
                  styles.optionText,
                  energyType === type && styles.optionTextActive
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Hours of Usage</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter hours"
            placeholderTextColor="#9CA3AF"
            value={energyHours}
            onChangeText={setEnergyHours}
            keyboardType="numeric"
          />
        </View>
      )}

      {/* Shopping Form */}
      {selectedCategory === 'shopping' && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Shopping Details</Text>
          
          <Text style={styles.label}>Item Type</Text>
          <View style={styles.optionContainer}>
            {['clothing', 'electronics', 'furniture', 'groceries'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.option,
                  itemType === type && styles.optionActive
                ]}
                onPress={() => setItemType(type)}
              >
                <Text style={[
                  styles.optionText,
                  itemType === type && styles.optionTextActive
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Number of Items</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter number of items"
            placeholderTextColor="#9CA3AF"
            value={itemCount}
            onChangeText={setItemCount}
            keyboardType="numeric"
          />
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Track Activity</Text>
      </TouchableOpacity>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💡 Did you know?</Text>
        <Text style={styles.infoText}>
          The average person produces about 4 tons of CO₂ per year. 
          Small changes in daily habits can significantly reduce your carbon footprint!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4'
  },
  header: {
    padding: 20,
    paddingTop: 60
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#065F46'
  },
  subtitle: {
    fontSize: 16,
    color: '#047857',
    marginTop: 5
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 20
  },
  categoryButton: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    marginHorizontal: 5,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  categoryButtonActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4'
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 5
  },
  categoryText: {
    fontSize: 12,
    color: '#6B7280'
  },
  categoryTextActive: {
    color: '#10B981',
    fontWeight: '600'
  },
  form: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 10,
    fontWeight: '500'
  },
  optionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20
  },
  option: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10
  },
  optionActive: {
    backgroundColor: '#10B981'
  },
  optionText: {
    color: '#6B7280',
    fontSize: 14
  },
  optionTextActive: {
    color: 'white',
    fontWeight: '500'
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#111827'
  },
  submitButton: {
    backgroundColor: '#10B981',
    marginHorizontal: 15,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  },
  infoCard: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 15,
    borderRadius: 12,
    padding: 15,
    marginBottom: 30
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8
  },
  infoText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20
  }
});