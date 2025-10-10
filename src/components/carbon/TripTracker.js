// src/components/carbon/TripTracker.js - SIMPLE VERSION WITHOUT REANIMATED
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
  const [panelState, setPanelState] = useState('collapsed'); // 'minimized', 'collapsed', 'expanded'

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

  // Create pan responder for drag gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate new height based on drag
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
        
        // Determine target based on position and velocity
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

  useEffect(() => {
    console.log('TripTracker mounted');
    initializeLocation();
    
    return () => {
      console.log('TripTracker unmounting');
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

  const animatePanel = (toHeight, state) => {
    setPanelState(state);
    Animated.spring(panelAnimation, {
      toValue: toHeight,
      useNativeDriver: false,
      friction: 8,
    }).start();
  };

  const initializeLocation = async () => {
    try {
      console.log('Requesting location permissions...');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      console.log('Permission status:', status);
      
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
        return;
      }

      console.log('Getting current location...');
      
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 10000,
        });
        
        if (location && location.coords) {
          console.log('Got location:', location.coords.latitude, location.coords.longitude);
          
          const initialRegion = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          
          setCurrentLocation(initialRegion);
          
          if (mapRef.current && isMapReady) {
            setTimeout(() => {
              mapRef.current.animateToRegion(initialRegion, 1000);
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error getting current location:', error);
        
        try {
          const lastLocation = await Location.getLastKnownPositionAsync({});
          
          if (lastLocation && lastLocation.coords) {
            console.log('Using last known location');
            const lastRegion = {
              latitude: lastLocation.coords.latitude,
              longitude: lastLocation.coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            };
            
            setCurrentLocation(lastRegion);
          } else {
            console.log('No last known location available');
            Alert.alert(
              'Location Error',
              'Unable to get your location. Please ensure GPS is enabled and try again.'
            );
          }
        } catch (lastLocationError) {
          console.error('Error getting last location:', lastLocationError);
        }
      }
    } catch (error) {
      console.error('Location initialization error:', error);
      Alert.alert('Error', 'Failed to initialize location services');
    }
  };

  const startLocationTracking = async () => {
    try {
      console.log('Starting location tracking...');
      
      if (permissionStatus !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed for tracking.');
        return;
      }
      
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 10,
        },
        (location) => {
          console.log('Location update:', location.coords.latitude, location.coords.longitude);
          
          const newCoord = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          
          setCurrentLocation({
            ...newCoord,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
          
          if (location.coords.speed) {
            setCurrentSpeed(location.coords.speed * 3.6);
          }
          
          setRouteCoordinates(prev => {
            const newRoute = [...prev, newCoord];
            
            if (prev.length > 0) {
              const lastCoord = prev[prev.length - 1];
              const distance = calculateDistance(lastCoord, newCoord);
              setTotalDistance(prevDistance => prevDistance + distance);
            }
            
            return newRoute;
          });
          
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
      console.log('Location tracking started');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Tracking Error', 'Failed to start tracking. Please try again.');
    }
  };

  const calculateDistance = (coord1, coord2) => {
    const R = 6371;
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
      console.log('Starting trip with mode:', selectedMode);
      
      setIsTracking(true);
      setElapsedTime(0);
      setTotalDistance(0);
      setRouteCoordinates([]);
      setShowModeSelector(false);
      
      // Minimize panel when tracking starts
      animatePanel(MINIMIZED_HEIGHT, 'minimized');
      
      await startLocationTracking();
      
      Alert.alert('Tracking Started', `Tracking your ${selectedMode} trip`);
    } catch (error) {
      console.error('Failed to start tracking:', error);
      Alert.alert('Error', 'Failed to start tracking: ' + error.message);
      setIsTracking(false);
    }
  };

  const handleStopTracking = async () => {
    try {
      console.log('Stopping trip...');
      
      if (locationSubscription) {
        locationSubscription.remove();
        setLocationSubscription(null);
      }
      
      const emissions = calculateEmissions(totalDistance, selectedMode);
      
      const completedTrip = {
        mode: selectedMode === 'auto-detect' ? detectModeFromSpeed() : selectedMode,
        totalDistance: totalDistance,
        carbonEmissions: emissions,
        duration: elapsedTime,
        averageSpeed: totalDistance / (elapsedTime / 3600),
        routeCoordinates: routeCoordinates,
      };
      
      setIsTracking(false);
      
      // Expand panel to show results
      animatePanel(COLLAPSED_HEIGHT, 'collapsed');
      
      Alert.alert(
        '🎉 Trip Complete!',
        `Distance: ${completedTrip.totalDistance.toFixed(2)} km\n` +
        `Mode: ${completedTrip.mode}\n` +
        `Emissions: ${completedTrip.carbonEmissions.toFixed(2)} kg CO₂\n` +
        `Duration: ${formatTime(elapsedTime)}`,
        [
          {
            text: 'Save',
            onPress: async () => {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from('emissions').insert({
                  user_id: user.id,
                  category: 'transport',
                  amount: completedTrip.carbonEmissions,
                  description: `${completedTrip.mode} trip - ${completedTrip.totalDistance.toFixed(2)}km`,
                });
              }
              
              onTripComplete?.(completedTrip);
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
    const avgSpeed = totalDistance / (elapsedTime / 3600);
    if (avgSpeed < 5) return 'walk';
    if (avgSpeed < 15) return 'bike';
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

  if (!currentLocation) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.accentText} />
        <Text style={[styles.loadingText, { color: theme.primaryText }]}>
          Getting your location...
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={initializeLocation}
        >
          <Text style={styles.retryText}>Retry</Text>
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
        style={StyleSheet.absoluteFillObject}
        initialRegion={currentLocation}
        showsUserLocation={true}
        showsMyLocationButton={panelState !== 'expanded'}
        showsCompass={true}
        customMapStyle={getMapStyle()}
        onMapReady={() => {
          console.log('Map ready');
          setIsMapReady(true);
          if (currentLocation && mapRef.current) {
            setTimeout(() => {
              mapRef.current.animateToRegion(currentLocation, 1000);
            }, 500);
          }
        }}
      >
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#10B981"
            strokeWidth={4}
          />
        )}
        
        {routeCoordinates.length > 0 && (
          <Marker
            coordinate={routeCoordinates[0]}
            title="Start"
            pinColor="#10B981"
          />
        )}
      </MapView>

      {/* Bottom Panel with Gesture Support */}
      <Animated.View 
        style={[
          styles.bottomPanel,
          { 
            backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            height: panelAnimation,
          }
        ]}
        {...panResponder.panHandlers}
      >
        {/* Drag Handle */}
        <View style={styles.dragHandle}>
          <View style={styles.dragIndicator} />
        </View>

        {/* Panel Content */}
        <View style={styles.panelContent}>
          {panelState === 'minimized' ? (
            // Minimized View
            <View style={styles.minimizedContent}>
              {isTracking ? (
                <View style={styles.minimizedStats}>
                  <View style={styles.minimizedStatsLeft}>
                    <Text style={[styles.minimizedText, { color: theme.primaryText }]}>
                      {totalDistance.toFixed(1)} km
                    </Text>
                    <Text style={[styles.minimizedText, { color: theme.secondaryText }]}>
                      {formatTime(elapsedTime)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleStopTracking}>
                    <Ionicons name="stop-circle" size={40} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.minimizedStart}
                  onPress={() => animatePanel(COLLAPSED_HEIGHT, 'collapsed')}
                >
                  <Ionicons name="play-circle" size={40} color={theme.accentText} />
                  <Text style={[styles.minimizedText, { color: theme.primaryText, marginLeft: 10 }]}>
                    Start Journey
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            // Expanded/Collapsed View
            <>
              {isTracking ? (
                <View style={styles.trackingInfo}>
                  <Text style={[styles.trackingTitle, { color: theme.primaryText }]}>
                    Tracking: {selectedMode}
                  </Text>
                  
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Ionicons name="time-outline" size={20} color={theme.secondaryText} />
                      <Text style={[styles.statValue, { color: theme.primaryText }]}>
                        {formatTime(elapsedTime)}
                      </Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Ionicons name="navigate-outline" size={20} color={theme.secondaryText} />
                      <Text style={[styles.statValue, { color: theme.primaryText }]}>
                        {totalDistance.toFixed(2)} km
                      </Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Ionicons name="speedometer-outline" size={20} color={theme.secondaryText} />
                      <Text style={[styles.statValue, { color: theme.primaryText }]}>
                        {currentSpeed.toFixed(1)} km/h
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
            </>
          )}
        </View>
      </Animated.View>

      {/* Transport Mode Modal */}
      <Modal
        visible={showModeSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModeSelector(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          onPress={() => setShowModeSelector(false)}
          activeOpacity={1}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.primaryText }]}>
                Select Transport Mode
              </Text>
              <TouchableOpacity onPress={() => setShowModeSelector(false)}>
                <Ionicons name="close" size={24} color={theme.primaryText} />
              </TouchableOpacity>
            </View>
            
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
                      (Based on speed)
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
    height: height * 0.5,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#10B981',
    borderRadius: 20,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(156, 163, 175, 0.5)',
    borderRadius: 2,
  },
  panelContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  minimizedContent: {
    flex: 1,
    justifyContent: 'center',
  },
  minimizedStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  minimizedStatsLeft: {
    flexDirection: 'column',
  },
  minimizedStart: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimizedText: {
    fontSize: 16,
    fontWeight: '600',
  },
  trackingInfo: {
    alignItems: 'center',
  },
  trackingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
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
    marginTop: 5,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  startPanel: {
    alignItems: 'center',
  },
  startTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 15,
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
    paddingVertical: 12,
    paddingHorizontal: 24,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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