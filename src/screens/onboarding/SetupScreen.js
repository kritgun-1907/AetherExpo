// src/screens/onboarding/SetupScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../api/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SetupScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // User profile data
  const [userData, setUserData] = useState({
    fullName: '',
    weeklyGoal: '50',
    transportMode: '',
    dietType: '',
    householdSize: '1',
  });

  const transportModes = [
    { id: 'car', label: 'Car', emoji: '🚗', carbonFactor: 0.21 },
    { id: 'public', label: 'Public Transport', emoji: '🚌', carbonFactor: 0.089 },
    { id: 'bike', label: 'Bike/Walk', emoji: '🚴', carbonFactor: 0 },
    { id: 'mixed', label: 'Mixed', emoji: '🚗🚌', carbonFactor: 0.15 },
  ];

  const dietTypes = [
    { id: 'meat', label: 'Meat Lover', emoji: '🥩', carbonFactor: 3.3 },
    { id: 'balanced', label: 'Balanced', emoji: '🥗', carbonFactor: 2.5 },
    { id: 'vegetarian', label: 'Vegetarian', emoji: '🥦', carbonFactor: 1.7 },
    { id: 'vegan', label: 'Vegan', emoji: '🌱', carbonFactor: 1.5 },
  ];

  const steps = [
    {
      title: "What's your name?",
      subtitle: "Let's get to know you better",
      component: (
        <View style={styles.stepContent}>
          <TextInput
            style={[styles.input, { 
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.divider,
              color: theme.primaryText,
              borderColor: theme.border,
            }]}
            placeholder="Your full name"
            placeholderTextColor={theme.secondaryText}
            value={userData.fullName}
            onChangeText={(text) => setUserData(prev => ({ ...prev, fullName: text }))}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>
      ),
      validation: () => userData.fullName.trim().length > 0,
    },
    {
      title: "Set your weekly CO₂ goal",
      subtitle: "Average is 50kg per week",
      component: (
        <View style={styles.stepContent}>
          <View style={styles.goalContainer}>
            <Text style={[styles.goalValue, { color: theme.accentText }]}>
              {userData.weeklyGoal}
            </Text>
            <Text style={[styles.goalUnit, { color: theme.secondaryText }]}>
              kg CO₂ / week
            </Text>
          </View>
          
          <View style={styles.goalPresets}>
            {['30', '40', '50', '60', '70'].map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.presetButton,
                  {
                    backgroundColor: userData.weeklyGoal === value 
                      ? theme.accentText 
                      : isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.divider,
                  }
                ]}
                onPress={() => setUserData(prev => ({ ...prev, weeklyGoal: value }))}
              >
                <Text style={[
                  styles.presetText,
                  { 
                    color: userData.weeklyGoal === value 
                      ? '#FFFFFF' 
                      : theme.primaryText 
                  }
                ]}>
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TextInput
            style={[styles.input, { 
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.divider,
              color: theme.primaryText,
              borderColor: theme.border,
              marginTop: 20,
            }]}
            placeholder="Or enter custom goal"
            placeholderTextColor={theme.secondaryText}
            value={userData.weeklyGoal}
            onChangeText={(text) => setUserData(prev => ({ ...prev, weeklyGoal: text }))}
            keyboardType="numeric"
          />
        </View>
      ),
      validation: () => parseInt(userData.weeklyGoal) > 0,
    },
    {
      title: "Primary transport mode",
      subtitle: "How do you usually get around?",
      component: (
        <View style={styles.stepContent}>
          <View style={styles.optionsGrid}>
            {transportModes.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: userData.transportMode === mode.id 
                      ? theme.accentText 
                      : isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
                    borderColor: userData.transportMode === mode.id 
                      ? theme.accentText 
                      : theme.border,
                  }
                ]}
                onPress={() => setUserData(prev => ({ ...prev, transportMode: mode.id }))}
              >
                <Text style={styles.optionEmoji}>{mode.emoji}</Text>
                <Text style={[
                  styles.optionLabel,
                  { 
                    color: userData.transportMode === mode.id 
                      ? '#FFFFFF' 
                      : theme.primaryText 
                  }
                ]}>
                  {mode.label}
                </Text>
                <Text style={[
                  styles.optionSubtext,
                  { 
                    color: userData.transportMode === mode.id 
                      ? 'rgba(255, 255, 255, 0.8)' 
                      : theme.secondaryText 
                  }
                ]}>
                  ~{(mode.carbonFactor * 100).toFixed(0)}g CO₂/km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ),
      validation: () => userData.transportMode !== '',
    },
    {
      title: "Your diet preference",
      subtitle: "Food choices impact carbon footprint",
      component: (
        <View style={styles.stepContent}>
          <View style={styles.optionsGrid}>
            {dietTypes.map((diet) => (
              <TouchableOpacity
                key={diet.id}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: userData.dietType === diet.id 
                      ? theme.accentText 
                      : isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
                    borderColor: userData.dietType === diet.id 
                      ? theme.accentText 
                      : theme.border,
                  }
                ]}
                onPress={() => setUserData(prev => ({ ...prev, dietType: diet.id }))}
              >
                <Text style={styles.optionEmoji}>{diet.emoji}</Text>
                <Text style={[
                  styles.optionLabel,
                  { 
                    color: userData.dietType === diet.id 
                      ? '#FFFFFF' 
                      : theme.primaryText 
                  }
                ]}>
                  {diet.label}
                </Text>
                <Text style={[
                  styles.optionSubtext,
                  { 
                    color: userData.dietType === diet.id 
                      ? 'rgba(255, 255, 255, 0.8)' 
                      : theme.secondaryText 
                  }
                ]}>
                  ~{diet.carbonFactor}kg CO₂/day
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ),
      validation: () => userData.dietType !== '',
    },
    {
      title: "Household size",
      subtitle: "Helps calculate per-person emissions",
      component: (
        <View style={styles.stepContent}>
          <View style={styles.householdContainer}>
            <TouchableOpacity
              style={[styles.counterButton, { backgroundColor: theme.divider }]}
              onPress={() => {
                const current = parseInt(userData.householdSize);
                if (current > 1) {
                  setUserData(prev => ({ ...prev, householdSize: String(current - 1) }));
                }
              }}
            >
              <Ionicons name="remove" size={24} color={theme.primaryText} />
            </TouchableOpacity>
            
            <View style={styles.counterValue}>
              <Text style={[styles.counterNumber, { color: theme.primaryText }]}>
                {userData.householdSize}
              </Text>
              <Text style={[styles.counterLabel, { color: theme.secondaryText }]}>
                {parseInt(userData.householdSize) === 1 ? 'person' : 'people'}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.counterButton, { backgroundColor: theme.accentText }]}
              onPress={() => {
                const current = parseInt(userData.householdSize);
                if (current < 10) {
                  setUserData(prev => ({ ...prev, householdSize: String(current + 1) }));
                }
              }}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      ),
      validation: () => parseInt(userData.householdSize) > 0,
    },
  ];

  const handleNext = () => {
    if (steps[currentStep].validation()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleComplete();
      }
    } else {
      Alert.alert('Missing Information', 'Please complete this step before continuing.');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Update user profile
        await supabase
          .from('user_profiles')
          .update({
            full_name: userData.fullName,
            weekly_goal: parseInt(userData.weeklyGoal),
            preferences: {
              transport_mode: userData.transportMode,
              diet_type: userData.dietType,
              household_size: parseInt(userData.householdSize),
            },
            onboarding_completed: true,
          })
          .eq('id', user.id);
      }
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('setupComplete', 'true');
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      Alert.alert(
        'Setup Complete!',
        "You're all set to start tracking your carbon footprint!",
        [{ text: 'Let\'s Go!', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      console.error('Setup error:', error);
      Alert.alert('Error', 'Failed to save your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.background} 
      />
      
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.divider }]}>
            <View 
              style={[
                styles.progressFill,
                { 
                  backgroundColor: theme.accentText,
                  width: `${((currentStep + 1) / steps.length) * 100}%`
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: theme.secondaryText }]}>
            Step {currentStep + 1} of {steps.length}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: theme.primaryText }]}>
            {steps[currentStep].title}
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.secondaryText }]}>
            {steps[currentStep].subtitle}
          </Text>
        </View>

        {steps[currentStep].component}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.background }]}>
        <View style={styles.buttonRow}>
          {currentStep > 0 && (
            <TouchableOpacity 
              style={[styles.backButton, { borderColor: theme.border }]}
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={24} color={theme.primaryText} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[
              styles.nextButton,
              { 
                backgroundColor: theme.accentText,
                flex: currentStep === 0 ? 1 : undefined,
                marginLeft: currentStep > 0 ? 10 : 0,
              }
            ]}
            onPress={handleNext}
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>
              {loading ? 'Saving...' : currentStep === steps.length - 1 ? 'Complete Setup' : 'Continue'}
            </Text>
            {!loading && currentStep < steps.length - 1 && (
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  stepHeader: {
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  stepContent: {
    marginBottom: 20,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  goalContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  goalValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  goalUnit: {
    fontSize: 16,
    marginTop: 5,
  },
  goalPresets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  presetButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  presetText: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionCard: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 2,
  },
  optionEmoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  optionSubtext: {
    fontSize: 11,
    textAlign: 'center',
  },
  householdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  counterButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    marginHorizontal: 40,
    alignItems: 'center',
  },
  counterNumber: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  counterLabel: {
    fontSize: 16,
    marginTop: 5,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});