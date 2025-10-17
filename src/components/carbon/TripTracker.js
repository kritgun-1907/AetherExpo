// src/components/carbon/TripTracker.js - FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  Animated,
  Linking,
  PanResponder,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import * as Location from 'expo-location';
import { supabase } from '../../api/supabase';

const { width, height } = Dimensions.get('window');

// Panel heights
const MINIMIZED_HEIGHT = 80;
const COLLAPSED_HEIGHT = 200;
const EXPANDED_HEIGHT = 320;

// 🔥 FIX: Default to user's actual location (Chandigarh)
const DEFAULT_REGION = {
  latitude: 30.7333, // Chandigarh
  longitude: 76.7794,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function TripTracker({ onTripComplete }) {
  const { theme, isDarkMode } = useTheme();
  const mapRef = useRef(null);
  
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedMode, setSelectedMode] = useState('auto-detect');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [panelState, setPanelState] = useState('collapsed');
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  // Animated value for panel
  const panelAnimation = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;

  const transportModes = [
    { id: 'auto-detect', name: 'Auto Detect', icon: 'analytics', color: '#8B5CF6' },
    { id: 'walk', name: 'Walking', icon: 'walk', color: '#10B981' },
    { id: 'bike', name: 'Cycling', icon: 'bicycle', color: '#3B82F6' },
    { id: 'bus', name: 'Bus', icon: 'bus', color: '#F59E0B' },
    { id: 'train', name: 'Train', icon: 'train', color: '#6366F1' },
    { id: 'car', name: 'Car', icon: 'car', color: '#EF4444' },
  ];

  // 🔥 FIX: Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (coord1, coord2) => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(coord2.latitude - coord1.latitude);
    const dLon = toRad(coord2.longitude - coord1.longitude);
    const lat1 = toRad(coord1.latitude);
    const lat2 = toRad(coord2.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance; // Returns distance in km
  };

  const toRad = (value) => {
    return (value * Math.PI) / 180;
  };

  // Pan responder for dragging panel
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        const currentHeight = 
          panelState === 'minimized' ? MINIMIZED_HEIGHT :
          panelState === 'collapsed' ? COLLAPSED_HEIGHT :
          EXPANDED_HEIGHT;
        
        const newHeight = Math.max(
          MINIMIZED_HEIGHT,
          Math.min(EXPANDED_HEIGHT, currentHeight - gestureState.dy)
        );
        
        panelAnimation.setValue(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const velocity = gestureState.vy;
        const currentHeight = panelAnimation._value;
        
        let targetState;
        let targetHeight;
        
        if (velocity > 0.5 || currentHeight < MINIMIZED_HEIGHT + 30) {
          targetState = 'minimized';
          targetHeight = MINIMIZED_HEIGHT;
        } else if (velocity < -0.5 || currentHeight > EXPANDED_HEIGHT - 30) {
          targetState = 'expanded';
          targetHeight = EXPANDED_HEIGHT;
        } else if (currentHeight < (COLLAPSED_HEIGHT + MINIMIZED_HEIGHT) / 2) {
          targetState = 'minimized';
          targetHeight = MINIMIZED_HEIGHT;
        } else if (currentHeight > (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2) {
          targetState = 'expanded';
          targetHeight = EXPANDED_HEIGHT;
        } else {
          targetState = 'collapsed';
          targetHeight = COLLAPSED_HEIGHT;
        }
        
        animatePanel(targetHeight, targetState);
      },
    })
  ).current;

  // 🔥 FIX: Initialize with proper location
  useEffect(() => {
    console.log('🚀 TripTracker mounted');
    initializeLocation();
    
    return () => {
      console.log('🛑 TripTracker unmounting');
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Timer for elapsed time when tracking
  useEffect(() => {
    let interval;
    if (isTracking) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking]);

  const animatePanel = (toHeight, state) => {
    setPanelState(state);
    Animated.spring(panelAnimation, {
      toValue: toHeight,
      useNativeDriver: false,
      friction: 8,
    }).start();
  };

 // In TripTracker.js, replace the initializeLocation function with this:

const initializeLocation = async () => {
  try {
    setIsLoadingLocation(true);
    console.log('📍 Requesting location permissions...');
    
    // Request permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(status);
    console.log('✅ Permission status:', status);
    
    if (status !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'Please enable location services to use trip tracking.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }
          }
        ]
      );
      setCurrentLocation(DEFAULT_REGION);
      setIsLoadingLocation(false);
      return;
    }

    console.log('📡 Getting current position...');
    
    try {
      // 🔥 FIX: Try multiple times with different accuracy levels
      let location = null;
      
      // First try: Best accuracy
      try {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
          maximumAge: 5000,
          timeout: 10000,
        });
      } catch (firstError) {
        console.log('⚠️ First attempt failed, trying high accuracy...');
        
        // Second try: High accuracy
        try {
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
            maximumAge: 10000,
            timeout: 15000,
          });
        } catch (secondError) {
          console.log('⚠️ Second attempt failed, trying balanced...');
          
          // Third try: Balanced
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            maximumAge: 15000,
            timeout: 20000,
          });
        }
      }
      
      if (location && location.coords) {
        console.log('✅ Got current location:', {
          lat: location.coords.latitude.toFixed(6),
          lng: location.coords.longitude.toFixed(6),
          accuracy: location.coords.accuracy,
        });
        
        // 🔥 FIX: Validate coordinates are not default simulator values
        const isSanFrancisco = (
          Math.abs(location.coords.latitude - 37.785834) < 0.001 &&
          Math.abs(location.coords.longitude - (-122.406417)) < 0.001
        );
        
        if (isSanFrancisco) {
          console.warn('⚠️ Detected simulator default location (San Francisco)');
          Alert.alert(
            'Simulator Location Detected',
            'You are using simulator default location (San Francisco). ' +
            'To test with real location:\n\n' +
            '1. Simulator → Features → Location → Custom Location\n' +
            '2. Enter: Lat 30.7333, Lng 76.7794 (Chandigarh)\n\n' +
            'Or test on a physical device for real GPS.',
            [{ text: 'OK' }]
          );
        }
        
        const initialRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        
        setCurrentLocation(initialRegion);
        
        // Animate map to location
        if (mapRef.current && isMapReady) {
          setTimeout(() => {
            mapRef.current.animateToRegion(initialRegion, 1000);
          }, 100);
        }
      }
    } catch (error) {
      console.error('❌ Error getting current location:', error);
      
      // Try last known location as fallback
      try {
        console.log('🔄 Trying last known location...');
        const lastLocation = await Location.getLastKnownPositionAsync({});
        
        if (lastLocation && lastLocation.coords) {
          console.log('✅ Using last known location');
          const lastRegion = {
            latitude: lastLocation.coords.latitude,
            longitude: lastLocation.coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          };
          
          setCurrentLocation(lastRegion);
        } else {
          console.log('⚠️ No last known location, using default');
          setCurrentLocation(DEFAULT_REGION);
          Alert.alert(
            'Location Unavailable',
            'Using default location (Chandigarh). Please ensure:\n\n' +
            '• GPS is enabled\n' +
            '• You have clear view of the sky\n' +
            '• Location services are on\n' +
            '• You are on a physical device (not simulator)',
            [{ text: 'OK' }]
          );
        }
      } catch (lastLocationError) {
        console.error('❌ Error getting last location:', lastLocationError);
        setCurrentLocation(DEFAULT_REGION);
      }
    }
    
    setIsLoadingLocation(false);
  } catch (error) {
    console.error('❌ Location initialization error:', error);
    setCurrentLocation(DEFAULT_REGION);
    setIsLoadingLocation(false);
    Alert.alert('Error', 'Failed to initialize location services');
  }
};

  // 🔥 FIX: Proper location tracking with distance calculation
  const startLocationTracking = async () => {
    try {
      console.log('🚀 Starting location tracking...');
      
      if (permissionStatus !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed for tracking.');
        return;
      }
      
      // 🔥 FIX: Use watchPositionAsync for continuous updates
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // Update every second
          distanceInterval: 5, // Or every 5 meters
        },
        (location) => {
          console.log('📍 Location update:', {
            lat: location.coords.latitude.toFixed(6),
            lng: location.coords.longitude.toFixed(6),
            speed: location.coords.speed,
            accuracy: location.coords.accuracy,
          });
          
          const newCoord = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          
          // Update current location for map
          setCurrentLocation({
            ...newCoord,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
          
          // Update speed (m/s to km/h)
          if (location.coords.speed && location.coords.speed > 0) {
            setCurrentSpeed(location.coords.speed * 3.6);
          }
          
          // 🔥 FIX: Add to route and calculate distance
          setRouteCoordinates(prev => {
            const newRoute = [...prev, newCoord];
            
            // Calculate distance from last point
            if (prev.length > 0) {
              const lastCoord = prev[prev.length - 1];
              const distance = calculateDistance(lastCoord, newCoord);
              
              // Only add if movement is significant (> 5 meters)
              if (distance > 0.005) {
                console.log('📏 Distance added:', (distance * 1000).toFixed(2), 'meters');
                setTotalDistance(prevDistance => prevDistance + distance);
              }
            }
            
            return newRoute;
          });
          
          // 🔥 FIX: Always follow user on map
          if (mapRef.current && isMapReady) {
            mapRef.current.animateToRegion({
              ...newCoord,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }, 500);
          }
        }
      );
      
      setLocationSubscription(subscription);
      console.log('✅ Location tracking started');
    } catch (error) {
      console.error('❌ Error starting location tracking:', error);
      Alert.alert('Tracking Error', 'Failed to start tracking. Please try again.');
    }
  };

  const startTracking = async () => {
    setIsTracking(true);
    setElapsedTime(0);
    setTotalDistance(0);
    setRouteCoordinates([]);
    
    if (currentLocation) {
      setRouteCoordinates([{
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      }]);
    }
    
    await startLocationTracking();
  };

  const stopTracking = async () => {
    try {
      setIsTracking(false);
      
      if (locationSubscription) {
        locationSubscription.remove();
        setLocationSubscription(null);
      }

      const completedTrip = {
        mode: selectedMode === 'auto-detect' ? detectModeFromSpeed() : selectedMode,
        distance: totalDistance,
        duration: elapsedTime,
        emissions: calculateEmissions(totalDistance, selectedMode),
        route: routeCoordinates,
      };

      Alert.alert(
        'Trip Complete',
        `Distance: ${totalDistance.toFixed(2)} km\nTime: ${formatTime(elapsedTime)}\nEmissions: ${completedTrip.emissions.toFixed(2)} kg CO₂`,
        [
          {
            text: 'Save',
            onPress: async () => {
              await saveTripToDatabase(completedTrip);
              if (onTripComplete) onTripComplete(completedTrip);
              resetTrip();
              Alert.alert('Success', 'Trip saved!');
            }
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: resetTrip
          }
        ]
      );
    } catch (error) {
      console.error('Error stopping tracking:', error);
      Alert.alert('Error', 'Failed to stop tracking');
    }
  };

  const detectModeFromSpeed = () => {
    if (totalDistance === 0 || elapsedTime === 0) return 'walk';
    
    const avgSpeed = (totalDistance / (elapsedTime / 3600)); // km/h
    console.log('Detected average speed:', avgSpeed, 'km/h');
    
    if (avgSpeed < 5) return 'walk';
    if (avgSpeed < 20) return 'bike';
    if (avgSpeed < 50) return 'bus';
    return 'car';
  };

  const calculateEmissions = (distance, mode) => {
    const factors = {
      walk: 0,
      bike: 0,
      bus: 0.089,
      train: 0.041,
      car: 0.21,
      'auto-detect': 0.15,
    };
    return distance * (factors[mode] || 0.21);
  };

  const saveTripToDatabase = async (trip) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('emissions').insert({
        user_id: user.id,
        category: 'transport',
        subcategory: trip.mode,
        amount: trip.emissions,
        description: `${trip.mode} trip: ${trip.distance.toFixed(2)}km`,
        source: 'gps',
        metadata: {
          distance_km: trip.distance,
          duration_seconds: trip.duration,
          route_points: trip.route.length,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving trip:', error);
    }
  };

  const resetTrip = () => {
    setElapsedTime(0);
    setTotalDistance(0);
    setCurrentSpeed(0);
    setRouteCoordinates([]);
    setSelectedMode('auto-detect');
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getMapStyle = () => {
    if (isDarkMode) {
      return [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
      ];
    }
    return [];
  };

  if (isLoadingLocation) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.accentText} />
        <Text style={[styles.loadingText, { color: theme.primaryText }]}>
          Getting your location...
        </Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.buttonBackground }]}
          onPress={initializeLocation}
        >
          <Text style={[styles.retryText, { color: theme.buttonText }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentLocation) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Ionicons name="location-outline" size={64} color={theme.secondaryText} />
        <Text style={[styles.loadingText, { color: theme.primaryText }]}>
          Location unavailable
        </Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.buttonBackground }]}
          onPress={initializeLocation}
        >
          <Text style={[styles.retryText, { color: theme.buttonText }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map View - Full Screen */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={currentLocation}
        customMapStyle={getMapStyle()}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={isTracking}
        showsCompass={true}
        showsScale={true}
        onMapReady={() => {
          console.log('✅ Map is ready');
          setIsMapReady(true);
        }}
      >
        {/* Current location marker */}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="Current Location"
          >
            <View style={styles.currentLocationMarker}>
              <View style={styles.currentLocationDot} />
            </View>
          </Marker>
        )}

        {/* Route polyline */}
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={theme.accentText}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

      {/* Control Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            height: panelAnimation,
            backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Drag Handle */}
        <View style={styles.dragHandle}>
          <View style={[styles.dragBar, { backgroundColor: theme.secondaryText }]} />
        </View>

        {/* Content */}
        <View style={styles.panelContent}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.primaryText }]}>
                {totalDistance.toFixed(2)} km
              </Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Distance</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.primaryText }]}>
                {formatTime(elapsedTime)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Time</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.primaryText }]}>
                {currentSpeed.toFixed(1)} km/h
              </Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Speed</Text>
            </View>
          </View>

          {/* Start/Stop Button */}
          <TouchableOpacity
            style={[
              styles.trackButton,
              {
                backgroundColor: isTracking ? '#EF4444' : theme.buttonBackground,
              },
            ]}
            onPress={isTracking ? stopTracking : startTracking}
          >
            <Ionicons
              name={isTracking ? 'stop-circle' : 'play-circle'}
              size={24}
              color="#FFFFFF"
            />
            <Text style={styles.trackButtonText}>
              {isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Recenter Button */}
      <TouchableOpacity
        style={[styles.recenterButton, { backgroundColor: theme.cardBackground }]}
        onPress={() => {
          if (currentLocation && mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }, 500);
          }
        }}
      >
        <Ionicons name="navigate" size={24} color={theme.accentText} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  panelContent: {
    flex: 1,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recenterButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});