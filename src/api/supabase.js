// src/api/supabase.js - IMPROVED VERSION WITH BETTER ERROR HANDLING
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

// ========= EMISSIONS FUNCTIONS (IMPROVED) =========

export const addEmission = async (userId, category, amount, subcategory = null) => {
  try {
    console.log('🚀 addEmission called with:', { userId, category, amount, subcategory });
    
    // Validate inputs
    if (!userId) {
      throw new Error('User ID is required');
    }
    if (!category) {
      throw new Error('Category is required');
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      throw new Error('Valid amount is required');
    }

    const numericAmount = parseFloat(amount);
const validCategories = ['transport', 'food', 'home', 'shopping'];
// Map 'energy' to 'home' if users try to use it
const normalizedCategory = category.toLowerCase() === 'energy' ? 'home' : category.toLowerCase();
    
    if (!validCategories.includes(category.toLowerCase())) {
      throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    // First ensure the user profile exists
    const profile = await getUserProfile(userId);
    if (!profile) {
      console.log('Profile not found, creating...');
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        await createUserProfile(userId, user.email);
      }
    }

    // Insert emission with error handling
    const { data, error } = await supabase
      .from('emissions')
      .insert({
        user_id: userId,
        category: category.toLowerCase(),
        subcategory: subcategory || null,
        amount: numericAmount,
        source: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Database insert error:', error);
      throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
    }

    console.log('✅ Emission inserted successfully:', data);

    // Update related data (non-blocking)
    try {
      await Promise.all([
        updateDailySummary(userId, category.toLowerCase(), numericAmount),
        updateUserTotalEmissions(userId, numericAmount)
      ]);
      console.log('✅ Related data updated successfully');
    } catch (updateError) {
      console.warn('⚠️ Warning: Could not update related data:', updateError);
      // Don't throw here - the main emission was saved successfully
    }

    return { 
      success: true,
      data, 
      error: null,
      message: 'Emission added successfully'
    };

  } catch (error) {
    console.error('❌ addEmission error:', error);
    return { 
      success: false,
      data: null, 
      error: error.message || 'Failed to add emission',
      details: error
    };
  }
};

// Simple fallback emission insert
export const addEmissionSimple = async (userId, category, amount) => {
  try {
    console.log('🔄 Using simple emission insert...');
    
    const { data, error } = await supabase
      .from('emissions')
      .insert([{
        user_id: userId,
        category: category.toLowerCase(),
        amount: parseFloat(amount),
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('Simple insert error:', error);
      throw error;
    }

    return { success: true, data: data[0], error: null };
    
  } catch (error) {
    console.error('Simple insert failed:', error);
    return { success: false, data: null, error: error.message };
  }
};

const updateDailySummary = async (userId, category, amount) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Map energy category to home (since that's what the table has)
    const mappedCategory = category === 'energy' ? 'home' : category;
    
    // Check if summary exists for today
    const { data: existing, error: fetchError } = await supabase
      .from('daily_emissions_summary')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (fetchError) {
      console.warn('Could not fetch daily summary:', fetchError);
      return;
    }

    const categoryColumn = `${mappedCategory}_emissions`;
    
    if (existing) {
      // Update existing summary
      const updates = {
        [categoryColumn]: (existing[categoryColumn] || 0) + amount,
        total_emissions: (existing.total_emissions || 0) + amount,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('daily_emissions_summary')
        .update(updates)
        .eq('id', existing.id);

      if (updateError) {
        console.warn('Could not update daily summary:', updateError);
      }
    } else {
      // Create new summary - only use valid columns
      const newSummary = {
        user_id: userId,
        date: today,
        transport_emissions: mappedCategory === 'transport' ? amount : 0,
        food_emissions: mappedCategory === 'food' ? amount : 0,
        home_emissions: mappedCategory === 'home' ? amount : 0,  // ✅ Fixed!
        shopping_emissions: mappedCategory === 'shopping' ? amount : 0,
        total_emissions: amount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('daily_emissions_summary')
        .insert(newSummary);

      if (insertError) {
        console.warn('Could not create daily summary:', insertError);
      }
    }
  } catch (error) {
    console.warn('Update daily summary error:', error);
  }
};

// Update user's total emissions (improved)
const updateUserTotalEmissions = async (userId, amount) => {
  try {
    const { data: profile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('total_emissions')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.warn('Could not fetch user profile for total update:', fetchError);
      return;
    }

    if (profile) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          total_emissions: (profile.total_emissions || 0) + amount,
          last_activity_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.warn('Could not update user total emissions:', updateError);
      }
    }
  } catch (error) {
    console.warn('Update total emissions error:', error);
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

// ========= DEBUGGING FUNCTIONS =========

export const testDatabaseConnection = async () => {
  try {
    console.log('🧪 Testing database connection...');
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Database connection failed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Database connection successful');
    return { success: true, error: null };
  } catch (error) {
    console.error('❌ Connection test error:', error);
    return { success: false, error: error.message };
  }
};

export const debugEmissionInsert = async (userId, category = 'transport', amount = 1.0) => {
  try {
    console.log('🐛 DEBUG: Testing emission insert...');
    console.log('Parameters:', { userId, category, amount });
    
    // Test 1: Check if user exists
    const { data: userExists, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('id', userId)
      .maybeSingle();
    
    console.log('🐛 User exists:', !!userExists, userError?.message || 'no error');

    // Test 2: Check emissions table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('emissions')
      .select('*')
      .limit(1);
    
    console.log('🐛 Emissions table accessible:', !tableError, tableError?.message || 'no error');

    // Test 3: Try simple insert
    const insertData = {
      user_id: userId,
      category: category,
      amount: parseFloat(amount),
      created_at: new Date().toISOString()
    };

    console.log('🐛 Insert data:', insertData);

    const { data, error } = await supabase
      .from('emissions')
      .insert(insertData)
      .select();

    console.log('🐛 Insert result:', { success: !error, data, error: error?.message });

    return { 
      success: !error, 
      data, 
      error: error?.message,
      debug: {
        userExists: !!userExists,
        tableAccessible: !tableError,
        insertData
      }
    };
  } catch (error) {
    console.error('🐛 Debug insert error:', error);
    return { success: false, error: error.message };
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
              eco_points: (profile.eco_points || 0) + (def.reward_tokens || 0),
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
    // Use direct update instead of RPC function (which might not exist)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('eco_points')
      .eq('id', userId)
      .single();

    if (profile) {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          eco_points: (profile.eco_points || 0) + points,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('eco_points')
        .single();

      if (error) throw error;
      return data?.eco_points;
    }
    
    return null;
  } catch (error) {
    console.error('Increment eco points error:', error);
    return null;
  }
};

// Update user offsets
export const updateUserOffsets = async (userId, tonsOffset) => {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('total_offsets')
      .eq('id', userId)
      .single();

    if (profile) {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          total_offsets: (profile.total_offsets || 0) + tonsOffset,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('total_offsets')
        .single();

      if (error) throw error;
      return data?.total_offsets;
    }

    return null;
  } catch (error) {
    console.error('Update offsets error:', error);
    return null;
  }
};