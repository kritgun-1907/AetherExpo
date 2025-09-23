// src/components/PlaidLinkButton.js
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { PlaidLink, LinkSuccess, LinkExit } from 'react-native-plaid-link-sdk';
import { plaidService } from '../api/plaid';
import { supabase } from '../api/supabase';
import { useTheme } from '../context/ThemeContext';

export default function PlaidLinkButton({ onSuccess, style }) {
  const [loading, setLoading] = useState(false);
  const [linkToken, setLinkToken] = useState(null);
  const { theme } = useTheme();

  const createLinkToken = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'Please log in to connect your bank account');
        return;
      }

      const token = await plaidService.createLinkToken(user.id);
      setLinkToken(token);
      
      // Open Plaid Link
      PlaidLink.open({
        tokenConfig: {
          token: token,
        },
        onSuccess: handleOnSuccess,
        onExit: handleOnExit,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to your bank. Please try again.');
      console.error('Link token creation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOnSuccess = async (success) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'Authentication error');
        return;
      }

      // Exchange public token for access token
      const result = await plaidService.exchangePublicToken(success.publicToken, user.id);
      
      // Get initial transactions and calculate carbon
      const carbonData = await plaidService.getTransactionsAndCalculateCarbon(user.id, 30);
      
      Alert.alert(
        'Success!', 
        `Bank connected successfully!\n\nLast 30 days:\n• ${carbonData.transactions.length} transactions\n• ${carbonData.totalCarbon.toFixed(2)} kg CO₂\n• $${carbonData.totalSpending.toFixed(2)} total spending`
      );

      if (onSuccess) {
        onSuccess(result, carbonData);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process bank connection');
      console.error('Success handler error:', error);
    }
  };

  const handleOnExit = (linkExit) => {
    console.log('Plaid Link Exit:', linkExit);
    if (linkExit.error) {
      Alert.alert('Connection Cancelled', linkExit.error.displayMessage);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: theme.buttonBackground }, style]}
      onPress={createLinkToken}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={theme.buttonText} size="small" />
      ) : (
        <>
          <Text style={[styles.buttonIcon, { color: theme.buttonText }]}>🏦</Text>
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>
            Connect Bank Account
          </Text>
        </>
      )}
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