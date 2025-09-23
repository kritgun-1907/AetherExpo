// src/store/carbonStore.js - FIXED VERSION
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create the store with proper error handling
export const useCarbonStore = create((set, get) => ({
  // State
  dailyEmissions: 0,
  weeklyEmissions: 0,
  monthlyEmissions: 0,
  weeklyGoal: 50,
  achievements: [],
  tokens: 0,
  streak: 0,
  isLoading: false,
  error: null,
  
  // Actions
  addEmission: (amount, category) => {
    try {
      set(state => {
        const newState = {
          dailyEmissions: state.dailyEmissions + amount,
          weeklyEmissions: state.weeklyEmissions + amount,
          monthlyEmissions: state.monthlyEmissions + amount,
        };
        
        // Save to AsyncStorage asynchronously
        const fullStateToSave = { ...state, ...newState };
        AsyncStorage.setItem('carbonData', JSON.stringify(fullStateToSave))
          .catch(error => {
            console.error('Failed to save carbon data:', error);
            set({ error: 'Failed to save data' });
          });
        
        return newState;
      });
      
      // Check achievements after state update
      setTimeout(() => {
        try {
          get().checkAchievements();
        } catch (error) {
          console.error('Achievement check failed:', error);
        }
      }, 100);
    } catch (error) {
      console.error('Add emission failed:', error);
      set({ error: 'Failed to add emission' });
    }
  },
  
  earnTokens: (amount) => {
    try {
      set(state => ({
        tokens: state.tokens + amount,
        error: null
      }));
    } catch (error) {
      console.error('Earn tokens failed:', error);
      set({ error: 'Failed to earn tokens' });
    }
  },
  
  updateStreak: () => {
    try {
      set(state => ({
        streak: state.streak + 1,
        error: null
      }));
    } catch (error) {
      console.error('Update streak failed:', error);
      set({ error: 'Failed to update streak' });
    }
  },
  
  checkAchievements: () => {
    try {
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
          achievements: [...state.achievements, ...newAchievements],
          tokens: state.tokens + (newAchievements.length * 10), // Bonus tokens
          error: null
        }));
      }
    } catch (error) {
      console.error('Check achievements failed:', error);
      set({ error: 'Failed to check achievements' });
    }
  },
  
  loadFromStorage: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await AsyncStorage.getItem('carbonData');
      
      if (data) {
        const parsedData = JSON.parse(data);
        set({ ...parsedData, isLoading: false, error: null });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load carbon data:', error);
      set({ 
        isLoading: false, 
        error: 'Failed to load saved data' 
      });
    }
  },
  
  clearError: () => {
    set({ error: null });
  },
  
  // Reset functions for testing
  resetDailyEmissions: () => {
    try {
      set({ dailyEmissions: 0, error: null });
    } catch (error) {
      console.error('Reset daily emissions failed:', error);
      set({ error: 'Failed to reset daily emissions' });
    }
  },
  
  resetAllData: async () => {
    try {
      set({
        dailyEmissions: 0,
        weeklyEmissions: 0,
        monthlyEmissions: 0,
        achievements: [],
        tokens: 0,
        streak: 0,
        error: null,
        isLoading: false
      });
      await AsyncStorage.removeItem('carbonData');
    } catch (error) {
      console.error('Reset all data failed:', error);
      set({ error: 'Failed to reset data' });
    }
  }
}));

// Initialize store data on app start
export const initializeStore = async () => {
  try {
    const store = useCarbonStore.getState();
    await store.loadFromStorage();
  } catch (error) {
    console.error('Store initialization failed:', error);
  }
};