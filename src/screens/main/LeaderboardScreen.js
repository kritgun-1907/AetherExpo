// src/screens/main/LeaderboardScreen.js - WITH OVERLAY EFFECT
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  ImageBackground, 
  StatusBar 
} from 'react-native';
import { supabase } from '../../api/supabase';
import { useTheme } from '../../context/ThemeContext';

// Add the same background image import as HomeScreen
const BACKGROUND_IMAGE = require('../../../assets/hero-carbon-tracker.jpg');

export default function LeaderboardScreen() {
  // State hooks - make sure they're at the top level
  const [users, setUsers] = useState([
    { id: 1, name: 'John', emissions: 8.5 },
    { id: 2, name: 'Sarah', emissions: 6.2 },
    { id: 3, name: 'You', emissions: 7.1, isCurrentUser: true },
  ]);
  const [loading, setLoading] = useState(false);
  
  // Theme hook - make sure it's called unconditionally
  const { theme, isDarkMode } = useTheme();
  
  // Fallback in case isDarkMode is not available
  const darkMode = isDarkMode || theme?.name === 'dark' || false;

  // Effect hook - make sure it's called unconditionally
  useEffect(() => {
    loadLeaderboardData();
  }, []);

  const loadLeaderboardData = async () => {
    try {
      setLoading(true);
      // Add real leaderboard loading logic here
      console.log('Loading leaderboard data...');
      
      // Example: Load real data from Supabase
      // const { data, error } = await supabase
      //   .from('user_emissions')
      //   .select('*')
      //   .order('total_emissions', { ascending: true });
      
      // if (data && !error) {
      //   setUsers(data);
      // }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.statusBarStyle} backgroundColor="transparent" translucent />
        
        {/* Add overlay effect for loading state too */}
        {darkMode && (
          <>
            <ImageBackground 
              source={BACKGROUND_IMAGE} 
              resizeMode="cover" 
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.overlayBackground }]} />
          </>
        )}

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accentText} />
          <Text style={[styles.loadingText, { color: theme.primaryText }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor="transparent" translucent />
      
      {/* Add the same overlay effect as HomeScreen */}
      {darkMode && (
        <>
          <ImageBackground 
            source={BACKGROUND_IMAGE} 
            resizeMode="cover" 
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.overlayBackground }]} />
        </>
      )}

      <Text style={[styles.title, { color: theme.primaryText }]}>Leaderboard</Text>
      <FlatList
        data={users.sort((a, b) => a.emissions - b.emissions)}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={true}
        indicatorStyle={darkMode ? "white" : "black"}
        scrollIndicatorInsets={{ right: 1 }}
        renderItem={({ item, index }) => (
          <View style={[
            styles.card,
            {
              backgroundColor: darkMode ? 'rgba(55, 65, 81, 0.7)' : theme.cardBackground,
              borderColor: darkMode ? 'rgba(16, 185, 129, 0.2)' : theme.border,
            },
            item.isCurrentUser && {
              backgroundColor: darkMode ? 'rgba(16, 185, 129, 0.3)' : '#D1FAE5',
              borderColor: theme.accentText,
            }
          ]}>
            <Text style={[styles.rank, { color: theme.accentText }]}>#{index + 1}</Text>
            <Text style={[styles.name, { color: theme.primaryText }]}>{item.name}</Text>
            <Text style={[styles.emissions, { color: theme.accentText }]}>{item.emissions}kg CO₂</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 60 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    padding: 20 
  },
  card: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginVertical: 5,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: darkMode ? 'transparent' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: darkMode ? 0 : 0.1,
    shadowRadius: 3,
    elevation: darkMode ? 0 : 3,
  },
  rank: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    width: 40 
  },
  name: { 
    flex: 1, 
    fontSize: 16 
  },
  emissions: { 
    fontSize: 16, 
    fontWeight: '600' 
  },
});