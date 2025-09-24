// src/components/carbon/ActivityTracker.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../api/supabase';
import { Colors } from '../../styles/colors';
import { Typography, FontWeight } from '../../styles/fonts';
import { Shadows, BorderRadius, Spacing } from '../../styles/globalStyles';

const ACTIVITY_TYPES = {
  transport: {
    icon: 'car-outline',
    color: Colors.primary,
    activities: [
      { id: 'car_petrol', label: 'Car (Petrol)', factor: 0.21, unit: 'km' },
      { id: 'car_diesel', label: 'Car (Diesel)', factor: 0.17, unit: 'km' },
      { id: 'car_electric', label: 'Car (Electric)', factor: 0.05, unit: 'km' },
      { id: 'bus', label: 'Bus', factor: 0.089, unit: 'km' },
      { id: 'train', label: 'Train', factor: 0.041, unit: 'km' },
      { id: 'plane_domestic', label: 'Flight (Domestic)', factor: 0.255, unit: 'km' },
      { id: 'plane_international', label: 'Flight (International)', factor: 0.195, unit: 'km' },
      { id: 'motorcycle', label: 'Motorcycle', factor: 0.113, unit: 'km' },
      { id: 'uber_taxi', label: 'Uber/Taxi', factor: 0.21, unit: 'km' },
    ],
  },
  energy: {
    icon: 'flash-outline',
    color: Colors.warning,
    activities: [
      { id: 'electricity', label: 'Electricity Usage', factor: 0.5, unit: 'kWh' },
      { id: 'natural_gas', label: 'Natural Gas', factor: 2.04, unit: 'm³' },
      { id: 'heating_oil', label: 'Heating Oil', factor: 2.52, unit: 'L' },
      { id: 'propane', label: 'Propane', factor: 1.51, unit: 'L' },
    ],
  },
  food: {
    icon: 'restaurant-outline',
    color: Colors.success,
    activities: [
      { id: 'beef', label: 'Beef', factor: 60, unit: 'kg' },
      { id: 'lamb', label: 'Lamb', factor: 24, unit: 'kg' },
      { id: 'pork', label: 'Pork', factor: 7.19, unit: 'kg' },
      { id: 'chicken', label: 'Chicken', factor: 6.9, unit: 'kg' },
      { id: 'fish', label: 'Fish', factor: 6.1, unit: 'kg' },
      { id: 'dairy', label: 'Dairy Products', factor: 3.2, unit: 'L' },
      { id: 'vegetables', label: 'Vegetables', factor: 2, unit: 'kg' },
      { id: 'fruits', label: 'Fruits', factor: 1.1, unit: 'kg' },
    ],
  },
  consumption: {
    icon: 'bag-outline',
    color: Colors.accent,
    activities: [
      { id: 'clothing_cotton', label: 'Cotton Clothing', factor: 8.11, unit: 'item' },
      { id: 'clothing_synthetic', label: 'Synthetic Clothing', factor: 9.52, unit: 'item' },
      { id: 'electronics_phone', label: 'Smartphone', factor: 70, unit: 'item' },
      { id: 'electronics_laptop', label: 'Laptop', factor: 300, unit: 'item' },
      { id: 'furniture_wood', label: 'Wooden Furniture', factor: 25, unit: 'item' },
      { id: 'books_paper', label: 'Books/Paper', factor: 2.3, unit: 'kg' },
    ],
  },
};

export default function ActivityTracker({ onActivityAdded }) {
  const { theme, isDarkMode } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('transport');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecentActivities();
  }, []);

  const loadRecentActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load recent activities from Supabase
      const { data: activities, error } = await supabase
        .from('carbon_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading activities:', error);
        return;
      }

      setRecentActivities(activities || []);
    } catch (error) {
      console.error('Error loading recent activities:', error);
    }
  };

  const handleActivitySelect = (activity) => {
    setSelectedActivity(activity);
    setModalVisible(true);
  };

  const handleAddActivity = async () => {
    if (!selectedActivity || !amount) {
      Alert.alert('Missing Information', 'Please enter the amount for this activity.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive number.');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to add activities.');
        return;
      }

      const carbonEmissions = numericAmount * selectedActivity.factor;
      
      const activityData = {
        user_id: user.id,
        category: selectedCategory,
        activity_type: selectedActivity.id,
        activity_name: selectedActivity.label,
        amount: numericAmount,
        unit: selectedActivity.unit,
        carbon_kg: carbonEmissions,
        description: description.trim() || null,
        created_at: new Date().toISOString(),
      };

      // Save to Supabase
      const { error } = await supabase
        .from('carbon_activities')
        .insert([activityData]);

      if (error) {
        console.error('Error saving activity:', error);
        Alert.alert('Error', 'Failed to save activity. Please try again.');
        return;
      }

      // Update recent activities
      setRecentActivities([activityData, ...recentActivities.slice(0, 9)]);
      
      // Callback to parent component
      onActivityAdded?.(activityData);

      Alert.alert(
        'Activity Added!',
        `Added ${numericAmount} ${selectedActivity.unit} of ${selectedActivity.label}\nCarbon emissions: ${carbonEmissions.toFixed(2)} kg CO₂`
      );

      // Reset form
      setAmount('');
      setDescription('');
      setModalVisible(false);
    } catch (error) {
      console.error('Error adding activity:', error);
      Alert.alert('Error', 'Failed to add activity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const CategoryButton = ({ categoryKey, category }) => {
    const isSelected = selectedCategory === categoryKey;
    return (
      <TouchableOpacity
        style={[
          styles.categoryButton,
          {
            backgroundColor: isSelected
              ? category.color
              : isDarkMode
              ? 'rgba(255, 255, 255, 0.1)'
              : theme.cardBackground,
            borderColor: isSelected ? category.color : theme.border,
          },
        ]}
        onPress={() => setSelectedCategory(categoryKey)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={category.icon}
          size={24}
          color={isSelected ? Colors.white : category.color}
        />
        <Text
          style={[
            styles.categoryButtonText,
            {
              color: isSelected ? Colors.white : theme.primaryText,
            },
          ]}
        >
          {categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)}
        </Text>
      </TouchableOpacity>
    );
  };

  const ActivityCard = ({ activity }) => (
    <TouchableOpacity
      style={[
        styles.activityCard,
        {
          backgroundColor: isDarkMode
            ? 'rgba(255, 255, 255, 0.05)'
            : theme.cardBackground,
          borderColor: theme.border,
        },
      ]}
      onPress={() => handleActivitySelect(activity)}
      activeOpacity={0.7}
    >
      <View style={styles.activityHeader}>
        <Text style={[styles.activityName, { color: theme.primaryText }]}>
          {activity.label}
        </Text>
        <Text style={[styles.activityFactor, { color: theme.secondaryText }]}>
          {activity.factor} kg CO₂/{activity.unit}
        </Text>
      </View>
      <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
    </TouchableOpacity>
  );

  const RecentActivityCard = ({ activity }) => {
    const categoryData = ACTIVITY_TYPES[activity.category];
    const activityDate = new Date(activity.created_at).toLocaleDateString();
    
    return (
      <View
        style={[
          styles.recentActivityCard,
          {
            backgroundColor: isDarkMode
              ? 'rgba(255, 255, 255, 0.05)'
              : theme.cardBackground,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.recentActivityHeader}>
          <Ionicons
            name={categoryData?.icon || 'ellipse-outline'}
            size={20}
            color={categoryData?.color || Colors.gray[500]}
          />
          <View style={styles.recentActivityInfo}>
            <Text style={[styles.recentActivityName, { color: theme.primaryText }]}>
              {activity.activity_name}
            </Text>
            <Text style={[styles.recentActivityDate, { color: theme.secondaryText }]}>
              {activityDate}
            </Text>
          </View>
        </View>
        <View style={styles.recentActivityDetails}>
          <Text style={[styles.recentActivityAmount, { color: theme.primaryText }]}>
            {activity.amount} {activity.unit}
          </Text>
          <Text style={[styles.recentActivityCarbon, { color: Colors.primary }]}>
            {activity.carbon_kg.toFixed(2)} kg CO₂
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Category Selection */}
      <View style={styles.categoryContainer}>
        <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
          Select Category
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {Object.entries(ACTIVITY_TYPES).map(([key, category]) => (
            <CategoryButton
              key={key}
              categoryKey={key}
              category={category}
            />
          ))}
        </ScrollView>
      </View>

      {/* Activities List */}
      <View style={styles.activitiesContainer}>
        <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
          Add Activity
        </Text>
        <FlatList
          data={ACTIVITY_TYPES[selectedCategory].activities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ActivityCard activity={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.activitiesList}
        />
      </View>

      {/* Recent Activities */}
      {recentActivities.length > 0 && (
        <View style={styles.recentContainer}>
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
            Recent Activities
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentScroll}
          >
            {recentActivities.slice(0, 5).map((activity, index) => (
              <RecentActivityCard key={`${activity.id || index}`} activity={activity} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Add Activity Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={theme.primaryText} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.primaryText }]}>
              Add Activity
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedActivity && (
            <ScrollView style={styles.modalContent}>
              <View
                style={[
                  styles.activityInfoCard,
                  {
                    backgroundColor: isDarkMode
                      ? 'rgba(255, 255, 255, 0.1)'
                      : theme.cardBackground,
                    borderColor: ACTIVITY_TYPES[selectedCategory].color,
                  },
                ]}
              >
                <Ionicons
                  name={ACTIVITY_TYPES[selectedCategory].icon}
                  size={32}
                  color={ACTIVITY_TYPES[selectedCategory].color}
                />
                <Text style={[styles.selectedActivityName, { color: theme.primaryText }]}>
                  {selectedActivity.label}
                </Text>
                <Text style={[styles.selectedActivityFactor, { color: theme.secondaryText }]}>
                  {selectedActivity.factor} kg CO₂ per {selectedActivity.unit}
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.primaryText }]}>
                    Amount ({selectedActivity.unit})
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: isDarkMode
                          ? 'rgba(255, 255, 255, 0.1)'
                          : theme.divider,
                        color: theme.primaryText,
                        borderColor: theme.border,
                      },
                    ]}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder={`Enter ${selectedActivity.unit}`}
                    placeholderTextColor={theme.secondaryText}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.primaryText }]}>
                    Description (Optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.descriptionInput,
                      {
                        backgroundColor: isDarkMode
                          ? 'rgba(255, 255, 255, 0.1)'
                          : theme.divider,
                        color: theme.primaryText,
                        borderColor: theme.border,
                      },
                    ]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Add a note about this activity..."
                    placeholderTextColor={theme.secondaryText}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                {amount && (
                  <View
                    style={[
                      styles.calculationCard,
                      {
                        backgroundColor: isDarkMode
                          ? 'rgba(16, 185, 129, 0.1)'
                          : Colors.primaryBackground,
                        borderColor: Colors.primary,
                      },
                    ]}
                  >
                    <Text style={[styles.calculationTitle, { color: Colors.primary }]}>
                      Estimated Emissions
                    </Text>
                    <Text style={[styles.calculationValue, { color: Colors.primary }]}>
                      {(parseFloat(amount) * selectedActivity.factor).toFixed(2)} kg CO₂
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}

          <View style={[styles.modalFooter, { backgroundColor: theme.background }]}>
            <TouchableOpacity
              style={[
                styles.addButton,
                {
                  backgroundColor: Colors.primary,
                  opacity: (!amount || loading) ? 0.6 : 1,
                },
              ]}
              onPress={handleAddActivity}
              disabled={!amount || loading}
            >
              <Text style={styles.addButtonText}>
                {loading ? 'Adding...' : 'Add Activity'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Category Selection
  categoryContainer: {
    paddingVertical: Spacing.md,
  },
  categoryScroll: {
    paddingHorizontal: Spacing.md,
  },
  categoryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    minWidth: 80,
  },
  categoryButtonText: {
    ...Typography.captionSmall,
    fontWeight: FontWeight.medium,
    marginTop: Spacing.xs,
  },

  // Section Titles
  sectionTitle: {
    ...Typography.h6,
    fontWeight: FontWeight.semiBold,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.md,
  },

  // Activities
  activitiesContainer: {
    flex: 1,
  },
  activitiesList: {
    paddingHorizontal: Spacing.md,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    ...Shadows.small,
  },
  activityHeader: {
    flex: 1,
  },
  activityName: {
    ...Typography.body,
    fontWeight: FontWeight.medium,
    marginBottom: 2,
  },
  activityFactor: {
    ...Typography.captionSmall,
  },

  // Recent Activities
  recentContainer: {
    paddingVertical: Spacing.md,
  },
  recentScroll: {
    paddingHorizontal: Spacing.md,
  },
  recentActivityCard: {
    width: 200,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  recentActivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  recentActivityInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  recentActivityName: {
    ...Typography.bodySmall,
    fontWeight: FontWeight.medium,
  },
  recentActivityDate: {
    ...Typography.captionSmall,
  },
  recentActivityDetails: {
    alignItems: 'flex-end',
  },
  recentActivityAmount: {
    ...Typography.bodySmall,
    fontWeight: FontWeight.medium,
  },
  recentActivityCarbon: {
    ...Typography.captionSmall,
    fontWeight: FontWeight.semiBold,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalCloseButton: {
    padding: Spacing.sm,
  },
  modalTitle: {
    ...Typography.h5,
    fontWeight: FontWeight.semiBold,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  
  // Activity Info Card
  activityInfoCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    marginBottom: Spacing.lg,
  },
  selectedActivityName: {
    ...Typography.h6,
    fontWeight: FontWeight.semiBold,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  selectedActivityFactor: {
    ...Typography.body,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },

  // Form
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.bodySmall,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.sm,
  },
  textInput: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    ...Typography.body,
  },
  descriptionInput: {
    minHeight: 80,
    paddingTop: Spacing.sm,
  },

  // Calculation Card
  calculationCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  calculationTitle: {
    ...Typography.bodySmall,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
  calculationValue: {
    ...Typography.h5,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },

  // Modal Footer
  modalFooter: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  addButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
  addButtonText: {
    color: Colors.white,
    ...Typography.body,
    fontWeight: FontWeight.semiBold,
  },
});