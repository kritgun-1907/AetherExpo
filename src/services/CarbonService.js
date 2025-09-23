// src/services/CarbonService.js
import { calculateRealEmissions } from '../api/climatiq';
import { supabase } from '../api/supabase';

export const calculateCarbonFootprint = async (activity, value, unit = 'km') => {
  try {
    // Try real API first
    const emissions = await calculateRealEmissions(activity, value);
    if (emissions) return emissions;
    
    // Fallback to local calculations
    const factors = {
      'transport.car': 0.21,
      'transport.bus': 0.089,
      'transport.train': 0.041,
      'food.meat': 6.61,
      'food.vegetarian': 1.43,
      'energy.electricity': 0.23,
    };
    
    return value * (factors[activity] || 0.1);
  } catch (error) {
    console.error('Carbon calculation error:', error);
    return value * 0.1;
  }
};

export const getWeeklyTrend = async (userId) => {
  const { data } = await supabase
    .from('emissions')
    .select('amount, created_at')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  
  return data || [];
};