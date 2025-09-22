// src/services/AchievementService.js
import { supabase } from '../api/supabase';

export const checkAchievements = async (userId, emissions, streak) => {
  const newAchievements = [];
  
  // Check emission-based achievements
  if (emissions < 5) {
    newAchievements.push({
      id: 'eco_champion',
      name: 'Eco Champion',
      description: 'Daily emissions under 5kg',
      emoji: '🌟',
      tokens: 10
    });
  }
  
  if (emissions === 0) {
    newAchievements.push({
      id: 'zero_hero',
      name: 'Zero Hero',
      description: 'No emissions for a day',
      emoji: '🦸',
      tokens: 20
    });
  }
  
  // Check streak achievements
  if (streak >= 7) {
    newAchievements.push({
      id: 'week_warrior',
      name: 'Week Warrior',
      description: '7 day tracking streak',
      emoji: '🔥',
      tokens: 25
    });
  }
  
  // Save to database
  for (const achievement of newAchievements) {
    await supabase
      .from('achievements')
      .upsert({
        user_id: userId,
        ...achievement
      });
  }
  
  return newAchievements;
};

export const getUserAchievements = async (userId) => {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', userId);
    
  return data || [];
};