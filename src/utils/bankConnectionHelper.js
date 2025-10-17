// src/utils/bankConnectionHelper.js
import { supabase } from '../api/supabase';
import { Alert } from 'react-native';

/**
 * Check if the user has an active bank connection
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} - True if bank is connected, false otherwise
 */
export const checkBankConnection = async (userId) => {
  try {
    if (!userId) {
      console.log('No user ID provided');
      return false;
    }

    const { data: connection, error } = await supabase
      .from('user_bank_connections')
      .select('access_token, status, item_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Error checking bank connection:', error);
      return false;
    }

    return !!connection && !!connection.access_token;
  } catch (error) {
    console.error('Exception checking bank connection:', error);
    return false;
  }
};

/**
 * Get bank connection details for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<Object|null>} - Bank connection object or null
 */
export const getBankConnectionDetails = async (userId) => {
  try {
    if (!userId) {
      console.log('No user ID provided');
      return null;
    }

    const { data: connection, error } = await supabase
      .from('user_bank_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Error getting bank connection details:', error);
      return null;
    }

    return connection;
  } catch (error) {
    console.error('Exception getting bank connection details:', error);
    return null;
  }
};

/**
 * Show a user-friendly alert if no bank connection exists
 * @param {Function} onConnectPress - Callback when user wants to connect
 */
export const showNoBankConnectionAlert = (onConnectPress) => {
  Alert.alert(
    'Bank Not Connected',
    'You need to connect your bank account to track carbon emissions from your transactions.',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Connect Bank',
        onPress: onConnectPress,
      },
    ]
  );
};

/**
 * Safely fetch transactions with bank connection check
 * @param {string} userId - The user's ID
 * @param {Function} getTransactionsFunc - The function to get transactions
 * @param {number} days - Number of days of transactions to fetch
 * @returns {Promise<Object|null>} - Transaction data or null
 */
export const safelyFetchTransactions = async (userId, getTransactionsFunc, days = 30) => {
  try {
    // First check if bank is connected
    const isConnected = await checkBankConnection(userId);
    
    if (!isConnected) {
      console.log('No bank connection found, skipping transaction fetch');
      return {
        transactions: [],
        totalCarbon: 0,
        totalSpending: 0,
        noBankConnection: true,
      };
    }

    // If connected, fetch transactions
    return await getTransactionsFunc(userId, days);
  } catch (error) {
    console.error('Error safely fetching transactions:', error);
    
    // Check if it's a "no bank connection" error
    if (error.message && error.message.includes('No bank connection')) {
      return {
        transactions: [],
        totalCarbon: 0,
        totalSpending: 0,
        noBankConnection: true,
      };
    }
    
    // For other errors, throw them
    throw error;
  }
};

/**
 * Disconnect/remove a bank connection
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const disconnectBank = async (userId) => {
  try {
    if (!userId) {
      console.log('No user ID provided');
      return false;
    }

    const { error } = await supabase
      .from('user_bank_connections')
      .update({ status: 'inactive' })
      .eq('user_id', userId);

    if (error) {
      console.error('Error disconnecting bank:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception disconnecting bank:', error);
    return false;
  }
};

/**
 * Check bank connection status and show appropriate message
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - Status object with isConnected and message
 */
export const checkBankConnectionStatus = async (userId) => {
  try {
    const connection = await getBankConnectionDetails(userId);
    
    if (!connection) {
      return {
        isConnected: false,
        message: 'No bank account connected',
        canFetchTransactions: false,
      };
    }

    if (connection.status !== 'active') {
      return {
        isConnected: false,
        message: `Bank connection is ${connection.status}`,
        canFetchTransactions: false,
      };
    }

    // Check last sync time
    const lastSynced = connection.last_synced ? new Date(connection.last_synced) : null;
    const hoursSinceSync = lastSynced 
      ? (Date.now() - lastSynced.getTime()) / (1000 * 60 * 60) 
      : null;

    return {
      isConnected: true,
      message: 'Bank connected and active',
      canFetchTransactions: true,
      lastSynced: lastSynced,
      needsRefresh: hoursSinceSync && hoursSinceSync > 24, // Suggest refresh if > 24 hours
    };
  } catch (error) {
    console.error('Error checking bank connection status:', error);
    return {
      isConnected: false,
      message: 'Error checking bank connection',
      canFetchTransactions: false,
      error: error.message,
    };
  }
};