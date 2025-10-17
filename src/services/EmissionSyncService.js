// src/services/EmissionSyncService.js - FIXED VERSION
import { supabase } from '../api/supabase';
import EmissionService from './EmissionService';
import StorageService from './StorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class EmissionSyncService {
  constructor() {
    this.listeners = new Set();
    this.currentUser = null;
    this.syncInProgress = false;
    this.realtimeSubscription = null;
  }

  async initialize(userId) {
    if (this.currentUser === userId && this.realtimeSubscription) {
      return;
    }

    this.currentUser = userId;
    
    if (this.realtimeSubscription) {
      await supabase.removeChannel(this.realtimeSubscription);
    }

    this.realtimeSubscription = supabase
      .channel(`emissions:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emissions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔄 Emission change detected:', payload);
          this.handleEmissionChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔄 Profile update detected:', payload);
          this.notifyListeners('profile_updated', payload.new);
        }
      )
      .subscribe();

    console.log('✅ Real-time sync initialized for user:', userId);
  }

  async handleEmissionChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        await this.handleNewEmission(newRecord);
        break;
      case 'UPDATE':
        await this.handleUpdatedEmission(newRecord, oldRecord);
        break;
      case 'DELETE':
        await this.handleDeletedEmission(oldRecord);
        break;
    }

    await this.syncAllData();
  }

  async addEmission(category, activity, amount, options = {}) {
  if (this.syncInProgress) {
    console.warn('⚠️ Sync already in progress, queuing...');
    await this.waitForSync();
  }

  this.syncInProgress = true;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('📝 Adding emission:', { category, activity, amount });

    // Calculate emissions using EmissionService
    const calculation = await EmissionService.calculateEmissions(
      category,
      activity,
      amount,
      options
    );

    if (!calculation.success) {
      throw new Error(calculation.error || 'Failed to calculate emissions');
    }

    // 🔥 FIX: Map source values to database constraints
    let dbSource = 'manual'; // default
    if (calculation.source === 'api') {
      dbSource = 'api';
    } else if (calculation.source === 'bank') {
      dbSource = 'bank';
    } else if (calculation.source === 'manual') {
      dbSource = 'manual';
    }
    // If source is anything else (like 'Climatiq API'), default to 'manual'

    console.log('💾 Saving to database with source:', dbSource);

    // Store in database with full metadata
    const { data: emission, error } = await supabase
      .from('emissions')
      .insert({
        user_id: user.id,
        category: category,
        subcategory: activity,
        amount: calculation.emissions,
        unit: calculation.unit || 'kg_co2e',
        description: options.description || `${activity} - ${amount} ${options.unit || 'units'}`,
        emission_factor: calculation.emission_factor,
        source: dbSource, // ✅ FIXED: Use mapped value
        metadata: {
          input_amount: amount,
          input_unit: options.unit,
          calculation_source: calculation.source, // ✅ Store original here
          source_detail: calculation.source_detail || calculation.source,
          calculation_details: calculation.details,
          confidence: calculation.confidence,
          calculation_id: calculation.calculation_id,
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    console.log('✅ Emission saved to database:', emission);

    // Cache Climatiq response if available
    if (calculation.calculation_id) {
      await this.cacheClimatiqResponse(emission.id, calculation);
    }

    // Update user profile totals
    await this.updateUserTotals(user.id, calculation.emissions);

    // Sync all data
    await this.syncAllData();

    // Notify all listeners
    this.notifyListeners('emission_added', {
      emission,
      calculation
    });

    return {
      success: true,
      emission,
      calculation
    };

  } catch (error) {
    console.error('❌ Error adding emission:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    this.syncInProgress = false;
  }
}


  async cacheClimatiqResponse(emissionId, calculation) {
    try {
      await supabase.from('climatiq_cache').insert({
        emission_id: emissionId,
        calculation_id: calculation.calculation_id,
        activity_id: calculation.details?.activity_id,
        co2e: calculation.emissions,
        co2e_unit: calculation.unit,
        response_data: calculation,
        cached_at: new Date().toISOString()
      });
      console.log('✅ Climatiq response cached');
    } catch (error) {
      console.warn('⚠️ Failed to cache Climatiq response:', error);
    }
  }

  async updateUserTotals(userId, emissionAmount) {
    try {
      const { error } = await supabase.rpc('increment_user_emissions', {
        p_user_id: userId,
        p_amount: emissionAmount
      });

      if (error) {
        console.warn('⚠️ RPC function not available, using direct update');
        
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('total_emissions')
          .eq('id', userId)
          .single();

        if (profile) {
          await supabase
            .from('user_profiles')
            .update({
              total_emissions: (profile.total_emissions || 0) + emissionAmount,
              last_activity_date: new Date().toISOString().split('T')[0],
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        }
      }

      console.log('✅ User totals updated');
    } catch (error) {
      console.error('❌ Error updating user totals:', error);
    }
  }

  // 🔥 FIX: Properly fetch and format weekly_data
  async syncAllData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      console.log('🔄 Syncing all emission data...');

      // Get basic stats from RPC function
      const { data: basicStats, error: statsError } = await supabase.rpc('sync_emission_data', {
        p_user_id: user.id
      });

      // Get weekly chart data separately
      const { data: weeklyData, error: weeklyError } = await supabase.rpc('get_weekly_emissions_data', {
        p_user_id: user.id
      });

      let stats;

      if (statsError || weeklyError) {
        console.warn('⚠️ RPC sync not available, using manual sync');
        stats = await this.manualSync(user.id);
      } else {
        // 🔥 FIX: Transform weekly data from table rows to array
        const weeklyDataArray = weeklyData ? weeklyData.map(row => ({
          day: row.day_name,
          emissions: parseFloat(row.emissions) || 0
        })) : [];

        // Merge basic stats with weekly data
        stats = {
          ...basicStats,
          weekly_data: weeklyDataArray,
          synced_at: new Date().toISOString()
        };
      }

      // Cache synced data
      await AsyncStorage.setItem('emission_stats', JSON.stringify(stats));

      // Notify all listeners
      this.notifyListeners('data_synced', stats);

      console.log('✅ Data synced:', stats);
      return stats;

    } catch (error) {
      console.error('❌ Error syncing data:', error);
      return null;
    }
  }

  // 🔥 FIX: Manual sync also needs to return weekly_data
  async manualSync(userId) {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: emissions } = await supabase
        .from('emissions')
        .select('amount, created_at, category')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!emissions) return null;

      const daily = emissions
        .filter(e => e.created_at.startsWith(today))
        .reduce((sum, e) => sum + e.amount, 0);

      const weekly = emissions
        .filter(e => e.created_at >= weekAgo)
        .reduce((sum, e) => sum + e.amount, 0);

      const monthly = emissions
        .filter(e => e.created_at >= monthStart)
        .reduce((sum, e) => sum + e.amount, 0);

      const all_time = emissions
        .reduce((sum, e) => sum + e.amount, 0);

     // 🔥 FIX: Calculate weekly breakdown for last 7 days with proper day names
      const weeklyDataArray = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayEmissions = emissions
          .filter(e => e.created_at.startsWith(dateStr))
          .reduce((sum, e) => sum + e.amount, 0);
        
        weeklyDataArray.push({
          day: dayNames[date.getDay()], // This correctly maps 0=Sun, 1=Mon, etc.
          emissions: dayEmissions
        });
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('eco_points, streak_count')
        .eq('id', userId)
        .single();

      const stats = {
        daily,
        weekly,
        monthly,
        all_time,
        streak: profile?.streak_count || 0,
        tokens: profile?.eco_points || 0,
        weekly_data: weeklyDataArray, // ✅ NOW INCLUDED
        synced_at: new Date().toISOString()
      };

      await AsyncStorage.setItem('emission_stats', JSON.stringify(stats));
      return stats;

    } catch (error) {
      console.error('❌ Manual sync error:', error);
      return null;
    }
  }

  async getCachedStats() {
    try {
      const cached = await AsyncStorage.getItem('emission_stats');
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error reading cached stats:', error);
      return null;
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  async waitForSync() {
    let attempts = 0;
    while (this.syncInProgress && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  }

  async handleNewEmission(emission) {
    console.log('➕ New emission:', emission);
    this.notifyListeners('emission_added', emission);
  }

  async handleUpdatedEmission(newEmission, oldEmission) {
    console.log('✏️ Emission updated:', newEmission);
    this.notifyListeners('emission_updated', { new: newEmission, old: oldEmission });
  }

  async handleDeletedEmission(emission) {
    console.log('🗑️ Emission deleted:', emission);
    this.notifyListeners('emission_deleted', emission);
  }

  // Keep existing helper methods
  async getWeeklyChartData(userId) {
    try {
      const { data, error } = await supabase.rpc('get_weekly_emissions_data', {
        p_user_id: userId
      });

      if (error) throw error;

      return {
        labels: data?.map(d => d.day_name) || [],
        data: data?.map(d => parseFloat(d.emissions) || 0) || []
      };
    } catch (error) {
      console.error('Error getting weekly chart data:', error);
      return { labels: [], data: [] };
    }
  }

  async getCategoryBreakdown(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase.rpc('get_category_breakdown', {
        p_user_id: userId,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: new Date().toISOString().split('T')[0]
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting category breakdown:', error);
      return [];
    }
  }

  async uploadReceiptForEmission(userId, receiptUri, emissionId = null, metadata = {}) {
    try {
      const uploadResult = await StorageService.uploadReceipt(userId, receiptUri, metadata);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      if (emissionId) {
        await supabase
          .from('emissions')
          .update({
            metadata: {
              receipt_id: uploadResult.id,
              receipt_path: uploadResult.path
            }
          })
          .eq('id', emissionId);
      }

      return uploadResult;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      return { success: false, error: error.message };
    }
  }

  async cleanup() {
    if (this.realtimeSubscription) {
      await supabase.removeChannel(this.realtimeSubscription);
      this.realtimeSubscription = null;
    }
    this.listeners.clear();
    this.currentUser = null;
  }
}

export default new EmissionSyncService();