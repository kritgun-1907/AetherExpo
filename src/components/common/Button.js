// src/components/common/Button.js
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../styles/colors';
import { Typography, FontWeight } from '../../styles/fonts';
import { BorderRadius, Spacing, Shadows } from '../../styles/globalStyles';

const BUTTON_VARIANTS = {
  primary: {
    backgroundColor: Colors.primary,
    color: Colors.white,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
    color: Colors.primary,
  },
  success: {
    backgroundColor: Colors.success,
    color: Colors.white,
  },
  warning: {
    backgroundColor: Colors.warning,
    color: Colors.white,
  },
  error: {
    backgroundColor: Colors.error,
    color: Colors.white,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: Colors.primary,
  },
};

const BUTTON_SIZES = {
  small: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: 14,
  },
  medium: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  large: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 18,
  },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  ...props
}) {
  const { theme, isDarkMode } = useTheme();

  const buttonVariant = BUTTON_VARIANTS[variant];
  const buttonSize = BUTTON_SIZES[size];

  const getButtonStyle = () => {
    let baseStyle = {
      backgroundColor: buttonVariant.backgroundColor,
      borderWidth: buttonVariant.borderWidth || 0,
      borderColor: buttonVariant.borderColor,
      paddingHorizontal: buttonSize.paddingHorizontal,
      paddingVertical: buttonSize.paddingVertical,
    };

    // Handle theme-aware styles
    if (variant === 'secondary') {
      baseStyle.borderColor = isDarkMode ? Colors.white : Colors.primary;
      if (isDarkMode) {
        baseStyle.color = Colors.white;
      }
    }

    if (variant === 'ghost') {
      baseStyle.color = isDarkMode ? Colors.white : Colors.primary;
    }

    // Handle disabled state
    if (disabled || loading) {
      baseStyle.opacity = 0.6;
    }

    return baseStyle;
  };

  const getTextColor = () => {
    if (variant === 'secondary') {
      return isDarkMode ? Colors.white : Colors.primary;
    }
    if (variant === 'ghost') {
      return isDarkMode ? Colors.white : Colors.primary;
    }
    return buttonVariant.color;
  };

  const renderIcon = () => {
    if (!icon) return null;

    return (
      <Ionicons
        name={icon}
        size={buttonSize.fontSize}
        color={getTextColor()}
        style={[
          iconPosition === 'left' ? styles.iconLeft : styles.iconRight,
        ]}
      />
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color={getTextColor()}
            style={styles.loadingIndicator}
          />
          {title && (
            <Text
              style={[
                styles.buttonText,
                {
                  fontSize: buttonSize.fontSize,
                  color: getTextColor(),
                },
                textStyle,
              ]}
            >
              {title}
            </Text>
          )}
        </View>
      );
    }

    return (
      <>
        {iconPosition === 'left' && renderIcon()}
        {title && (
          <Text
            style={[
              styles.buttonText,
              {
                fontSize: buttonSize.fontSize,
                color: getTextColor(),
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        )}
        {iconPosition === 'right' && renderIcon()}
      </>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        fullWidth && styles.fullWidth,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}

// Preset button components for common use cases
export const PrimaryButton = (props) => <Button {...props} variant="primary" />;
export const SecondaryButton = (props) => <Button {...props} variant="secondary" />;
export const SuccessButton = (props) => <Button {...props} variant="success" />;
export const WarningButton = (props) => <Button {...props} variant="warning" />;
export const ErrorButton = (props) => <Button {...props} variant="error" />;
export const GhostButton = (props) => <Button {...props} variant="ghost" />;

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    ...Shadows.small,
  },
  fullWidth: {
    width: '100%',
  },
  buttonText: {
    ...Typography.body,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: Spacing.xs,
  },
  iconRight: {
    marginLeft: Spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    marginRight: Spacing.xs,
  },
});

// Export button variants and sizes for external use
export { BUTTON_VARIANTS, BUTTON_SIZES };