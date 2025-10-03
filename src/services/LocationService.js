// src/services/LocationService.js
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../api/supabase';

const LOCATION_TASK_NAME = 'AETHER_LOCATION_TRACKING';
const LOCATION_STORAGE_KEY = '@aether_location_history';

class LocationService {
  constructor() {
    this.isTracking = false;
    this.currentTrip = null;
    this.lastKnownLocation = null;
    this.travelMode = 'unknown';
  }

  // Initialize location tracking
  async initialize() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }

    // Request background permissions for continuous tracking
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus === 'granted') {
      await this.defineBackgroundTask();
    }

    return true;
  }

  // Define background task for location tracking
  async defineBackgroundTask() {
    TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
      if (error) {
        console.error('Location task error:', error);
        return;
      }
      
      if (data) {
        const { locations } = data;
        await this.processLocationUpdate(locations);
      }
    });
  }

  // Start tracking a trip
  async startTracking(mode = 'auto-detect') {
    try {
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
      };

      // Get initial location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
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
      return this.currentTrip;
    } catch (error) {
      console.error('Error starting tracking:', error);
      throw error;
    }
  }

  // Stop tracking
  async stopTracking() {
    try {
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
        
        // Save to database
        await this.saveTripToDatabase(this.currentTrip);
        
        const tripData = { ...this.currentTrip };
        this.currentTrip = null;
        
        return tripData;
      }
    } catch (error) {
      console.error('Error stopping tracking:', error);
      throw error;
    }
  }

  // Process location updates
  async processLocationUpdate(locations) {
    if (!this.currentTrip || !this.isTracking) return;

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
    
    return distanceKm * (emissionFactors[mode] || 0.21);
  }

  // Save current trip to storage
  async saveCurrentTrip() {
    if (this.currentTrip) {
      await AsyncStorage.setItem(
        LOCATION_STORAGE_KEY,
        JSON.stringify(this.currentTrip)
      );
    }
  }

  // Save completed trip to database
  async saveTripToDatabase(trip) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('emissions').insert({
        user_id: user.id,
        category: 'transport',
        subcategory: trip.mode,
        amount: trip.carbonEmissions,
        description: `${trip.mode} trip: ${trip.totalDistance.toFixed(2)}km`,
        metadata: {
          distance_km: trip.totalDistance,
          duration_minutes: (new Date(trip.endTime) - new Date(trip.startTime)) / 60000,
          average_speed_kmh: trip.averageSpeed * 3.6,
          max_speed_kmh: trip.maxSpeed * 3.6,
          route_points: trip.locations.length,
        },
      });
    } catch (error) {
      console.error('Error saving trip to database:', error);
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
}

export default new LocationService();