import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput
} from 'react-native';
import { supabase, addEmission } from './src/api/supabase';
import { useCarbonStore } from './src/store/carbonStore';

export default function HomeScreen() {
  const { dailyEmissions, weeklyGoal, achievements, addEmission: storeAddEmission } = useCarbonStore();
  const [userName, setUserName] = useState('User');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [emissionAmount, setEmissionAmount] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserName(user.email.split('@')[0]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const categories = [
    { icon: '🚗', name: 'Transport', factor: 0.21 },
    { icon: '🍽️', name: 'Food', factor: 0.15 },
    { icon: '🏠', name: 'Home', factor: 0.12 },
    { icon: '🛍️', name: 'Shopping', factor: 0.25 }
  ];

  const handleQuickAdd = (category) => {
    setSelectedCategory(category);
    setModalVisible(true);
  };

  const submitEmission = async () => {
    if (!emissionAmount || isNaN(emissionAmount)) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const amount = parseFloat(emissionAmount);
    const category = categories.find(c => c.name === selectedCategory);
    const co2Amount = amount * category.factor;

    // Add to store
    storeAddEmission(co2Amount, selectedCategory);

    // Add to database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await addEmission(user.id, selectedCategory, co2Amount);
    }

    Alert.alert('Success!', `Added ${co2Amount.toFixed(2)}kg CO₂e`);
    setModalVisible(false);
    setEmissionAmount('');
  };

  const getProgressColor = () => {
    const percentage = (dailyEmissions / weeklyGoal) * 100;
    if (percentage < 50) return '#10B981';
    if (percentage < 80) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {userName}! 👋</Text>
        <Text style={styles.subGreeting}>
          Let's track your carbon footprint today
        </Text>
      </View>

      {/* Today's Carbon Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Emissions</Text>
        <View style={styles.emissionContainer}>
          <Text style={styles.emissionNumber}>{dailyEmissions.toFixed(1)}</Text>
          <Text style={styles.emissionUnit}>kg CO₂e</Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.min((dailyEmissions / 10) * 100, 100)}%`,
                backgroundColor: getProgressColor()
              }
            ]} 
          />
        </View>
        <Text style={styles.goalText}>
          Daily goal: Stay under 10kg
        </Text>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Add</Text>
      <View style={styles.quickActions}>
        {categories.map((category) => (
          <TouchableOpacity 
            key={category.name}
            style={styles.actionButton}
            onPress={() => handleQuickAdd(category.name)}
          >
            <Text style={styles.actionIcon}>{category.icon}</Text>
            <Text style={styles.actionText}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Achievements */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Achievements 🏆</Text>
        {achievements.length > 0 ? (
          achievements.slice(0, 3).map((achievement, index) => (
            <View key={index} style={styles.achievementItem}>
              <Text style={styles.achievementEmoji}>{achievement.emoji}</Text>
              <View style={styles.achievementTextContainer}>
                <Text style={styles.achievementName}>{achievement.name}</Text>
                <Text style={styles.achievementDesc}>{achievement.description}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No achievements yet. Keep tracking!</Text>
        )}
      </View>

      {/* Tips Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💡 Daily Tip</Text>
        <Text style={styles.tipText}>
          Take public transport instead of driving to reduce your carbon footprint by up to 2.2kg per trip!
        </Text>
      </View>

      {/* Add Emission Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add {selectedCategory} Activity</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder={
                selectedCategory === 'Transport' ? 'Distance (km)' :
                selectedCategory === 'Food' ? 'Meals count' :
                selectedCategory === 'Home' ? 'Hours of usage' :
                'Number of items'
              }
              placeholderTextColor="#9CA3AF"
              value={emissionAmount}
              onChangeText={setEmissionAmount}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setEmissionAmount('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitEmission}
              >
                <Text style={styles.submitButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4'
  },
  header: {
    padding: 20,
    paddingTop: 60
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
    backgroundColor: 'white',
    borderRadius: 15,
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    borderRadius: 4
  },
  goalText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#064E3B',
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 10
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    marginBottom: 10
  },
  actionButton: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  achievementTextContainer: {
    flex: 1
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
  emptyText: {
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 10
  },
  tipText: {
    color: '#374151',
    lineHeight: 20
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 20,
    textAlign: 'center'
  },
  modalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 20
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 10
  },
  submitButton: {
    backgroundColor: '#10B981',
    marginLeft: 10
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '600'
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600'
  }
});