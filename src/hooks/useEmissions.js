// src/hooks/useEmissions.js - FIXED VERSION
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../api/supabase';
import EmissionSyncService from '../services/EmissionSyncService';

export const useEmissions = () => {
  const [emissions, setEmissions] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0,
    allTime: 0,
    weeklyData: [0, 0, 0, 0, 0, 0, 0],
    dayNames: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  });
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  
  const unsubscribeRef = useRef(null);
  const mountedRef = useRef(true);

  // Initialize sync service
  useEffect(() => {
    mountedRef.current = true;
    initializeSync();

    return () => {
      mountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Initialize sync and subscribe to updates
  const initializeSync = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mountedRef.current) return;

      console.log('🔄 Initializing emissions sync...');

      // Initialize real-time sync
      await EmissionSyncService.initialize(user.id);

      // Subscribe to sync updates
      unsubscribeRef.current = EmissionSyncService.subscribe((event, data) => {
        if (!mountedRef.current) return;

        console.log('📡 Sync event:', event);

        switch (event) {
          case 'data_synced':
            updateEmissionsFromSync(data);
            break;
          case 'emission_added':
          case 'emission_updated':
          case 'emission_deleted':
            loadEmissions(user.id);
            break;
          case 'profile_updated':
            setProfile(data);
            break;
        }
      });

      // Try to load cached data first
      const cached = await EmissionSyncService.getCachedStats();
      if (cached && mountedRef.current) {
        updateEmissionsFromSync(cached);
        setLastSync(new Date(cached.synced_at));
      }

      // Then load fresh data
      await loadEmissions(user.id);
    } catch (error) {
      console.error('Error initializing sync:', error);
      if (mountedRef.current) {
        setError(error.message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Load emissions data
  const loadEmissions = useCallback(async (userId) => {
    if (!userId || !mountedRef.current) return;

    try {
      console.log('📊 Loading emissions for user:', userId);

      // Sync all data using the sync service
      const stats = await EmissionSyncService.syncAllData();

      if (stats && mountedRef.current) {
        updateEmissionsFromSync(stats);
        setLastSync(new Date());
      }

      // Load user profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData && mountedRef.current) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error loading emissions:', error);
      if (mountedRef.current) {
        setError(error.message);
      }
    }
  }, []);

 // 🔥 FIX: Extract both emissions AND day names from weekly data
const updateEmissionsFromSync = (stats) => {
  if (!stats || !mountedRef.current) return;

  console.log('📈 Updating emissions from sync:', stats);

  let weeklyDataArray = stats.weekly_data || stats.weeklyData || [];
  let normalizedWeeklyData = [];
  let normalizedDayNames = [];
  
  if (Array.isArray(weeklyDataArray) && weeklyDataArray.length > 0) {
    if (typeof weeklyDataArray[0] === 'object') {
      // Extract emissions AND day names from objects
      normalizedWeeklyData = weeklyDataArray
        .slice(0, 7)
        .map(item => typeof item.emissions === 'number' ? item.emissions : 0);
      
      normalizedDayNames = weeklyDataArray
        .slice(0, 7)
        .map(item => item.day || item.day_name || 'Day');
    } else {
      normalizedWeeklyData = weeklyDataArray.slice(0, 7);
      // Fallback to default names if just numbers
      normalizedDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    }
  }
  
  // Ensure exactly 7 elements
  while (normalizedWeeklyData.length < 7) {
    normalizedWeeklyData.push(0);
    normalizedDayNames.push('Day');
  }

  setEmissions(prev => ({
    ...prev,
    daily: typeof stats.daily === 'number' ? stats.daily : 0,
    weekly: typeof stats.weekly === 'number' ? stats.weekly : 0,
    monthly: typeof stats.monthly === 'number' ? stats.monthly : 0,
    allTime: typeof (stats.all_time || stats.allTime) === 'number' ? 
      (stats.all_time || stats.allTime) : 0,
    weeklyData: normalizedWeeklyData,
    dayNames: normalizedDayNames, // ✅ NOW USING ACTUAL DAY NAMES FROM DATA
  }));

  if (stats.profile) {
    setProfile(stats.profile);
  }
};

  // Manual refresh function
  const refreshEmissions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await loadEmissions(user.id);
      }
    } catch (err) {
      console.error('Error refreshing emissions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadEmissions]);

  // Add emission function
  const addEmission = useCallback(async (emissionData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('➕ Adding emission via hook:', emissionData);

      // Use sync service to add emission
      const result = await EmissionSyncService.addEmission({
        ...emissionData,
        user_id: user.id,
      });

      if (result) {
        // Immediately refresh to get updated stats
        await refreshEmissions();
        return result;
      }
    } catch (error) {
      console.error('Error adding emission:', error);
      setError(error.message);
      throw error;
    }
  }, [refreshEmissions]);

  // Delete emission function
  const deleteEmission = useCallback(async (emissionId) => {
    try {
      console.log('🗑️ Deleting emission via hook:', emissionId);

      // Use sync service to delete emission
      await EmissionSyncService.deleteEmission(emissionId);

      // Immediately refresh to get updated stats
      await refreshEmissions();
    } catch (error) {
      console.error('Error deleting emission:', error);
      setError(error.message);
      throw error;
    }
  }, [refreshEmissions]);

  // 🔥 FIX: Add subscribeToChanges for real-time updates
  const subscribeToChanges = useCallback((userId) => {
    if (!userId) return null;

    console.log('🔔 Setting up real-time subscription for user:', userId);

    const subscription = supabase
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
          console.log('📥 Real-time emission change:', payload);
          // Reload emissions when data changes
          loadEmissions(userId);
        }
      )
      .subscribe();

    return subscription;
  }, [loadEmissions]);

  // 🔥 FIX: Return all functions that screens need
  return {
    emissions,
    profile,
    loading,
    error,
    lastSync,
    refreshEmissions,
    addEmission,
    deleteEmission,
    loadEmissions,        // ✅ NOW EXPORTED
    subscribeToChanges,   // ✅ NOW EXPORTED
  };
};