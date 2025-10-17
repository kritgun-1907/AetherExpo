// src/screens/onboarding/SetupScreen.js - WITH DARK BACKGROUND
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
  ImageBackground,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../api/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const BACKGROUND_IMAGE = require('../../../assets/hero-carbon-tracker.jpg');

export default function SetupScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [userData, setUserData] = useState({
    fullName: '',
    weeklyGoal: '50',
    transportMode: '',
    dietType: '',
    householdSize: '1',
  });

  const transportModes = [
    { id: 'car', label: 'Car', emoji: '🚗', carbonText: '~21g CO₂/km' },
    { id: 'public', label: 'Public Transport', emoji: '🚌', carbonText: '~9g CO₂/km' },
    { id: 'bike', label: 'Bike/Walk', emoji: '🚴', carbonText: '~0g CO₂/km' },
    { id: 'mixed', label: 'Mixed', emoji: '🚗🚌', carbonText: '~15g CO₂/km' },
  ];

  const dietTypes = [
    { id: 'meat', label: 'Meat Lover', emoji: '🥩', carbonText: '~3.3kg CO₂/day' },
    { id: 'balanced', label: 'Balanced', emoji: '🥗', carbonText: '~2.5kg CO₂/day' },
    { id: 'vegetarian', label: 'Vegetarian', emoji: '🥦', carbonText: '~1.7kg CO₂/day' },
    { id: 'vegan', label: 'Vegan', emoji: '🌱', carbonText: '~1.5kg CO₂/day' },
  ];

  const steps = [
    {
      title: "What's your name?",
      subtitle: "Let's get to know you better",
      component: (
        <View style={styles.stepContent}>
          <TextInput
            style={styles.input}
            placeholder="Your full name"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
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
            <Text style={styles.goalValue}>{userData.weeklyGoal}</Text>
            <Text style={styles.goalUnit}>kg CO₂ / week</Text>
          </View>
          
          <View style={styles.goalPresets}>
            {['30', '40', '50', '60', '70'].map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.presetButton,
                  {
                    backgroundColor: userData.weeklyGoal === value 
                      ? '#10B981' 
                      : 'rgba(255, 255, 255, 0.1)',
                  }
                ]}
                onPress={() => setUserData(prev => ({ ...prev, weeklyGoal: value }))}
              >
                <Text style={[
                  styles.presetText,
                  { color: userData.weeklyGoal === value ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)' }
                ]}>
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
                      ? 'rgba(16, 185, 129, 0.2)' 
                      : 'rgba(255, 255, 255, 0.1)',
                    borderColor: userData.transportMode === mode.id ? '#10B981' : 'rgba(255, 255, 255, 0.2)',
                  }
                ]}
                onPress={() => setUserData(prev => ({ ...prev, transportMode: mode.id }))}
              >
                <Text style={styles.optionEmoji}>{mode.emoji}</Text>
                <Text style={styles.optionLabel}>{mode.label}</Text>
                <Text style={styles.optionSubtext}>{mode.carbonText}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ),
      validation: () => userData.transportMode !== '',
    },
    {
      title: "What's your diet?",
      subtitle: "This helps estimate food emissions",
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
                      ? 'rgba(16, 185, 129, 0.2)' 
                      : 'rgba(255, 255, 255, 0.1)',
                    borderColor: userData.dietType === diet.id ? '#10B981' : 'rgba(255, 255, 255, 0.2)',
                  }
                ]}
                onPress={() => setUserData(prev => ({ ...prev, dietType: diet.id }))}
              >
                <Text style={styles.optionEmoji}>{diet.emoji}</Text>
                <Text style={styles.optionLabel}>{diet.label}</Text>
                <Text style={styles.optionSubtext}>{diet.carbonText}</Text>
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
              style={[styles.counterButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
              onPress={() => {
                const current = parseInt(userData.householdSize);
                if (current > 1) {
                  setUserData(prev => ({ ...prev, householdSize: String(current - 1) }));
                }
              }}
            >
              <Ionicons name="remove" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.counterValue}>
              <Text style={styles.counterNumber}>{userData.householdSize}</Text>
              <Text style={styles.counterLabel}>
                {parseInt(userData.householdSize) === 1 ? 'person' : 'people'}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.counterButton, { backgroundColor: '#10B981' }]}
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ImageBackground 
        source={BACKGROUND_IMAGE} 
        resizeMode="cover" 
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
          style={styles.overlay}
        >
          <KeyboardAvoidingView 
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Progress Header */}
            <View style={styles.header}>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { width: `${((currentStep + 1) / steps.length) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  Step {currentStep + 1} of {steps.length}
                </Text>
              </View>
            </View>

            {/* Content */}
            <ScrollView 
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>
                  {steps[currentStep].title}
                </Text>
                <Text style={styles.stepSubtitle}>
                  {steps[currentStep].subtitle}
                </Text>
              </View>

              {steps[currentStep].component}
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.footer}>
              <View style={styles.buttonRow}>
                {currentStep > 0 && (
                  <TouchableOpacity 
                    style={styles.backButton}
                    onPress={handleBack}
                  >
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[
                    styles.nextButton,
                    { 
                      flex: 1,
                      marginLeft: currentStep > 0 ? 12 : 0,
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
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width,
    height,
  },
  overlay: {
    flex: 1,
  },
  keyboardView: {
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 140,
  },
  stepHeader: {
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#FFFFFF',
  },
  stepSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  stepContent: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 18,
    fontSize: 18,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  goalContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  goalValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#10B981',
  },
  goalUnit: {
    fontSize: 18,
    marginTop: 8,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  goalPresets: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  presetButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    fontSize: 44,
    marginBottom: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  optionSubtext: {
    fontSize: 12,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  householdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  counterButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    marginHorizontal: 50,
    alignItems: 'center',
  },
  counterNumber: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#10B981',
  },
  counterLabel: {
    fontSize: 18,
    marginTop: 8,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});