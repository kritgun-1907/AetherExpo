import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image
} from 'react-native';
import { Card, Button } from 'react-native-elements';
import { useCarbonStore } from '../../store/carbonStore';

const HomeScreen = ({ navigation }) => {
  const { dailyEmissions, weeklyGoal, achievements } = useCarbonStore();
  const [userName, setUserName] = useState('User');

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {userName}! 👋</Text>
        <Text style={styles.subGreeting}>
          Let's track your carbon footprint today
        </Text>
      </View>

      {/* Today's Carbon Card */}
      <Card containerStyle={styles.card}>
        <Text style={styles.cardTitle}>Today's Emissions</Text>
        <View style={styles.emissionContainer}>
          <Text style={styles.emissionNumber}>{dailyEmissions}</Text>
          <Text style={styles.emissionUnit}>kg CO₂e</Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(dailyEmissions / weeklyGoal) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.goalText}>
          Goal: Stay under {weeklyGoal}kg this week
        </Text>
      </Card>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Tracking')}
        >
          <Text style={styles.actionIcon}>🚗</Text>
          <Text style={styles.actionText}>Transport</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>🍽️</Text>
          <Text style={styles.actionText}>Food</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>🏠</Text>
          <Text style={styles.actionText}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>🛍️</Text>
          <Text style={styles.actionText}>Shopping</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Achievements */}
      <Card containerStyle={styles.card}>
        <Text style={styles.cardTitle}>Recent Achievements 🏆</Text>
        {achievements.slice(0, 3).map((achievement, index) => (
          <View key={index} style={styles.achievementItem}>
            <Text style={styles.achievementEmoji}>{achievement.emoji}</Text>
            <View>
              <Text style={styles.achievementName}>{achievement.name}</Text>
              <Text style={styles.achievementDesc}>{achievement.description}</Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Action Button */}
      <Button
        title="Track New Activity"
        buttonStyle={styles.trackButton}
        onPress={() => navigation.navigate('Tracking')}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4'
  },
  header: {
    padding: 20,
    paddingTop: 40
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#065F46'
  },
  subGreeting: {
    fontSize: 16,
    color: '#047857',
    marginTop: 5
  },
  card: {
    borderRadius: 15,
    marginHorizontal: 15,
    marginVertical: 10,
    elevation: 3
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#064E3B',
    marginBottom: 15
  },
  emissionContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center'
  },
  emissionNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#10B981'
  },
  emissionUnit: {
    fontSize: 18,
    color: '#6B7280',
    marginLeft: 5
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginVertical: 15
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4
  },
  goalText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    marginVertical: 20
  },
  actionButton: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 75,
    elevation: 2
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 5
  },
  actionText: {
    fontSize: 12,
    color: '#374151'
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  achievementEmoji: {
    fontSize: 30,
    marginRight: 15
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827'
  },
  achievementDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  trackButton: {
    backgroundColor: '#10B981',
    borderRadius: 25,
    paddingVertical: 15,
    marginHorizontal: 15,
    marginVertical: 20
  }
});

export default HomeScreen;