// src/context/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Define your light and dark themes
const lightTheme = {
  // Background colors
  background: '#F0FDF4',
  cardBackground: '#FFFFFF',
  overlayBackground: 'rgba(0, 0, 0, 0.1)',
  
  // Text colors
  primaryText: '#111827',
  secondaryText: '#6B7280',
  accentText: '#10B981',
  
  // Border and divider colors
  border: '#E5E7EB',
  divider: '#F3F4F6',
  
  // Tab bar colors
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  tabBarActive: '#10B981',
  tabBarInactive: '#6B7280',
  
  // Button colors
  buttonBackground: '#10B981',
  buttonText: '#FFFFFF',
  
  // Status bar
  statusBarStyle: 'dark-content',
};

const darkTheme = {
  // Background colors
  background: '#111827',
  cardBackground: 'rgba(55, 65, 81, 0.8)',
  overlayBackground: 'rgba(17, 24, 39, 0.9)',
  
  // Text colors
  primaryText: '#F9FAFB',
  secondaryText: '#D1D5DB',
  accentText: '#10B981',
  
  // Border and divider colors
  border: 'rgba(75, 85, 99, 0.3)',
  divider: 'rgba(55, 65, 81, 0.5)',
  
  // Tab bar colors
  tabBarBackground: '#1F2937',
  tabBarBorder: '#374151',
  tabBarActive: '#10B981',
  tabBarInactive: '#9CA3AF',
  
  // Button colors
  buttonBackground: '#10B981',
  buttonText: '#FFFFFF',
  
  // Status bar
  statusBarStyle: 'light-content',
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('isDarkMode');
      if (savedTheme !== null) {
        setIsDarkMode(JSON.parse(savedTheme));
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('isDarkMode', JSON.stringify(newTheme));
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  const value = {
    theme,
    isDarkMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};