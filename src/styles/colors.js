// src/styles/colors.js

export const Colors = {
  // Primary Colors
  primary: '#10B981',        // Emerald green - main brand color
  primaryDark: '#059669',    // Darker emerald
  primaryLight: '#34D399',   // Lighter emerald
  primaryBackground: '#D1FAE5', // Very light emerald background
  
  // Secondary Colors
  secondary: '#3B82F6',      // Blue
  secondaryDark: '#2563EB',  // Darker blue
  secondaryLight: '#60A5FA', // Lighter blue
  
  // Accent Colors
  accent: '#F59E0B',         // Amber
  accentDark: '#D97706',     // Darker amber
  accentLight: '#FCD34D',    // Lighter amber
  
  // Status Colors
  success: '#10B981',        // Green (same as primary)
  warning: '#F59E0B',        // Amber
  error: '#EF4444',          // Red
  info: '#3B82F6',           // Blue
  
  // Neutral Colors
  black: '#000000',
  white: '#FFFFFF',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  
  // Dark Mode Colors
  dark: {
    background: '#111827',
    card: 'rgba(55, 65, 81, 0.8)',
    overlay: 'rgba(17, 24, 39, 0.9)',
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    border: 'rgba(75, 85, 99, 0.3)',
  },
  
  // Light Mode Colors
  light: {
    background: '#F0FDF4',
    card: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.1)',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
  },
  
  // Carbon Tracking Specific
  carbon: {
    low: '#10B981',      // Green - low emissions
    medium: '#F59E0B',   // Amber - medium emissions
    high: '#EF4444',     // Red - high emissions
    veryHigh: '#991B1B', // Dark red - very high emissions
  },
  
  // Achievement Colors
  achievement: {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
  },
  
  // Social Features
  social: {
    like: '#EF4444',
    comment: '#3B82F6',
    share: '#10B981',
    follow: '#8B5CF6',
  },
  
  // Transport Mode Colors
  transport: {
    car: '#EF4444',
    publicTransport: '#10B981',
    bike: '#3B82F6',
    walk: '#8B5CF6',
    flight: '#F59E0B',
  },
  
  // Food Category Colors
  food: {
    meat: '#EF4444',
    vegetarian: '#F59E0B',
    vegan: '#10B981',
    seafood: '#3B82F6',
    dairy: '#FCD34D',
  },
  
  // Transparent Overlays
  overlay: {
    light: 'rgba(255, 255, 255, 0.8)',
    medium: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.8)',
  },
  
  // Gradients (for use with LinearGradient)
  gradients: {
    primary: ['#10B981', '#059669'],
    secondary: ['#3B82F6', '#2563EB'],
    sunset: ['#F59E0B', '#EF4444'],
    ocean: ['#3B82F6', '#10B981'],
    forest: ['#10B981', '#065F46'],
    fire: ['#EF4444', '#991B1B'],
    premium: ['#7C3AED', '#4C1D95'],
  },
};

// Helper functions
export const getColorWithOpacity = (hexColor, opacity) => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const getEmissionColor = (value, max) => {
  const percentage = (value / max) * 100;
  if (percentage < 30) return Colors.carbon.low;
  if (percentage < 60) return Colors.carbon.medium;
  if (percentage < 90) return Colors.carbon.high;
  return Colors.carbon.veryHigh;
};

export const getAchievementColor = (level) => {
  switch(level) {
    case 1: return Colors.achievement.bronze;
    case 2: return Colors.achievement.silver;
    case 3: return Colors.achievement.gold;
    case 4: return Colors.achievement.platinum;
    default: return Colors.gray[400];
  }
};

export default Colors;