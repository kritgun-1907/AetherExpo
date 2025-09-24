// src/screens/onboarding/PermissionsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PermissionsScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const [permissions, setPermissions] = useState({
    notifications: null,
    location: null,
    bankConnection: false, // This is optional
  });
  const [loading, setLoading] = useState(false);

  const requestNotificationPermission = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      setPermissions(prev => ({ ...prev, notifications: finalStatus === 'granted' }));
      
      if (finalStatus === 'granted') {
        // Configure notifications
        await Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
      }
      
      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }
      
      setPermissions(prev => ({ ...prev, location: finalStatus === 'granted' }));
      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const handleRequestAllPermissions = async () => {
    setLoading(true);
    
    const notifGranted = await requestNotificationPermission();
    const locationGranted = await requestLocationPermission();
    
    setLoading(false);
    
    if (notifGranted && locationGranted) {
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
    // Mark onboarding as complete
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
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
          borderColor: status ? '#10B981' : theme.border,
          borderWidth: status ? 2 : 1,
        }
      ]}
      onPress={onPress}
      disabled={status}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: status ? '#D1FAE5' : theme.divider }
      ]}>
        <Ionicons 
          name={icon} 
          size={24} 
          color={status ? '#10B981' : theme.secondaryText} 
        />
      </View>
      
      <View style={styles.permissionContent}>
        <View style={styles.permissionHeader}>
          <Text style={[styles.permissionTitle, { color: theme.primaryText }]}>
            {title}
          </Text>
          {optional && (
            <Text style={[styles.optionalBadge, { color: theme.secondaryText }]}>
              Optional
            </Text>
          )}
        </View>
        <Text style={[styles.permissionDescription, { color: theme.secondaryText }]}>
          {description}
        </Text>
      </View>
      
      <View style={styles.statusContainer}>
        {status === true ? (
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        ) : status === false ? (
          <Ionicons name="close-circle" size={24} color="#EF4444" />
        ) : (
          <Ionicons name="chevron-forward" size={24} color={theme.secondaryText} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.background} 
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.primaryText }]}>
            Let's Set Things Up
          </Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
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
          <Text style={[styles.infoText, { color: theme.secondaryText }]}>
            Your data is encrypted and never shared with third parties. You can change these permissions anytime in settings.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.background }]}>
        <TouchableOpacity 
          style={[styles.requestButton, { backgroundColor: theme.accentText }]}
          onPress={handleRequestAllPermissions}
          disabled={loading}
        >
          <Text style={styles.requestButtonText}>
            {loading ? 'Setting Up...' : 'Grant Permissions'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={[styles.skipButtonText, { color: theme.secondaryText }]}>
            Skip for Now
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  permissionsContainer: {
    marginBottom: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
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
    marginRight: 8,
  },
  optionalBadge: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  permissionDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  statusContainer: {
    marginLeft: 10,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  requestButton: {
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
  },
});