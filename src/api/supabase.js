// src/api/supabase.js - FIXED VERSION
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration
const supabaseUrl = 'https://aihxzodhpflibpkhuogq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpaHh6b2RocGZsaWJwa2h1b2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDk5MTksImV4cCI6MjA3NDA4NTkxOX0.8UAk1kkFtBHIP_NLrGGzDUsm9kd1XLuNHY4jHHDaBxw';

// Create Supabase client with AsyncStorage for React Native
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ========= AUTH FUNCTIONS =========

export const signUp = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    // Create user profile after successful signup
    if (data.user) {
      await createUserProfile(data.user.id, email);
    }

    return { data, error: null };
  } catch (error) {
    console.error('SignUp error:', error);
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

    // Check if profile exists, create if not
    if (data.user) {
      await ensureUserProfile(data.user.id, email);
    }

    return { data, error: null };
  } catch (error) {
    console.error('SignIn error:', error);
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    console.error('SignOut error:', error);
    return { error };
  }
};

// ========= PROFILE FUNCTIONS =========

// Create user profile
const createUserProfile = async (userId, email) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email: email,
        full_name: email.split('@')[0], // Use email username as default name
        eco_points: 0,
        total_emissions: 0,
        total_offsets: 0,
        weekly_goal: 50,
        streak_count: 0,
        last_activity_date: new Date().toISOString().split('T')[0],
        is_premium: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      // If profile already exists, that's okay
      if (error.code === '23505') { // Unique constraint violation
        return await getUserProfile(userId);
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Create profile error:', error);
    return null;
  }
};

// Ensure user profile exists (for login)
const ensureUserProfile = async (userId, email) => {
  try {
    // First check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle instead of single to avoid error when no rows

    if (existingProfile) {
      return existingProfile;
    }

    // If no profile exists, create one
    return await createUserProfile(userId, email);
  } catch (error) {
    console.error('Ensure profile error:', error);
    return null;
  }
};

// Get user profile
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle to avoid error when no rows

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get profile error:', error);
    return null;
  }
};

// Update user profile
export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Update profile error:', error);
    return { data: null, error };
  }
};

// ========= EMISSIONS FUNCTIONS =========

export const addEmission = async (userId, category, amount, subcategory = null) => {
  try {
    const { data, error } = await supabase
      .from('emissions')
      .insert({
        user_id: userId,
        category,
        subcategory,
        amount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Update daily summary
    await updateDailySummary(userId, category, amount);

    // Update user's total emissions
    await updateUserTotalEmissions(userId, amount);

    return { data, error: null };
  } catch (error) {
    console.error('Add emission error:', error);
    return { data: null, error };
  }
};

// Update daily emissions summary
const updateDailySummary = async (userId, category, amount) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if summary exists for today
    const { data: existing } = await supabase
      .from('daily_emissions_summary')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    const categoryColumn = `${category}_emissions`;
    
    if (existing) {
      // Update existing summary
      const updates = {
        [categoryColumn]: (existing[categoryColumn] || 0) + amount,
        total_emissions: existing.total_emissions + amount,
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from('daily_emissions_summary')
        .update(updates)
        .eq('id', existing.id);
    } else {
      // Create new summary
      const newSummary = {
        user_id: userId,
        date: today,
        [categoryColumn]: amount,
        total_emissions: amount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from('daily_emissions_summary')
        .insert(newSummary);
    }
  } catch (error) {
    console.error('Update daily summary error:', error);
  }
};

// Update user's total emissions
const updateUserTotalEmissions = async (userId, amount) => {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('total_emissions')
      .eq('id', userId)
      .single();

    if (profile) {
      await supabase
        .from('user_profiles')
        .update({
          total_emissions: (profile.total_emissions || 0) + amount,
          last_activity_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }
  } catch (error) {
    console.error('Update total emissions error:', error);
  }
};

// Get user emissions
export const getUserEmissions = async (userId, days = 7) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('emissions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Get emissions error:', error);
    return [];
  }
};

// Get daily emissions summary
export const getDailySummary = async (userId, days = 7) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('daily_emissions_summary')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Get daily summary error:', error);
    return [];
  }
};

// ========= ACHIEVEMENTS FUNCTIONS =========

export const checkAndAwardAchievements = async (userId) => {
  try {
    // Get user's current stats
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) return [];

    // Get all achievement definitions
    const { data: definitions } = await supabase
      .from('achievement_definitions')
      .select('*')
      .eq('is_active', true);

    if (!definitions) return [];

    // Get user's existing achievements
    const { data: existingAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    const existingIds = existingAchievements?.map(a => a.achievement_id) || [];
    const newAchievements = [];

    // Check each achievement condition
    for (const def of definitions) {
      if (existingIds.includes(def.id)) continue;

      let qualified = false;

      switch (def.condition_type) {
        case 'threshold':
          if (def.category === 'emissions' && profile.total_emissions <= def.condition_value) {
            qualified = true;
          } else if (def.category === 'offset' && profile.total_offsets >= def.condition_value) {
            qualified = true;
          }
          break;
        case 'streak':
          if (profile.streak_count >= def.condition_value) {
            qualified = true;
          }
          break;
        case 'cumulative':
          if (profile.eco_points >= def.condition_value) {
            qualified = true;
          }
          break;
      }

      if (qualified) {
        // Award achievement
        const { data: awarded } = await supabase
          .from('user_achievements')
          .insert({
            user_id: userId,
            achievement_id: def.id,
            tokens_earned: def.reward_tokens,
          })
          .select()
          .single();

        if (awarded) {
          newAchievements.push({
            ...def,
            earned_at: awarded.earned_at,
          });

          // Update user's eco points
          await supabase
            .from('user_profiles')
            .update({
              eco_points: profile.eco_points + def.reward_tokens,
            })
            .eq('id', userId);
        }
      }
    }

    return newAchievements;
  } catch (error) {
    console.error('Check achievements error:', error);
    return [];
  }
};

// ========= REALTIME SUBSCRIPTIONS =========

export const subscribeToUserUpdates = (userId, callback) => {
  const subscription = supabase
    .channel(`profile:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_profiles',
        filter: `id=eq.${userId}`,
      },
      callback
    )
    .subscribe();

  return subscription;
};

export const subscribeToNotifications = (userId, callback) => {
  const subscription = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();

  return subscription;
};

// ========= HELPER FUNCTIONS =========

// Increment eco points
export const incrementEcoPoints = async (userId, points) => {
  try {
    const { data, error } = await supabase.rpc('increment_eco_points', {
      user_id: userId,
      points: points,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Increment eco points error:', error);
    return null;
  }
};

// Update user offsets
export const updateUserOffsets = async (userId, tonsOffset) => {
  try {
    const { data, error } = await supabase.rpc('update_user_offsets', {
      user_id: userId,
      tons_offset: tonsOffset,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Update offsets error:', error);
    return null;
  }
};