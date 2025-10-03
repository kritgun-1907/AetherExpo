// src/components/carbon/TripTracker.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import LocationService from '../../services/LocationService';
import GoogleMapsService from '../../api/googleMaps';
import * as Location from 'expo-location';

export default function TripTracker({ onTripComplete }) {
  const { theme, isDarkMode } = useTheme();
  const mapRef = useRef(null);
  
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [tripData, setTripData] = useState(null);
  const [selectedMode, setSelectedMode] = useState('auto-detect');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const transportModes = [
    { id: 'auto-detect', name: 'Auto Detect', icon: 'analytics', color: '#8B5CF6' },
    { id: 'walk', name: 'Walking', icon: 'walk', color: '#10B981' },
    { id: 'bike', name: 'Cycling', icon: 'bicycle', color: '#3B82F6' },
    { id: 'bus', name: 'Bus', icon: 'bus', color: '#F59E0B' },
    { id: 'train', name: 'Train', icon: 'train', color: '#6366F1' },
    { id: 'car', name: 'Car', icon: 'car', color: '#EF4444' },
  ];

  useEffect(() => {
    console.log('TripTracker mounted, initializing location...');
    initializeLocation();
    
    return () => {
      console.log('TripTracker unmounting, cleaning up...');
      if (isTracking) {
        handleStopTracking();
      }
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    let interval;
    if (isTracking) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking]);

  const initializeLocation = async () => {
    try {
      console.log('Requesting location permissions...');
      
      // Request foreground permissions first
      let { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Foreground permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to track your trips. Please enable it in settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Request background permissions for continuous tracking
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        console.log('Background permission status:', bgStatus);
      }

      // Get current location
      console.log('Getting current location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      console.log('Current location obtained:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });

      const initialRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      setCurrentLocation(initialRegion);
      
      // Center map on current location
      if (mapRef.current && isMapReady) {
        mapRef.current.animateToRegion(initialRegion, 1000);
      }
    } catch (error) {
      console.error('Location initialization error:', error);
      Alert.alert('Location Error', 'Could not get your current location: ' + error.message);
    }
  };

  const startLocationTracking = async () => {
    try {
      console.log('Starting location tracking subscription...');
      
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, // Update every second
          distanceInterval: 5, // Or every 5 meters
        },
        (location) => {
          console.log('Location update received:', {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            speed: location.coords.speed,
          });
          
          const newCoord = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          
          // Update current location
          setCurrentLocation({
            ...newCoord,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
          
          // Update speed
          if (location.coords.speed) {
            setCurrentSpeed(location.coords.speed * 3.6); // Convert m/s to km/h
          }
          
          // Add to route
          setRouteCoordinates(prev => {
            const newRoute = [...prev, newCoord];
            
            // Calculate total distance
            if (prev.length > 0) {
              const lastCoord = prev[prev.length - 1];
              const distance = calculateDistance(lastCoord, newCoord);
              setTotalDistance(prevDistance => prevDistance + distance);
            }
            
            return newRoute;
          });
          
          // Update map to follow user
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
      console.log('Location tracking started successfully');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Tracking Error', 'Failed to start location tracking: ' + error.message);
    }
  };

  const calculateDistance = (coord1, coord2) => {
    const R = 6371; // Earth's radius in km
    const dLat = deg2rad(coord2.latitude - coord1.latitude);
    const dLon = deg2rad(coord2.longitude - coord1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(coord1.latitude)) *
        Math.cos(deg2rad(coord2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  const handleStartTracking = async () => {
    try {
      console.log('Starting trip tracking with mode:', selectedMode);
      
      // Initialize LocationService
      await LocationService.initialize();
      
      // Start tracking
      const trip = await LocationService.startTracking(selectedMode);
      setTripData(trip);
      setIsTracking(true);
      setElapsedTime(0);
      setTotalDistance(0);
      setRouteCoordinates([]);
      setShowModeSelector(false);
      
      // Start location subscription
      await startLocationTracking();
      
      console.log('Trip tracking started successfully');
    } catch (error) {
      console.error('Failed to start tracking:', error);
      Alert.alert('Error', 'Failed to start tracking: ' + error.message);
    }
  };

  const handleStopTracking = async () => {
    try {
      console.log('Stopping trip tracking...');
      
      // Stop location subscription
      if (locationSubscription) {
        locationSubscription.remove();
        setLocationSubscription(null);
      }
      
      // Calculate emissions based on mode
      const emissions = calculateEmissions(totalDistance, selectedMode);
      
      // Prepare trip data
      const completedTrip = {
        id: Date.now().toString(),
        mode: selectedMode === 'auto-detect' ? detectModeFromSpeed() : selectedMode,
        totalDistance: totalDistance,
        carbonEmissions: emissions,
        duration: elapsedTime,
        averageSpeed: totalDistance / (elapsedTime / 3600), // km/h
        routeCoordinates: routeCoordinates,
        startTime: new Date(Date.now() - elapsedTime * 1000).toISOString(),
        endTime: new Date().toISOString(),
      };
      
      setIsTracking(false);
      
      // Show trip summary
      Alert.alert(
        '🎉 Trip Complete!',
        `Distance: ${completedTrip.totalDistance.toFixed(2)} km\n` +
        `Mode: ${completedTrip.mode}\n` +
        `Carbon Emissions: ${completedTrip.carbonEmissions.toFixed(2)} kg CO₂\n` +
        `Duration: ${formatTime(elapsedTime)}\n` +
        `Average Speed: ${completedTrip.averageSpeed.toFixed(1)} km/h`,
        [
          {
            text: 'Save',
            onPress: async () => {
              console.log('Saving trip to backend...');
              
              // Save to LocationService (which saves to Supabase)
              await LocationService.saveTripToDatabase(completedTrip);
              
              // Notify parent component
              onTripComplete?.(completedTrip);
              
              resetTrip();
              Alert.alert('Success', 'Trip saved successfully!');
            }
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              console.log('Trip discarded');
              resetTrip();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error stopping tracking:', error);
      Alert.alert('Error', 'Failed to stop tracking: ' + error.message);
    }
  };

  const detectModeFromSpeed = () => {
    const avgSpeed = totalDistance / (elapsedTime / 3600);
    
    if (avgSpeed < 5) return 'walk';
    if (avgSpeed < 15) return 'bike';
    if (avgSpeed < 50) return 'bus';
    return 'car';
  };

  const calculateEmissions = (distance, mode) => {
    const emissionFactors = {
      walk: 0,
      bike: 0,
      bus: 0.089,
      train: 0.041,
      car: 0.21,
      'auto-detect': 0.15, // Average
    };
    
    return distance * (emissionFactors[mode] || 0.21);
  };

  const resetTrip = () => {
    setTripData(null);
    setElapsedTime(0);
    setTotalDistance(0);
    setCurrentSpeed(0);
    setRouteCoordinates([]);
    setSelectedMode('auto-detect');
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getMapStyle = () => {
    if (isDarkMode) {
      return [
        {
          elementType: "geometry",
          stylers: [{ color: "#242f3e" }],
        },
        {
          elementType: "labels.text.stroke",
          stylers: [{ color: "#242f3e" }],
        },
        {
          elementType: "labels.text.fill",
          stylers: [{ color: "#746855" }],
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#38414e" }],
        },
        {
          featureType: "road",
          elementType: "geometry.stroke",
          stylers: [{ color: "#212a37" }],
        },
      ];
    }
    return [];
  };

  // Show loading while waiting for location
  if (!currentLocation) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.accentText} />
        <Text style={[styles.loadingText, { color: theme.primaryText }]}>
          Getting your location...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={currentLocation}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        customMapStyle={getMapStyle()}
        onMapReady={() => {
          console.log('Map is ready');
          setIsMapReady(true);
        }}
      >
        {/* Route polyline */}
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#10B981"
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}
        
        {/* Start marker */}
        {routeCoordinates.length > 0 && (
          <Marker
            coordinate={routeCoordinates[0]}
            title="Start"
            pinColor="#10B981"
          />
        )}
        
        {/* Current position marker (if tracking) */}
        {isTracking && routeCoordinates.length > 0 && (
          <Marker
            coordinate={routeCoordinates[routeCoordinates.length - 1]}
            title="Current Position"
            pinColor="#EF4444"
          />
        )}
      </MapView>

      {/* Tracking Info Panel */}
      <View style={[styles.infoPanel, { 
        backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)' 
      }]}>
        {isTracking ? (
          <View style={styles.trackingInfo}>
            <Text style={[styles.trackingTitle, { color: theme.primaryText }]}>
              Tracking in Progress
            </Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={20} color={theme.secondaryText} />
                <Text style={[styles.statValue, { color: theme.primaryText }]}>
                  {formatTime(elapsedTime)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
                  Duration
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="navigate-outline" size={20} color={theme.secondaryText} />
                <Text style={[styles.statValue, { color: theme.primaryText }]}>
                  {totalDistance.toFixed(2)} km
                </Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
                  Distance
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="speedometer-outline" size={20} color={theme.secondaryText} />
                <Text style={[styles.statValue, { color: theme.primaryText }]}>
                  {currentSpeed.toFixed(1)} km/h
                </Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
                  Speed
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="leaf-outline" size={20} color={theme.accentText} />
                <Text style={[styles.statValue, { color: theme.accentText }]}>
                  {calculateEmissions(totalDistance, selectedMode).toFixed(2)} kg
                </Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
                  CO₂
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={[styles.stopButton, { backgroundColor: '#EF4444' }]}
              onPress={handleStopTracking}
            >
              <Ionicons name="stop" size={24} color="#FFFFFF" />
              <Text style={styles.buttonText}>Stop Tracking</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.startPanel}>
            <Text style={[styles.startTitle, { color: theme.primaryText }]}>
              Start Your Journey
            </Text>
            
            <TouchableOpacity
              style={[styles.modeSelector, { 
                backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : theme.divider 
              }]}
              onPress={() => setShowModeSelector(true)}
            >
              <Ionicons 
                name={transportModes.find(m => m.id === selectedMode)?.icon} 
                size={24} 
                color={transportModes.find(m => m.id === selectedMode)?.color} 
              />
              <Text style={[styles.modeSelectorText, { color: theme.primaryText }]}>
                {transportModes.find(m => m.id === selectedMode)?.name}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.secondaryText} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: theme.accentText }]}
              onPress={handleStartTracking}
            >
              <Ionicons name="play" size={24} color="#FFFFFF" />
              <Text style={styles.buttonText}>Start Tracking</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Transport Mode Selector Modal */}
      <Modal
        visible={showModeSelector}
        transparent={true}
        animationType="slide"
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          onPress={() => setShowModeSelector(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: theme.primaryText }]}>
              Select Transport Mode
            </Text>
            
            <ScrollView style={styles.modeList}>
              {transportModes.map(mode => (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    styles.modeItem,
                    { 
                      backgroundColor: selectedMode === mode.id 
                        ? theme.accentText + '20' 
                        : 'transparent' 
                    }
                  ]}
                  onPress={() => {
                    setSelectedMode(mode.id);
                    setShowModeSelector(false);
                  }}
                >
                  <Ionicons name={mode.icon} size={24} color={mode.color} />
                  <Text style={[styles.modeItemText, { color: theme.primaryText }]}>
                    {mode.name}
                  </Text>
                  {mode.id === 'auto-detect' && (
                    <Text style={[styles.modeItemHint, { color: theme.secondaryText }]}>
                      AI will detect based on speed
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  map: {
    flex: 1,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  trackingInfo: {
    alignItems: 'center',
  },
  trackingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 11,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 10,
  },
  startPanel: {
    alignItems: 'center',
  },
  startTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
  },
  modeSelectorText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modeList: {
    marginBottom: 20,
  },
  modeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  modeItemText: {
    fontSize: 16,
    marginLeft: 15,
    flex: 1,
  },
  modeItemHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});