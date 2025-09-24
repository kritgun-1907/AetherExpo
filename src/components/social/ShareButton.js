// src/components/social/ShareButton.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../styles/colors';
import { Typography, FontWeight } from '../../styles/fonts';
import { BorderRadius, Spacing } from '../../styles/globalStyles';

export default function ShareButton({
  content,
  type = 'achievement', // 'achievement', 'challenge', 'progress', 'offset'
  title,
  message,
  url,
  style,
  size = 'medium', // 'small', 'medium', 'large'
  variant = 'primary', // 'primary', 'secondary', 'ghost'
  showLabel = true,
  onShareComplete,
}) {
  const { theme, isDarkMode } = useTheme();
  const [isSharing, setIsSharing] = useState(false);

  // Generate share content based on type
  const generateShareContent = () => {
    const baseUrl = 'https://aetherapp.co';
    
    const contentTemplates = {
      achievement: {
        title: title || '🏆 Achievement Unlocked!',
        message: message || `Just earned a new achievement in Aether! ${content || 'Making progress on my carbon reduction journey.'} 🌱`,
        hashtags: '#CarbonNeutral #ClimateAction #Sustainability #AetherApp',
      },
      challenge: {
        title: title || '🌍 Climate Challenge',
        message: message || `Taking on a new carbon reduction challenge! ${content || 'Join me in making a difference.'} 💚`,
        hashtags: '#ClimateChallenge #CarbonReduction #EcoFriendly #AetherApp',
      },
      progress: {
        title: title || '📊 My Carbon Progress',
        message: message || `Check out my carbon footprint reduction progress! ${content || 'Every small step counts.'} 🌿`,
        hashtags: '#CarbonFootprint #Progress #ClimateAction #AetherApp',
      },
      offset: {
        title: title || '🌳 Carbon Offset',
        message: message || `Just purchased carbon offsets to neutralize my impact! ${content || 'Taking responsibility for my carbon footprint.'} 🌍`,
        hashtags: '#CarbonOffset #ClimatePositive #Sustainability #AetherApp',
      },
    };

    const template = contentTemplates[type] || contentTemplates.achievement;
    
    return {
      title: template.title,
      message: `${template.message}\n\n${template.hashtags}`,
      url: url || `${baseUrl}?ref=share`,
    };
  };

  const handleShare = async () => {
    if (isSharing) return;
    
    setIsSharing(true);
    
    try {
      const shareContent = generateShareContent();
      
      if (Platform.OS === 'ios') {
        // iOS Action Sheet with more options
        const options = [
          'Share via Messages',
          'Share via Mail',
          'Copy Link',
          'More Options...',
          'Cancel'
        ];
        
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex: 4,
          },
          async (buttonIndex) => {
            switch (buttonIndex) {
              case 0: // Messages
                await shareToMessages(shareContent);
                break;
              case 1: // Mail
                await shareToMail(shareContent);
                break;
              case 2: // Copy Link
                await copyToClipboard(shareContent);
                break;
              case 3: // More Options
                await shareGeneric(shareContent);
                break;
              default:
                break;
            }
          }
        );
      } else {
        // Android - show custom options or use generic share
        await showAndroidOptions(shareContent);
      }
      
      onShareComplete?.();
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Share Failed', 'Unable to share content. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const shareGeneric = async (shareContent) => {
    try {
      const result = await Share.share({
        title: shareContent.title,
        message: shareContent.message,
        url: shareContent.url,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('Shared via:', result.activityType);
        } else {
          console.log('Shared');
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const shareToMessages = async (shareContent) => {
    // On iOS, this would open Messages app with pre-filled content
    // For now, use generic share which will include Messages as an option
    await shareGeneric(shareContent);
  };

  const shareToMail = async (shareContent) => {
    // On iOS, this would open Mail app with pre-filled content
    // For now, use generic share which will include Mail as an option
    await shareGeneric(shareContent);
  };

  const copyToClipboard = async (shareContent) => {
    const textToCopy = `${shareContent.title}\n\n${shareContent.message}\n\n${shareContent.url}`;
    await Clipboard.setStringAsync(textToCopy);
    Alert.alert('Copied!', 'Content copied to clipboard.');
  };

  const showAndroidOptions = async (shareContent) => {
    Alert.alert(
      'Share Options',
      'How would you like to share?',
      [
        {
          text: 'Share Link',
          onPress: () => shareGeneric(shareContent),
        },
        {
          text: 'Copy Link',
          onPress: () => copyToClipboard(shareContent),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Button size configurations
  const sizeConfigs = {
    small: {
      iconSize: 16,
      padding: 8,
      fontSize: 12,
    },
    medium: {
      iconSize: 20,
      padding: 12,
      fontSize: 14,
    },
    large: {
      iconSize: 24,
      padding: 16,
      fontSize: 16,
    },
  };

  const currentSize = sizeConfigs[size];

  // Button variant styles
  const getButtonStyle = () => {
    const baseStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.md,
      paddingHorizontal: currentSize.padding * 1.5,
      paddingVertical: currentSize.padding,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: Colors.primary,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.cardBackground,
          borderWidth: 1,
          borderColor: theme.border,
        };
      case 'ghost':
      default:
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return Colors.white;
      case 'secondary':
        return theme.primaryText;
      case 'ghost':
      default:
        return theme.primaryText;
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'primary':
        return Colors.white;
      case 'secondary':
        return theme.secondaryText;
      case 'ghost':
      default:
        return theme.secondaryText;
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={handleShare}
      disabled={isSharing}
      activeOpacity={0.7}
    >
      <Ionicons
        name={isSharing ? "hourglass-outline" : "share-social-outline"}
        size={currentSize.iconSize}
        color={getIconColor()}
      />
      {showLabel && (
        <Text
          style={[
            styles.shareText,
            {
              color: getTextColor(),
              fontSize: currentSize.fontSize,
              marginLeft: Spacing.xs,
            },
          ]}
        >
          {isSharing ? 'Sharing...' : 'Share'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// Quick share buttons for specific social platforms
export const QuickShareButtons = ({ content, type, onShareComplete }) => {
  const { theme, isDarkMode } = useTheme();

  const platforms = [
    {
      name: 'Twitter',
      icon: 'logo-twitter',
      color: '#1DA1F2',
      action: async (shareContent) => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          shareContent.message
        )}&url=${encodeURIComponent(shareContent.url)}`;
        // In a real app, you'd use Linking.openURL(twitterUrl)
        await Clipboard.setStringAsync(twitterUrl);
        Alert.alert('Twitter', 'Twitter share link copied to clipboard!');
      },
    },
    {
      name: 'Facebook',
      icon: 'logo-facebook',
      color: '#4267B2',
      action: async (shareContent) => {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          shareContent.url
        )}&quote=${encodeURIComponent(shareContent.message)}`;
        await Clipboard.setStringAsync(facebookUrl);
        Alert.alert('Facebook', 'Facebook share link copied to clipboard!');
      },
    },
    {
      name: 'LinkedIn',
      icon: 'logo-linkedin',
      color: '#2867B2',
      action: async (shareContent) => {
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          shareContent.url
        )}`;
        await Clipboard.setStringAsync(linkedinUrl);
        Alert.alert('LinkedIn', 'LinkedIn share link copied to clipboard!');
      },
    },
    {
      name: 'WhatsApp',
      icon: 'logo-whatsapp',
      color: '#25D366',
      action: async (shareContent) => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
          `${shareContent.message} ${shareContent.url}`
        )}`;
        await Clipboard.setStringAsync(whatsappUrl);
        Alert.alert('WhatsApp', 'WhatsApp share link copied to clipboard!');
      },
    },
  ];

  const generateShareContent = () => {
    const baseUrl = 'https://aetherapp.co';
    
    const contentTemplates = {
      achievement: {
        title: '🏆 Achievement Unlocked!',
        message: `Just earned a new achievement in Aether! ${content || 'Making progress on my carbon reduction journey.'} 🌱`,
        hashtags: '#CarbonNeutral #ClimateAction #Sustainability',
      },
      challenge: {
        title: '🌍 Climate Challenge',
        message: `Taking on a new carbon reduction challenge! ${content || 'Join me in making a difference.'} 💚`,
        hashtags: '#ClimateChallenge #CarbonReduction #EcoFriendly',
      },
      progress: {
        title: '📊 My Carbon Progress',
        message: `Check out my carbon footprint reduction progress! ${content || 'Every small step counts.'} 🌿`,
        hashtags: '#CarbonFootprint #Progress #ClimateAction',
      },
      offset: {
        title: '🌳 Carbon Offset',
        message: `Just purchased carbon offsets to neutralize my impact! ${content || 'Taking responsibility for my carbon footprint.'} 🌍`,
        hashtags: '#CarbonOffset #ClimatePositive #Sustainability',
      },
    };

    const template = contentTemplates[type] || contentTemplates.achievement;
    
    return {
      title: template.title,
      message: `${template.message} ${template.hashtags}`,
      url: baseUrl,
    };
  };

  const handlePlatformShare = async (platform) => {
    try {
      const shareContent = generateShareContent();
      await platform.action(shareContent);
      onShareComplete?.();
    } catch (error) {
      console.error('Platform share error:', error);
      Alert.alert('Share Failed', `Unable to share to ${platform.name}. Please try again.`);
    }
  };

  return (
    <View style={styles.quickShareContainer}>
      <Text style={[styles.quickShareTitle, { color: theme.primaryText }]}>
        Share to:
      </Text>
      <View style={styles.platformButtons}>
        {platforms.map((platform) => (
          <TouchableOpacity
            key={platform.name}
            style={[
              styles.platformButton,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(255, 255, 255, 0.1)'
                  : theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
            onPress={() => handlePlatformShare(platform)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={platform.icon}
              size={24}
              color={platform.color}
            />
            <Text
              style={[
                styles.platformText,
                { color: theme.secondaryText },
              ]}
            >
              {platform.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shareText: {
    fontWeight: FontWeight.medium,
  },
  
  // Quick Share Buttons
  quickShareContainer: {
    paddingVertical: Spacing.md,
  },
  quickShareTitle: {
    ...Typography.body,
    fontWeight: FontWeight.semiBold,
    marginBottom: Spacing.sm,
  },
  platformButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  platformButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    width: '22%',
    aspectRatio: 1,
    marginBottom: Spacing.sm,
  },
  platformText: {
    ...Typography.captionSmall,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});