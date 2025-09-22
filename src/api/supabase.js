import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your actual Supabase credentials
const SUPABASE_URL = 'https://aihxzodhpflibpkhuogq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpaHh6b2RocGZsaWJwa2h1b2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDk5MTksImV4cCI6MjA3NDA4NTkxOX0.8UAk1kkFtBHIP_NLrGGzDUsm9kd1XLuNHY4jHHDaBxw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth functions
export const signUp = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
};

// Carbon tracking functions
export const addEmission = async (userId, category, amount) => {
  try {
    const { data, error } = await supabase
      .from('emissions')
      .insert({
        user_id: userId,
        category: category,
        amount: amount,
      });
      
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getTodayEmissions = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  try {
    const { data, error } = await supabase
      .from('emissions')
      .select('amount')
      .eq('user_id', userId)
      .gte('created_at', today.toISOString());
      
    if (error) throw error;
    
    const total = data ? data.reduce((sum, emission) => sum + emission.amount, 0) : 0;
    return { total, error: null };
  } catch (error) {
    return { total: 0, error };
  }
};