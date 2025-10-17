// src/components/PlaidLinkButton.js - WORKING EXPO SANDBOX VERSION
import React, { useState } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { plaidService } from '../api/plaid';
import { supabase } from '../api/supabase';
import { useTheme } from '../context/ThemeContext';

export default function PlaidLinkButton({ onSuccess, onError, style, buttonText, showIcon = true }) {
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  const connectBank = async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        Alert.alert('Error', 'Please log in to connect your bank account');
        setLoading(false);
        return;
      }

      // In Sandbox mode, we'll simulate the Plaid connection
      // This uses Plaid's /sandbox/public_token/create endpoint
      
      Alert.alert(
        'Connect Bank Account',
        'This will connect a sandbox test bank account. In production, this would open Plaid Link for real bank connection.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setLoading(false)
          },
          {
            text: 'Connect Sandbox Bank',
            onPress: () => createSandboxConnection(user)
          }
        ]
      );
      
    } catch (error) {
      console.error('Error connecting bank:', error);
      setLoading(false);
      Alert.alert('Connection Error', error.message || 'Unable to connect. Please try again.');
      
      if (onError) {
        onError(error);
      }
    }
  };

  const createSandboxConnection = async (user) => {
    try {
      console.log('Creating sandbox bank connection...');
      
      // Use Plaid's sandbox public token creation
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/create-sandbox-item`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create sandbox connection');
      }

      console.log('Sandbox connection created:', data);

      // Now exchange the public token for an access token
      const result = await plaidService.exchangePublicToken(data.public_token, user.id);
      
      console.log('Token exchange successful');
      
      // Try to fetch transactions
      try {
        const carbonData = await plaidService.getTransactionsAndCalculateCarbon(user.id, 30);
        
        Alert.alert(
          'Success!', 
          `Sandbox bank connected!\n\nLast 30 days:\n• ${carbonData.transactions.length} transactions\n• ${carbonData.totalCarbon.toFixed(2)} kg CO₂\n• $${carbonData.totalSpending.toFixed(2)} spending`,
          [{ 
            text: 'Great!', 
            onPress: () => {
              setLoading(false);
              if (onSuccess) onSuccess(result, carbonData);
            }
          }]
        );
      } catch (transactionError) {
        console.log('Transaction fetch error:', transactionError.message);
        
        Alert.alert(
          'Bank Connected!', 
          'Sandbox bank account connected. Transactions will sync shortly.',
          [{ 
            text: 'OK', 
            onPress: () => {
              setLoading(false);
              if (onSuccess) onSuccess(result, null);
            }
          }]
        );
      }
      
    } catch (error) {
      console.error('Error creating sandbox connection:', error);
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to connect sandbox bank');
      if (onError) onError(error);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: theme.accentText || '#10B981' }, style]}
      onPress={connectBank}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.loadingText}>Connecting...</Text>
        </View>
      ) : (
        <View style={styles.buttonContent}>
          {showIcon && (
            <Ionicons name="card-outline" size={24} color="#FFFFFF" style={styles.icon} />
          )}
          <Text style={styles.buttonText}>
            {buttonText || 'Connect Bank (Sandbox)'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});