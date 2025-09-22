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
    set(state => ({
      dailyEmissions: state.dailyEmissions + amount,
      weeklyEmissions: state.weeklyEmissions + amount,
      monthlyEmissions: state.monthlyEmissions + amount
    }));
    
    // Save to storage
    get().saveToStorage();
    
    // Check for achievements
    get().checkAchievements();
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
    const { dailyEmissions, weeklyEmissions } = get();
    const newAchievements = [];
    
    if (dailyEmissions < 10) {
      newAchievements.push({
        name: 'Eco Warrior',
        description: 'Kept daily emissions under 10kg',
        emoji: '🌟'
      });
    }
    
    if (weeklyEmissions < 50) {
      newAchievements.push({
        name: 'Green Week',
        description: 'Stayed under weekly goal',
        emoji: '🌱'
      });
    }
    
    set(state => ({
      achievements: [...state.achievements, ...newAchievements]
    }));
  },
  
  saveToStorage: async () => {
    const state = get();
    await AsyncStorage.setItem('carbonData', JSON.stringify(state));
  },
  
  loadFromStorage: async () => {
    const data = await AsyncStorage.getItem('carbonData');
    if (data) {
      set(JSON.parse(data));
    }
  }
}));