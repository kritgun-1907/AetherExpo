// src/services/LocationService.js
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../api/supabase';
import { Alert } from 'react-native';

const LOCATION_TASK_NAME = 'AETHER_LOCATION_TRACKING';
const LOCATION_STORAGE_KEY = '@aether_location_history';

class LocationService {
  constructor() {
    this.isTracking = false;
    this.currentTrip = null;
    this.lastKnownLocation = null;
    this.travelMode = 'unknown';
    this.isInitialized = false;
  }

  // Initialize location tracking
  async initialize() {
    try {
      console.log('[LocationService] Initializing...');
      
      // Check if already initialized
      if (this.isInitialized) {
        console.log('[LocationService] Already initialized');
        return true;
      }

      // Request foreground permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('[LocationService] Foreground permission:', status);
      
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      // Request background permissions for continuous tracking
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      console.log('[LocationService] Background permission:', bgStatus);
      
      if (bgStatus === 'granted') {
        await this.defineBackgroundTask();
      }

      this.isInitialized = true;
      console.log('[LocationService] Initialization complete');
      return true;
    } catch (error) {
      console.error('[LocationService] Initialization error:', error);
      throw error;
    }
  }

  // Define background task for location tracking
  async defineBackgroundTask() {
    try {
      console.log('[LocationService] Defining background task...');
      
      TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
        if (error) {
          console.error('[LocationService] Background task error:', error);
          return;
        }
        
        if (data) {
          const { locations } = data;
          console.log('[LocationService] Background location update:', locations.length, 'points');
          await this.processLocationUpdate(locations);
        }
      });
      
      console.log('[LocationService] Background task defined');
    } catch (error) {
      console.error('[LocationService] Error defining background task:', error);
    }
  }

  // Start tracking a trip
  async startTracking(mode = 'auto-detect') {
    try {
      console.log('[LocationService] Starting tracking, mode:', mode);
      
      this.isTracking = true;
      this.travelMode = mode;
      this.currentTrip = {
        id: Date.now().toString(),
        mode: mode,
        startTime: new Date().toISOString(),
        locations: [],
        totalDistance: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        carbonEmissions: 0,
      };

      // Get initial location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      console.log('[LocationService] Initial location:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });

      this.lastKnownLocation = location;
      this.currentTrip.locations.push({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
        speed: location.coords.speed || 0,
        altitude: location.coords.altitude,
      });

      // Start background location tracking
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 10, // Or every 10 meters
        foregroundService: {
          notificationTitle: 'Aether Carbon Tracking',
          notificationBody: 'Tracking your carbon emissions',
          notificationColor: '#10B981',
        },
      });

      await this.saveCurrentTrip();
      console.log('[LocationService] Tracking started successfully');
      return this.currentTrip;
    } catch (error) {
      console.error('[LocationService] Error starting tracking:', error);
      this.isTracking = false;
      throw error;
    }
  }

  // Stop tracking
  async stopTracking() {
    try {
      console.log('[LocationService] Stopping tracking...');
      this.isTracking = false;
      
      // Stop background tracking
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      
      if (this.currentTrip) {
        this.currentTrip.endTime = new Date().toISOString();
        
        // Detect transport mode if it was auto
        if (this.currentTrip.mode === 'auto-detect') {
          this.currentTrip.mode = this.detectTransportMode(this.currentTrip);
        }

        // Calculate carbon emissions
        const emissions = this.calculateEmissions(
          this.currentTrip.totalDistance,
          this.currentTrip.mode
        );
        
        this.currentTrip.carbonEmissions = emissions;
        
        console.log('[LocationService] Trip completed:', {
          distance: this.currentTrip.totalDistance,
          mode: this.currentTrip.mode,
          emissions: emissions,
        });
        
        // Save to database
        await this.saveTripToDatabase(this.currentTrip);
        
        const tripData = { ...this.currentTrip };
        this.currentTrip = null;
        
        console.log('[LocationService] Tracking stopped successfully');
        return tripData;
      }
      
      return null;
    } catch (error) {
      console.error('[LocationService] Error stopping tracking:', error);
      throw error;
    }
  }

  // Process location updates
  async processLocationUpdate(locations) {
    if (!this.currentTrip || !this.isTracking) {
      console.log('[LocationService] No active trip, ignoring location update');
      return;
    }

    console.log('[LocationService] Processing', locations.length, 'location updates');

    for (const location of locations) {
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
        speed: location.coords.speed || 0,
        altitude: location.coords.altitude,
      };

      // Calculate distance from last point
      if (this.lastKnownLocation) {
        const distance = this.calculateDistance(
          this.lastKnownLocation.coords.latitude,
          this.lastKnownLocation.coords.longitude,
          newLocation.latitude,
          newLocation.longitude
        );
        
        this.currentTrip.totalDistance += distance;
        console.log('[LocationService] Distance added:', distance, 'km, Total:', this.currentTrip.totalDistance);
      }

      // Update speed statistics
      if (newLocation.speed > 0) {
        this.currentTrip.maxSpeed = Math.max(
          this.currentTrip.maxSpeed,
          newLocation.speed
        );
      }

      this.currentTrip.locations.push(newLocation);
      this.lastKnownLocation = location;
    }

    // Calculate average speed
    const speeds = this.currentTrip.locations
      .map(loc => loc.speed)
      .filter(speed => speed > 0);
    
    if (speeds.length > 0) {
      this.currentTrip.averageSpeed = 
        speeds.reduce((a, b) => a + b, 0) / speeds.length;
    }

    await this.saveCurrentTrip();
  }

  // Detect transport mode based on speed and movement patterns
  detectTransportMode(trip) {
    const avgSpeedKmh = (trip.averageSpeed || 0) * 3.6; // Convert m/s to km/h
    const maxSpeedKmh = (trip.maxSpeed || 0) * 3.6;
    
    console.log('[LocationService] Detecting mode - Avg speed:', avgSpeedKmh, 'km/h, Max:', maxSpeedKmh, 'km/h');
    
    // Speed-based detection with thresholds
    if (avgSpeedKmh < 5 && maxSpeedKmh < 10) {
      return 'walk';
    } else if (avgSpeedKmh < 15 && maxSpeedKmh < 25) {
      return 'bike';
    } else if (avgSpeedKmh < 50 && maxSpeedKmh < 80) {
      // Could be bus or car in city
      return this.detectUrbanTransport(trip);
    } else if (avgSpeedKmh >= 50) {
      return 'car'; // Highway speeds
    }
    
    return 'car'; // Default fallback
  }

  // More sophisticated urban transport detection
  detectUrbanTransport(trip) {
    // Check for stop patterns
    const stops = this.detectStops(trip.locations);
    const stopFrequency = stops.length / (trip.totalDistance / 1000); // Stops per km
    
    console.log('[LocationService] Stop frequency:', stopFrequency, 'stops/km');
    
    // Buses stop more frequently
    if (stopFrequency > 2) {
      return 'bus';
    }
    
    // Check for route consistency (buses follow fixed routes)
    const routeDeviation = this.calculateRouteDeviation(trip.locations);
    
    if (routeDeviation < 0.2) { // Low deviation suggests fixed route
      return 'bus';
    }
    
    return 'car';
  }

  // Detect stops in the journey
  detectStops(locations) {
    const stops = [];
    const stopThreshold = 2; // Speed below 2 m/s
    const stopDuration = 10000; // Minimum 10 seconds
    
    let currentStop = null;
    
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      
      if (loc.speed < stopThreshold) {
        if (!currentStop) {
          currentStop = {
            startIndex: i,
            startTime: loc.timestamp,
            location: { lat: loc.latitude, lng: loc.longitude }
          };
        }
      } else {
        if (currentStop) {
          const duration = loc.timestamp - currentStop.startTime;
          if (duration > stopDuration) {
            stops.push(currentStop);
          }
          currentStop = null;
        }
      }
    }
    
    return stops;
  }

  // Calculate route deviation (how straight the path is)
  calculateRouteDeviation(locations) {
    if (locations.length < 3) return 0;
    
    const start = locations[0];
    const end = locations[locations.length - 1];
    
    // Direct distance
    const directDistance = this.calculateDistance(
      start.latitude, start.longitude,
      end.latitude, end.longitude
    );
    
    // Actual distance traveled
    let actualDistance = 0;
    for (let i = 1; i < locations.length; i++) {
      actualDistance += this.calculateDistance(
        locations[i - 1].latitude, locations[i - 1].longitude,
        locations[i].latitude, locations[i].longitude
      );
    }
    
    // Return deviation ratio
    return (actualDistance - directDistance) / directDistance;
  }

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  // Calculate carbon emissions
  calculateEmissions(distanceKm, mode) {
    const emissionFactors = {
      walk: 0,
      bike: 0,
      bus: 0.089,
      train: 0.041,
      car: 0.21,
      motorcycle: 0.113,
    };
    
    const emissions = distanceKm * (emissionFactors[mode] || 0.21);
    console.log('[LocationService] Calculated emissions:', emissions, 'kg CO2 for', distanceKm, 'km by', mode);
    return emissions;
  }

  // Save current trip to storage
  async saveCurrentTrip() {
    if (this.currentTrip) {
      try {
        await AsyncStorage.setItem(
          LOCATION_STORAGE_KEY,
          JSON.stringify(this.currentTrip)
        );
        console.log('[LocationService] Trip saved to local storage');
      } catch (error) {
        console.error('[LocationService] Error saving trip to local storage:', error);
      }
    }
  }

  // BACKEND CONNECTION - Save completed trip to Supabase database
  async saveTripToDatabase(trip) {
    try {
      console.log('[LocationService] Saving trip to database...');
      console.log('[LocationService] Trip data:', {
        mode: trip.mode,
        distance: trip.totalDistance,
        emissions: trip.carbonEmissions,
        duration: (new Date(trip.endTime) - new Date(trip.startTime)) / 60000,
      });

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[LocationService] Error getting user:', userError);
        throw new Error('User not authenticated');
      }
      
      if (!user) {
        console.error('[LocationService] No user found, cannot save trip');
        Alert.alert('Error', 'Please login to save your trips');
        return null;
      }

      console.log('[LocationService] User ID:', user.id);

      // Prepare emission data
      const emissionData = {
        user_id: user.id,
        category: 'transport',
        subcategory: trip.mode,
        amount: trip.carbonEmissions,
        description: `${trip.mode} trip: ${trip.totalDistance.toFixed(2)}km`,
        source: 'gps',
        metadata: {
          trip_id: trip.id,
          distance_km: trip.totalDistance,
          duration_minutes: (new Date(trip.endTime) - new Date(trip.startTime)) / 60000,
          average_speed_kmh: trip.averageSpeed * 3.6,
          max_speed_kmh: trip.maxSpeed * 3.6,
          route_points: trip.locations.length,
          start_time: trip.startTime,
          end_time: trip.endTime,
          start_location: trip.locations[0] ? {
            lat: trip.locations[0].latitude,
            lng: trip.locations[0].longitude,
          } : null,
          end_location: trip.locations[trip.locations.length - 1] ? {
            lat: trip.locations[trip.locations.length - 1].latitude,
            lng: trip.locations[trip.locations.length - 1].longitude,
          } : null,
        },
        created_at: new Date().toISOString(),
      };

      console.log('[LocationService] Inserting emission data:', emissionData);

      // Insert into emissions table
      const { data, error } = await supabase
        .from('emissions')
        .insert(emissionData)
        .select()
        .single();

      if (error) {
        console.error('[LocationService] Database insert error:', error);
        console.error('[LocationService] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        
        // Show user-friendly error message
        Alert.alert(
          'Save Error',
          `Failed to save trip: ${error.message || 'Unknown error'}`,
          [{ text: 'OK' }]
        );
        throw error;
      }

      console.log('[LocationService] Trip saved successfully to database:', data);
      
      // Update user's total emissions
      await this.updateUserTotalEmissions(user.id, trip.carbonEmissions);
      
      // Check for achievements
      await this.checkForAchievements(user.id, trip);

      // Show success message
      Alert.alert(
        'Trip Saved!',
        `Your ${trip.mode} trip has been saved.\nDistance: ${trip.totalDistance.toFixed(2)}km\nEmissions: ${trip.carbonEmissions.toFixed(2)}kg CO₂`,
        [{ text: 'Great!' }]
      );

      return data;
    } catch (error) {
      console.error('[LocationService] Error saving trip to database:', error);
      
      // Save locally as backup if database save fails
      await this.saveFailedTripLocally(trip);
      
      throw error;
    }
  }

  // Update user's total emissions
  async updateUserTotalEmissions(userId, emissionsToAdd) {
    try {
      console.log('[LocationService] Updating user total emissions...');
      
      // Get current user profile
      const { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('total_emissions')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('[LocationService] Error fetching user profile:', fetchError);
        return;
      }

      const newTotal = (profile?.total_emissions || 0) + emissionsToAdd;

      // Update total emissions
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          total_emissions: newTotal,
          last_activity_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('[LocationService] Error updating user profile:', updateError);
      } else {
        console.log('[LocationService] User total emissions updated to:', newTotal);
      }
    } catch (error) {
      console.error('[LocationService] Error updating user total emissions:', error);
    }
  }

  // Check for achievements
  async checkForAchievements(userId, trip) {
    try {
      console.log('[LocationService] Checking for achievements...');
      
      // Check distance-based achievements
      if (trip.totalDistance > 50) {
        console.log('[LocationService] Long distance trip achievement unlocked!');
        // You can implement achievement logic here
      }
      
      // Check eco-friendly mode achievements
      if (trip.mode === 'walk' || trip.mode === 'bike') {
        console.log('[LocationService] Eco-friendly transport achievement!');
        // Award eco points
      }
    } catch (error) {
      console.error('[LocationService] Error checking achievements:', error);
    }
  }

  // Save failed trip locally for retry
  async saveFailedTripLocally(trip) {
    try {
      const failedTrips = await AsyncStorage.getItem('@failed_trips') || '[]';
      const trips = JSON.parse(failedTrips);
      trips.push({
        ...trip,
        savedAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem('@failed_trips', JSON.stringify(trips));
      console.log('[LocationService] Trip saved locally for later retry');
    } catch (error) {
      console.error('[LocationService] Error saving failed trip locally:', error);
    }
  }

  // Get current tracking status
  getTrackingStatus() {
    return {
      isTracking: this.isTracking,
      currentTrip: this.currentTrip,
      mode: this.travelMode,
    };
  }

  // Resume tracking from saved trip
  async resumeTracking() {
    try {
      const savedTrip = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      if (savedTrip) {
        this.currentTrip = JSON.parse(savedTrip);
        this.isTracking = true;
        this.travelMode = this.currentTrip.mode;
        console.log('[LocationService] Resumed tracking from saved trip');
        return this.currentTrip;
      }
      return null;
    } catch (error) {
      console.error('[LocationService] Error resuming tracking:', error);
      return null;
    }
  }
}

export default new LocationService();