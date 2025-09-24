// src/styles/fonts.js
import { Platform } from 'react-native';

// Font weights
export const FontWeight = {
  light: '300',
  normal: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
};

// Font families - using system fonts for better compatibility
export const FontFamily = {
  primary: Platform.select({
    ios: 'San Francisco',
    android: 'Roboto',
    default: 'System',
  }),
  secondary: Platform.select({
    ios: 'SF Pro Text',
    android: 'Roboto',
    default: 'System',
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
};

// Typography scale
export const Typography = {
  // Headings
  h1: {
    fontFamily: FontFamily.primary,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: FontFamily.primary,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: FontFamily.primary,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: FontWeight.semiBold,
    letterSpacing: -0.2,
  },
  h4: {
    fontFamily: FontFamily.primary,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: FontWeight.semiBold,
    letterSpacing: -0.1,
  },
  h5: {
    fontFamily: FontFamily.primary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: FontWeight.semiBold,
  },
  h6: {
    fontFamily: FontFamily.primary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: FontWeight.semiBold,
  },

  // Body text
  body: {
    fontFamily: FontFamily.primary,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: FontWeight.normal,
  },
  bodySmall: {
    fontFamily: FontFamily.primary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FontWeight.normal,
  },
  bodyLarge: {
    fontFamily: FontFamily.primary,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: FontWeight.normal,
  },

  // Captions and labels
  caption: {
    fontFamily: FontFamily.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: FontWeight.normal,
  },
  captionSmall: {
    fontFamily: FontFamily.primary,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: FontWeight.normal,
  },
  label: {
    fontFamily: FontFamily.primary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FontWeight.medium,
  },
  labelSmall: {
    fontFamily: FontFamily.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: FontWeight.medium,
  },

  // Buttons
  button: {
    fontFamily: FontFamily.primary,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: FontWeight.semiBold,
    letterSpacing: 0.25,
  },
  buttonSmall: {
    fontFamily: FontFamily.primary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FontWeight.semiBold,
    letterSpacing: 0.25,
  },
  buttonLarge: {
    fontFamily: FontFamily.primary,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: FontWeight.semiBold,
    letterSpacing: 0.25,
  },

  // Special
  overline: {
    fontFamily: FontFamily.primary,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: FontWeight.medium,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  mono: {
    fontFamily: FontFamily.mono,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FontWeight.normal,
  },
  display: {
    fontFamily: FontFamily.primary,
    fontSize: 40,
    lineHeight: 48,
    fontWeight: FontWeight.bold,
    letterSpacing: -1,
  },
};

// Font size scale
export const FontSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
  '6xl': 48,
};

// Line height scale
export const LineHeight = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
};

// Letter spacing
export const LetterSpacing = {
  tighter: -0.05,
  tight: -0.025,
  normal: 0,
  wide: 0.025,
  wider: 0.05,
  widest: 0.1,
};