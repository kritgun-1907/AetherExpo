import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';

// Shared emission state across screens
let emissionCache = {
  daily: 0,
  weekly: 0,
  monthly: 0,
  allTime: 0,
  weeklyData: [0, 0, 0, 0, 0, 0, 0],
  dayNames: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  lastUpdated: null,
  listeners: new Set(),
};

export function useEmissions() {
  const [emissions, setEmissions] = useState({
    daily: emissionCache.daily,
    weekly: emissionCache.weekly,
    monthly: emissionCache.monthly,
    allTime: emissionCache.allTime,
    weeklyData: emissionCache.weeklyData,
    dayNames: emissionCache.dayNames,
    loading: false,
  });

  // Subscribe to cache updates
  useEffect(() => {
    const listener = (newData) => {
      setEmissions((prev) => ({
        ...prev,
        ...newData,
        loading: false,
      }));
    };

    emissionCache.listeners.add(listener);

    return () => {
      emissionCache.listeners.delete(listener);
    };
  }, []);

  const notifyListeners = useCallback((newData) => {
    emissionCache = { ...emissionCache, ...newData, lastUpdated: Date.now() };
    emissionCache.listeners.forEach((listener) => listener(newData));
  }, []);

  const loadEmissions = useCallback(async (userId) => {
    if (!userId) return;

    setEmissions((prev) => ({ ...prev, loading: true }));

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Get today's emissions
      const { data: todayData } = await supabase
        .from('emissions')
        .select('amount')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      const dailyTotal = todayData?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

      // Get weekly emissions with day names
      const weekData = [];
      const dayNames = [];
      
      for (let i = 6; i >= 0; i--) {
        const day = new Date();
        day.setDate(today.getDate() - i);
        day.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(day);
        nextDay.setDate(day.getDate() + 1);
        
        const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
        dayNames.push(dayName);
        
        const { data: dayEmissions } = await supabase
          .from('emissions')
          .select('amount')
          .eq('user_id', userId)
          .gte('created_at', day.toISOString())
          .lt('created_at', nextDay.toISOString());

        const dayTotal = dayEmissions?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
        weekData.push(dayTotal);
      }

      const weeklyTotal = weekData.reduce((sum, val) => sum + val, 0);

      // Get monthly emissions
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: monthData } = await supabase
        .from('emissions')
        .select('amount')
        .eq('user_id', userId)
        .gte('created_at', monthStart.toISOString());

      const monthlyTotal = monthData?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

      // Get all-time emissions
      const { data: allTimeData } = await supabase
        .from('emissions')
        .select('amount')
        .eq('user_id', userId);

      const allTimeTotal = allTimeData?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

      const newData = {
        daily: dailyTotal,
        weekly: weeklyTotal,
        monthly: monthlyTotal,
        allTime: allTimeTotal,
        weeklyData: weekData,
        dayNames: dayNames,
      };

      notifyListeners(newData);
    } catch (error) {
      console.error('Error loading emissions:', error);
      setEmissions((prev) => ({ ...prev, loading: false }));
    }
  }, [notifyListeners]);

  const subscribeToChanges = useCallback((userId) => {
    if (!userId) return null;

    const subscription = supabase
      .channel(`emissions_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emissions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Emission changed:', payload);
          loadEmissions(userId);
        }
      )
      .subscribe();

    return subscription;
  }, [loadEmissions]);

  return {
    emissions,
    loadEmissions,
    subscribeToChanges,
  };
}