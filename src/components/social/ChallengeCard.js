// src/components/social/ChallengeCard.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../styles/colors';
import { Typography, FontWeight } from '../../styles/fonts';
import { Shadows, BorderRadius, Spacing } from '../../styles/globalStyles';

export default function ChallengeCard({ 
  challenge, 
  onJoin, 
  onShare, 
  onViewDetails,
  isJoined = false 
}) {
  const { theme, isDarkMode } = useTheme();
  
  const getProgressColor = () => {
    const percentage = (challenge.currentProgress / challenge.targetValue) * 100;
    if (percentage >= 100) return Colors.success;
    if (percentage >= 75) return Colors.primary;
    if (percentage >= 50) return Colors.warning;
    return Colors.gray[400];
  };

  const getDaysRemaining = () => {
    const endDate = new Date(challenge.endDate);
    const today = new Date();
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const progressPercentage = Math.min(
    (challenge.currentProgress / challenge.targetValue) * 100, 
    100
  );

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? Colors.dark.card : Colors.white,
          borderColor: isJoined ? Colors.primary : theme.border,
          borderWidth: isJoined ? 2 : 1,
        }
      ]}
      onPress={onViewDetails}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.emoji}>{challenge.emoji}</Text>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: theme.primaryText }]}>
              {challenge.title}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={14} color={theme.secondaryText} />
                <Text style={[styles.metaText, { color: theme.secondaryText }]}>
                  {challenge.participantCount || 0}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={theme.secondaryText} />
                <Text style={[styles.metaText, { color: theme.secondaryText }]}>
                  {getDaysRemaining()}d left
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        {isJoined && (
          <View style={[styles.joinedBadge, { backgroundColor: Colors.primaryBackground }]}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
            <Text style={[styles.joinedText, { color: Colors.primary }]}>Joined</Text>
          </View>
        )}
      </View>

      {/* Description */}
      <Text 
        style={[styles.description, { color: theme.secondaryText }]}
        numberOfLines={2}
      >
        {challenge.description}
      </Text>

      {/* Progress Bar (if joined) */}
      {isJoined && (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: theme.secondaryText }]}>
              Your Progress
            </Text>
            <Text style={[styles.progressValue, { color: theme.primaryText }]}>
              {challenge.currentProgress}/{challenge.targetValue} {challenge.targetUnit}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.divider }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${progressPercentage}%`,
                  backgroundColor: getProgressColor()
                }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Reward */}
      <View style={styles.rewardContainer}>
        <View style={styles.rewardLeft}>
          <Ionicons name="trophy-outline" size={16} color={Colors.accent} />
          <Text style={[styles.rewardText, { color: theme.primaryText }]}>
            {challenge.rewardTokens} tokens
          </Text>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {!isJoined ? (
            <TouchableOpacity 
              style={[styles.joinButton, { backgroundColor: Colors.primary }]}
              onPress={onJoin}
            >
              <Text style={styles.joinButtonText}>Join Challenge</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.shareButton, { borderColor: theme.border }]}
              onPress={onShare}
            >
              <Ionicons name="share-social-outline" size={18} color={theme.primaryText} />
              <Text style={[styles.shareButtonText, { color: theme.primaryText }]}>
                Share
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Challenge Type Badge */}
      <View style={[
        styles.typeBadge,
        {
          backgroundColor: challenge.challengeType === 'global' 
            ? Colors.primary 
            : challenge.challengeType === 'group'
            ? Colors.secondary
            : Colors.accent,
        }
      ]}>
        <Text style={styles.typeBadgeText}>
          {challenge.challengeType.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    ...Shadows.medium,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  emoji: {
    fontSize: 32,
    marginRight: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...Typography.h6,
    fontWeight: FontWeight.semiBold,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  metaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  joinedText: {
    fontSize: 12,
    fontWeight: FontWeight.medium,
    marginLeft: 4,
  },
  description: {
    ...Typography.bodySmall,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: FontWeight.medium,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  rewardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 14,
    fontWeight: FontWeight.medium,
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  joinButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  joinButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: FontWeight.medium,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  shareButtonText: {
    fontSize: 14,
    marginLeft: 6,
  },
  typeBadge: {
    position: 'absolute',
    top: -8,
    right: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  typeBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
});