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
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import LocationService from '../../services/LocationService';
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

  const transportModes = [
    { id: 'auto-detect', name: 'Auto Detect', icon: 'analytics', color: '#8B5CF6' },
    { id: 'walk', name: 'Walking', icon: 'walk', color: '#10B981' },
    { id: 'bike', name: 'Cycling', icon: 'bicycle', color: '#3B82F6' },
    { id: 'bus', name: 'Bus', icon: 'bus', color: '#F59E0B' },
    { id: 'train', name: 'Train', icon: 'train', color: '#6366F1' },
    { id: 'car', name: 'Car', icon: 'car', color: '#EF4444' },
  ];

  useEffect(() => {
    initializeLocation();
    
    return () => {
      if (isTracking) {
        handleStopTracking();
      }
    };
  }, []);

  useEffect(() => {
    let interval;
    if (isTracking) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        updateCurrentLocation();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking]);

  const initializeLocation = async () => {
    try {
      await LocationService.initialize();
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      Alert.alert('Location Error', 'Could not get your current location');
    }
  };

  const updateCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const newCoord = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setCurrentLocation({
        ...newCoord,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      if (isTracking) {
        setRouteCoordinates(prev => [...prev, newCoord]);
        
        // Update map to follow user
        mapRef.current?.animateToRegion({
          ...newCoord,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleStartTracking = async () => {
    try {
      const trip = await LocationService.startTracking(selectedMode);
      setTripData(trip);
      setIsTracking(true);
      setElapsedTime(0);
      setRouteCoordinates([]);
      setShowModeSelector(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to start tracking');
    }
  };

  const handleStopTracking = async () => {
    try {
      const completedTrip = await LocationService.stopTracking();
      setIsTracking(false);
      
      // Show trip summary
      Alert.alert(
        '🎉 Trip Complete!',
        `Distance: ${completedTrip.totalDistance.toFixed(2)} km\n` +
        `Mode: ${completedTrip.mode}\n` +
        `Carbon Emissions: ${completedTrip.carbonEmissions.toFixed(2)} kg CO₂\n` +
        `Duration: ${formatTime(elapsedTime)}`,
        [
          {
            text: 'Save',
            onPress: () => {
              onTripComplete?.(completedTrip);
              resetTrip();
            }
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => resetTrip()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to stop tracking');
    }
  };

  const resetTrip = () => {
    setTripData(null);
    setElapsedTime(0);
    setRouteCoordinates([]);
    setSelectedMode('auto-detect');
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
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
        // ... add more dark mode styles
      ];
    }
    return [];
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      {currentLocation && (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={currentLocation}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          customMapStyle={getMapStyle()}
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
        </MapView>
      )}

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
                  {(LocationService.currentTrip?.totalDistance || 0).toFixed(2)} km
                </Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
                  Distance
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="leaf-outline" size={20} color={theme.accentText} />
                <Text style={[styles.statValue, { color: theme.accentText }]}>
                  {(LocationService.currentTrip?.carbonEmissions || 0).toFixed(2)} kg
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
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
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