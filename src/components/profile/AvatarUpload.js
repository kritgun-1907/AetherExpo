// src/components/profile/AvatarUpload.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import storageService from '../../services/StorageService';
import { useTheme } from '../../context/ThemeContext';

export default function AvatarUpload({ userId, currentAvatarUrl, onAvatarUpdated }) {
  const { theme, isDarkMode } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);

  const handleAvatarPress = () => {
    Alert.alert(
      'Update Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Remove Photo', onPress: removePhoto, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      setUploading(true);
      const result = await storageService.pickAndUploadAvatar(userId);
      
      if (result.success) {
        setAvatarUrl(result.url);
        if (onAvatarUpdated) {
          onAvatarUpdated(result.url);
        }
        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const uploadAvatar = async (imageUri) => {
    try {
      setUploading(true);
      const result = await storageService.uploadAvatar(userId, imageUri);
      
      if (result.success) {
        setAvatarUrl(result.url);
        if (onAvatarUpdated) {
          onAvatarUpdated(result.url);
        }
        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploading(true);
              // Update profile to remove avatar
              const { error } = await supabase
                .from('user_profiles')
                .update({ 
                  avatar_url: null,
                  storage_avatar_path: null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', userId);

              if (!error) {
                setAvatarUrl(null);
                if (onAvatarUpdated) {
                  onAvatarUpdated(null);
                }
                Alert.alert('Success', 'Profile picture removed successfully!');
              } else {
                Alert.alert('Error', 'Failed to remove profile picture');
              }
            } catch (error) {
              console.error('Error removing avatar:', error);
              Alert.alert('Error', 'Failed to remove profile picture. Please try again.');
            } finally {
              setUploading(false);
            }
          }
        }
      ]
    );
  };

  const getUserInitial = () => {
    // You can pass the user's name as a prop if needed
    return 'U';
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handleAvatarPress}
      disabled={uploading}
    >
      <View style={[
        styles.avatarContainer,
        { 
          backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : theme.accentText,
          borderColor: theme.accentText
        }
      ]}>
        {uploading ? (
          <ActivityIndicator size="large" color={theme.accentText} />
        ) : avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <Text style={[styles.avatarText, { color: theme.buttonText }]}>
            {getUserInitial()}
          </Text>
        )}
        
        <View style={[
          styles.cameraButton,
          { backgroundColor: theme.accentText }
        ]}>
          <Ionicons name="camera" size={20} color="#FFFFFF" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    position: 'relative',
  },
  avatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
});