// src/components/SimpleBankConnection.js
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function SimpleBankConnection({ style }) {
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  const handleBankConnection = async () => {
    // For now, just show a placeholder alert
    // You can integrate actual Plaid Link later
    Alert.alert(
      'Connect Bank Account',
      'Bank connection feature will allow you to automatically track carbon emissions from your purchases.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Coming Soon', 
          onPress: () => {
            Alert.alert('Coming Soon', 'Bank integration will be available in the next update!');
          }
        }
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: theme.buttonBackground }, style]}
      onPress={handleBankConnection}
      disabled={loading}
    >
      <Text style={styles.buttonIcon}>🏦</Text>
      <Text style={[styles.buttonText, { color: theme.buttonText }]}>
        Connect Bank Account
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 10,
  },
  buttonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});