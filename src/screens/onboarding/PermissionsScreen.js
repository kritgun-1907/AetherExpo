// src/screens/onboarding/PermissionsScreen.js - WITH DARK BACKGROUND
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const BACKGROUND_IMAGE = require('../../../assets/hero-carbon-tracker.jpg');

export default function PermissionsScreen({ navigation }) {
  const [permissions, setPermissions] = useState({
    notifications: null,
    location: null,
    bankConnection: null,
  });
  const [loading, setLoading] = useState(false);

  const requestNotificationPermission = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissions(prev => ({ ...prev, notifications: status === 'granted' }));
      
      if (status === 'granted') {
        Alert.alert('Success', 'Notifications enabled!');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setPermissions(prev => ({ ...prev, notifications: false }));
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissions(prev => ({ ...prev, location: status === 'granted' }));
      
      if (status === 'granted') {
        Alert.alert('Success', 'Location access enabled!');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setPermissions(prev => ({ ...prev, location: false }));
    }
  };

  const handleRequestAllPermissions = async () => {
    setLoading(true);
    
    await requestNotificationPermission();
    await requestLocationPermission();
    
    setLoading(false);
    
    const allGranted = permissions.notifications && permissions.location;
    
    if (allGranted) {
      Alert.alert(
        'All Set!',
        'All permissions granted successfully.',
        [{ text: 'Continue', onPress: () => handleContinue() }]
      );
    } else {
      Alert.alert(
        'Permissions Needed',
        'Some permissions were not granted. You can still continue but some features may be limited.',
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Continue Anyway', onPress: () => handleContinue() }
        ]
      );
    }
  };

  const handleContinue = async () => {
    await AsyncStorage.setItem('onboardingComplete', 'true');
    navigation.navigate('Setup');
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Permissions?',
      'You can always enable permissions later in settings, but some features will be limited.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: () => handleContinue() }
      ]
    );
  };

  const PermissionItem = ({ 
    title, 
    description, 
    icon, 
    status, 
    onPress, 
    optional = false 
  }) => (
    <TouchableOpacity 
      style={[
        styles.permissionItem,
        {
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderColor: status ? '#10B981' : 'rgba(255, 255, 255, 0.3)',
          borderWidth: status ? 2 : 1,
        }
      ]}
      onPress={onPress}
      disabled={status}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: status ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.2)' }
      ]}>
        <Ionicons 
          name={icon} 
          size={24} 
          color={status ? '#10B981' : 'rgba(255, 255, 255, 0.8)'} 
        />
      </View>
      
      <View style={styles.permissionContent}>
        <View style={styles.permissionHeader}>
          <Text style={styles.permissionTitle}>{title}</Text>
          {optional && (
            <Text style={styles.optionalBadge}>Optional</Text>
          )}
        </View>
        <Text style={styles.permissionDescription}>{description}</Text>
      </View>
      
      <View style={styles.statusContainer}>
        {status === true ? (
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        ) : status === false ? (
          <Ionicons name="close-circle" size={24} color="#EF4444" />
        ) : (
          <Ionicons name="chevron-forward" size={24} color="rgba(255, 255, 255, 0.6)" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ImageBackground 
        source={BACKGROUND_IMAGE} 
        resizeMode="cover" 
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
          style={styles.overlay}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Let's Set Things Up</Text>
              <Text style={styles.subtitle}>
                We need a few permissions to give you the best experience
              </Text>
            </View>

            <View style={styles.permissionsContainer}>
              <PermissionItem
                title="Push Notifications"
                description="Get reminders to log your emissions and celebrate achievements"
                icon="notifications-outline"
                status={permissions.notifications}
                onPress={requestNotificationPermission}
              />

              <PermissionItem
                title="Location Access"
                description="Automatically track transportation emissions based on your movement"
                icon="location-outline"
                status={permissions.location}
                onPress={requestLocationPermission}
              />

              <PermissionItem
                title="Bank Connection"
                description="Connect your bank to automatically track carbon from purchases"
                icon="card-outline"
                status={permissions.bankConnection}
                onPress={() => {
                  Alert.alert(
                    'Bank Connection',
                    'You can connect your bank account later from the Profile settings.',
                    [{ text: 'OK' }]
                  );
                  setPermissions(prev => ({ ...prev, bankConnection: true }));
                }}
                optional={true}
              />
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#10B981" />
              <Text style={styles.infoText}>
                Your data is encrypted and never shared with third parties. You can change these permissions anytime in settings.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.grantButton}
              onPress={handleRequestAllPermissions}
              disabled={loading}
            >
              <Text style={styles.grantButtonText}>
                {loading ? 'Requesting Permissions...' : 'Grant Permissions'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width,
    height,
  },
  overlay: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 180,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 24,
  },
  permissionsContainer: {
    paddingHorizontal: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  permissionContent: {
    flex: 1,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  optionalBadge: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
  },
  permissionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  statusContainer: {
    marginLeft: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 24,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 12,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  grantButton: {
    backgroundColor: '#10B981',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  skipButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
});