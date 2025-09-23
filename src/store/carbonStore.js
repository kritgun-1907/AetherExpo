// src/store/carbonStore.js - FIXED VERSION
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useCarbonStore = create((set, get) => ({
  // State
  dailyEmissions: 0,
  weeklyEmissions: 0,
  monthlyEmissions: 0,
  weeklyGoal: 50,
  achievements: [],
  tokens: 0,
  streak: 0,
  
  // Actions
  addEmission: (amount, category) => {
    set(state => {
      const newState = {
        dailyEmissions: state.dailyEmissions + amount,
        weeklyEmissions: state.weeklyEmissions + amount,
        monthlyEmissions: state.monthlyEmissions + amount,
      };
      
      // Save to AsyncStorage in background
      const fullStateToSave = { ...state, ...newState };
      AsyncStorage.setItem('carbonData', JSON.stringify(fullStateToSave))
        .catch(error => console.error('Failed to save carbon data:', error));
      
      return newState;
    });
    
    // Check achievements after state update
    setTimeout(() => {
      get().checkAchievements();
    }, 0);
  },
  
  earnTokens: (amount) => {
    set(state => ({
      tokens: state.tokens + amount
    }));
  },
  
  updateStreak: () => {
    set(state => ({
      streak: state.streak + 1
    }));
  },
  
  checkAchievements: () => {
    const state = get();
    const { dailyEmissions, weeklyEmissions, achievements } = state;
    const newAchievements = [];
    
    // Check if achievement already exists
    const hasAchievement = (id) => achievements.some(ach => ach.id === id);
    
    if (dailyEmissions < 10 && !hasAchievement('eco_warrior')) {
      newAchievements.push({
        id: 'eco_warrior',
        name: 'Eco Warrior',
        description: 'Kept daily emissions under 10kg',
        emoji: '🌟'
      });
    }
    
    if (weeklyEmissions < 50 && !hasAchievement('green_week')) {
      newAchievements.push({
        id: 'green_week',
        name: 'Green Week',
        description: 'Stayed under weekly goal',
        emoji: '🌱'
      });
    }
    
    if (newAchievements.length > 0) {
      set(state => ({
        achievements: [...state.achievements, ...newAchievements]
      }));
    }
  },
  
  loadFromStorage: async () => {
    try {
      const data = await AsyncStorage.getItem('carbonData');
      if (data) {
        const parsedData = JSON.parse(data);
        set(parsedData);
      }
    } catch (error) {
      console.error('Failed to load carbon data:', error);
    }
  },
  
  // Reset functions for testing
  resetDailyEmissions: () => {
    set({ dailyEmissions: 0 });
  },
  
  resetAllData: () => {
    set({
      dailyEmissions: 0,
      weeklyEmissions: 0,
      monthlyEmissions: 0,
      achievements: [],
      tokens: 0,
      streak: 0,
    });
    AsyncStorage.removeItem('carbonData');
  }
}));