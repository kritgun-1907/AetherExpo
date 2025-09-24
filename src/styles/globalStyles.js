// src/styles/globalStyles.js

import { StyleSheet, Platform, Dimensions } from 'react-native';
import { Colors } from './colors';
import { Typography, FontSize, FontWeight } from './fonts';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Spacing system (8px base)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border Radius
export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// Shadow presets
export const Shadows = {
  none: {},
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  colored: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  }),
};

// Global styles
const GlobalStyles = StyleSheet.create({
  // Containers
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  containerDark: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Cards
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    ...Shadows.medium,
  },
  cardDark: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  
  // Headers
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  headerDark: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.dark.background,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.light.text,
  },
  headerTitleDark: {
    ...Typography.h3,
    color: Colors.dark.text,
  },
  
  // Buttons
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
  buttonText: {
    ...Typography.button,
    color: Colors.white,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutlineText: {
    ...Typography.button,
    color: Colors.primary,
  },
  buttonDisabled: {
    backgroundColor: Colors.gray[300],
    opacity: 0.6,
  },
  buttonSmall: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  buttonLarge: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
  },
  
  // Inputs
  input: {
    backgroundColor: Colors.gray[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.medium,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  inputDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.medium,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  inputLabel: {
    ...Typography.label,
    color: Colors.gray[700],
    marginBottom: Spacing.xs,
  },
  inputError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.small,
    marginTop: Spacing.xs,
  },
  
  // Lists
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  listItemDark: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.dark.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  
  // Badges
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    ...Typography.badge,
    color: Colors.white,
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '90%',
    maxHeight: '80%',
    ...Shadows.xl,
  },
  modalContentDark: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  
  // Dividers
  divider: {
    height: 1,
    backgroundColor: Colors.gray[200],
    marginVertical: Spacing.md,
  },
  dividerDark: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: Spacing.md,
  },
  
  // Sections
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h5,
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  sectionTitleDark: {
    ...Typography.h5,
    color: Colors.dark.text,
    marginBottom: Spacing.md,
  },
  
  // Carbon Tracking Specific
  emissionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginVertical: Spacing.sm,
    ...Shadows.medium,
  },
  emissionValue: {
    ...Typography.emissionValue,
    color: Colors.primary,
  },
  emissionUnit: {
    ...Typography.emissionUnit,
    color: Colors.gray[600],
  },
  carbonBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
  },
  carbonBadgeLow: {
    backgroundColor: Colors.primaryBackground,
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  carbonBadgeMedium: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: Colors.warning,
    borderWidth: 1,
  },
  carbonBadgeHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: Colors.error,
    borderWidth: 1,
  },
  
  // Achievement Styles
  achievementContainer: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  achievementBadge: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
    ...Shadows.medium,
  },
  achievementEmoji: {
    fontSize: 36,
  },
  achievementName: {
    ...Typography.bodyMedium,
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  
  // Stats Display
  statContainer: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  statValue: {
    ...Typography.statNumber,
    color: Colors.primary,
  },
  statLabel: {
    ...Typography.statLabel,
    color: Colors.gray[600],
    marginTop: Spacing.xs,
  },
  
  // Progress Bars
  progressBar: {
    height: 8,
    backgroundColor: Colors.gray[200],
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    ...Typography.bodyMedium,
    color: Colors.gray[600],
    marginTop: Spacing.md,
  },
  
  // Empty States
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: Spacing.lg,
    opacity: 0.5,
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.gray[700],
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    ...Typography.bodyMedium,
    color: Colors.gray[500],
    textAlign: 'center',
  },
  
  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    paddingTop: Spacing.sm,
  },
  tabItem: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    ...Typography.bodyMedium,
    color: Colors.gray[600],
  },
  tabTextActive: {
    ...Typography.bodyMedium,
    fontWeight: FontWeight.semiBold,
    color: Colors.primary,
  },
  
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.large,
  },
  fabIcon: {
    color: Colors.white,
    fontSize: 24,
  },
  
  // Rows and Columns
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  column: {
    flexDirection: 'column',
  },
  
  // Utilities
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  flex3: { flex: 3 },
  
  textCenter: { textAlign: 'center' },
  textLeft: { textAlign: 'left' },
  textRight: { textAlign: 'right' },
  
  marginTop: { marginTop: Spacing.md },
  marginBottom: { marginBottom: Spacing.md },
  marginLeft: { marginLeft: Spacing.md },
  marginRight: { marginRight: Spacing.md },
  
  paddingTop: { paddingTop: Spacing.md },
  paddingBottom: { paddingBottom: Spacing.md },
  paddingLeft: { paddingLeft: Spacing.md },
  paddingRight: { paddingRight: Spacing.md },
});

// Helper functions
export const createDynamicStyles = (isDarkMode) => ({
  container: isDarkMode ? GlobalStyles.containerDark : GlobalStyles.container,
  card: isDarkMode ? GlobalStyles.cardDark : GlobalStyles.card,
  header: isDarkMode ? GlobalStyles.headerDark : GlobalStyles.header,
  headerTitle: isDarkMode ? GlobalStyles.headerTitleDark : GlobalStyles.headerTitle,
  input: isDarkMode ? GlobalStyles.inputDark : GlobalStyles.input,
  listItem: isDarkMode ? GlobalStyles.listItemDark : GlobalStyles.listItem,
  modalContent: isDarkMode ? GlobalStyles.modalContentDark : GlobalStyles.modalContent,
  divider: isDarkMode ? GlobalStyles.dividerDark : GlobalStyles.divider,
  sectionTitle: isDarkMode ? GlobalStyles.sectionTitleDark : GlobalStyles.sectionTitle,
});

export default GlobalStyles;