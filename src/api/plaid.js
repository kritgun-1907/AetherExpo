// src/api/plaid.js - Complete Plaid Integration with Carbon Tracking
import { PlaidLink } from 'react-native-plaid-link-sdk';
import { supabase } from './supabase';

// Plaid Configuration
const PLAID_CONFIG = {
  CLIENT_ID: '68d0c16a4777030021f60af0',
  SECRET: 'a9ee159ee3e1bdd5407df071198d65',
  PUBLIC_KEY: '68d0c16a4777030021f60af0',
  ENV: 'sandbox', // Change to 'production' for live
  PRODUCTS: ['transactions', 'accounts', 'identity'],
  COUNTRY_CODES: ['US', 'CA', 'GB'],
};

// Carbonizer Model - Convert spending to carbon emissions
const CARBONIZER_FACTORS = {
  // Transportation
  'Transportation': 0.35, // kg CO2 per dollar
  'Gas Stations': 0.8,
  'Parking': 0.1,
  'Taxi': 0.4,
  'Airlines': 0.6,
  'Car Service': 0.4,
  'Public Transportation': 0.05,
  
  // Food & Dining
  'Food and Drink': 0.25,
  'Restaurants': 0.3,
  'Fast Food': 0.4,
  'Coffee Shops': 0.15,
  'Grocery': 0.2,
  
  // Shopping
  'Shops': 0.2,
  'Clothing': 0.5,
  'Electronics': 0.8,
  'Home Improvement': 0.3,
  'Online Shopping': 0.25,
  
  // Utilities
  'Utilities': 0.6,
  'Internet': 0.1,
  'Phone': 0.05,
  
  // Entertainment
  'Entertainment': 0.15,
  'Movies': 0.1,
  'Gyms and Fitness': 0.05,
  
  // Default for uncategorized
  'Other': 0.2,
};

// Gift Voucher Providers
const GIFT_VOUCHER_PROVIDERS = {
  amazon: {
    name: 'Amazon',
    logo: 'https://logo.clearbit.com/amazon.com',
    denominations: [5, 10, 25, 50, 100],
    category: 'shopping',
  },
  whole_foods: {
    name: 'Whole Foods',
    logo: 'https://logo.clearbit.com/wholefoodsmarket.com',
    denominations: [10, 25, 50],
    category: 'grocery',
  },
  starbucks: {
    name: 'Starbucks',
    logo: 'https://logo.clearbit.com/starbucks.com',
    denominations: [5, 10, 25],
    category: 'coffee',
  },
  target: {
    name: 'Target',
    logo: 'https://logo.clearbit.com/target.com',
    denominations: [10, 25, 50, 100],
    category: 'retail',
  },
  uber: {
    name: 'Uber',
    logo: 'https://logo.clearbit.com/uber.com',
    denominations: [15, 25, 50],
    category: 'transport',
  },
};

// Carbon Offset Providers
const OFFSET_PROVIDERS = {
  goldstandard: {
    name: 'Gold Standard',
    pricePerTon: 15, // USD per ton CO2
    logo: 'https://www.goldstandard.org/sites/default/files/gs_logo.png',
    rating: 5,
    projects: ['Forest Protection', 'Renewable Energy', 'Clean Cookstoves'],
  },
  verra: {
    name: 'Verra (VCS)',
    pricePerTon: 12,
    logo: 'https://verra.org/wp-content/uploads/2021/04/VCS-Logo-Color.png',
    rating: 4,
    projects: ['REDD+', 'Solar Power', 'Wind Energy'],
  },
  climeworks: {
    name: 'Climeworks',
    pricePerTon: 600, // Premium direct air capture
    logo: 'https://climeworks.com/favicon.ico',
    rating: 5,
    projects: ['Direct Air Capture', 'Permanent Storage'],
  },
};

class PlaidService {
  constructor() {
    this.linkToken = null;
    this.accessToken = null;
  }

// REPLACE ONLY the createLinkToken method in your src/api/plaid.js file

async createLinkToken(userId) {
  try {
    console.log('Creating link token for user:', userId);
    console.log('Supabase URL:', supabase.supabaseUrl);
    
    const functionUrl = `${supabase.supabaseUrl}/functions/v1/create-link-token`;
    console.log('Function URL:', functionUrl);

    const requestBody = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Aether Carbon Tracker',
      products: ['transactions'],
      country_codes: ['US', 'CA', 'GB'],
      language: 'en',
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabase.supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    const responseText = await response.text();
    console.log('Response text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      throw new Error(`Invalid response from server: ${responseText}`);
    }

    if (!response.ok) {
      console.error('Error response from function:', data);
      throw new Error(data.error || data.error_message || 'Failed to create link token');
    }

    if (!data.link_token) {
      console.error('No link_token in response:', data);
      throw new Error('No link token returned from server');
    }

    console.log('Link token created successfully');
    this.linkToken = data.link_token;
    return data.link_token;
    
  } catch (error) {
    console.error('Error creating link token:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

  // Exchange Public Token for Access Token
  async exchangePublicToken(publicToken, userId) {
    try {
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/exchange-public-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: PLAID_CONFIG.CLIENT_ID,
          secret: PLAID_CONFIG.SECRET,
          public_token: publicToken,
        }),
      });

      const data = await response.json();
      this.accessToken = data.access_token;

      // Save to database
      await supabase
        .from('user_bank_connections')
        .upsert({
          user_id: userId,
          access_token: data.access_token,
          item_id: data.item_id,
          connected_at: new Date().toISOString(),
        });

      return data;
    } catch (error) {
      console.error('Error exchanging public token:', error);
      throw error;
    }
  }

  // Get Transactions and Calculate Carbon Footprint
  async getTransactionsAndCalculateCarbon(userId, days = 30) {
    try {
      const { data: connection } = await supabase
        .from('user_bank_connections')
        .select('access_token')
        .eq('user_id', userId)
        .single();

      if (!connection) {
        throw new Error('No bank connection found');
      }

      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/get-transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: PLAID_CONFIG.CLIENT_ID,
          secret: PLAID_CONFIG.SECRET,
          access_token: connection.access_token,
          start_date: startDate,
          end_date: endDate,
        }),
      });

      const data = await response.json();
      
      // Process transactions with Carbonizer model
      const processedTransactions = data.transactions.map(transaction => {
        const category = transaction.category ? transaction.category[0] : 'Other';
        const carbonFactor = CARBONIZER_FACTORS[category] || CARBONIZER_FACTORS['Other'];
        const carbonEmission = Math.abs(transaction.amount) * carbonFactor;

        return {
          ...transaction,
          carbon_emission: carbonEmission,
          category_carbon_factor: carbonFactor,
        };
      });

      // Save to database
      await this.saveTransactionsToDatabase(userId, processedTransactions);

      return {
        transactions: processedTransactions,
        totalCarbon: processedTransactions.reduce((sum, t) => sum + t.carbon_emission, 0),
        totalSpending: processedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
      };
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  // Save Transactions to Database
  async saveTransactionsToDatabase(userId, transactions) {
    try {
      const transactionsToSave = transactions.map(transaction => ({
        user_id: userId,
        transaction_id: transaction.transaction_id,
        account_id: transaction.account_id,
        amount: transaction.amount,
        date: transaction.date,
        name: transaction.name,
        merchant_name: transaction.merchant_name,
        category: JSON.stringify(transaction.category),
        carbon_emission: transaction.carbon_emission,
        carbon_factor: transaction.category_carbon_factor,
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('carbon_transactions')
        .upsert(transactionsToSave, { onConflict: 'transaction_id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving transactions:', error);
      throw error;
    }
  }

  // Calculate Weekly Carbon Reduction
  async calculateWeeklyReduction(userId) {
    try {
      const currentWeek = new Date();
      const lastWeek = new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(currentWeek.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Get current week emissions
      const { data: currentWeekData } = await supabase
        .from('carbon_transactions')
        .select('carbon_emission')
        .eq('user_id', userId)
        .gte('date', lastWeek.toISOString().split('T')[0])
        .lt('date', currentWeek.toISOString().split('T')[0]);

      // Get previous week emissions
      const { data: previousWeekData } = await supabase
        .from('carbon_transactions')
        .select('carbon_emission')
        .eq('user_id', userId)
        .gte('date', twoWeeksAgo.toISOString().split('T')[0])
        .lt('date', lastWeek.toISOString().split('T')[0]);

      const currentWeekTotal = currentWeekData?.reduce((sum, t) => sum + t.carbon_emission, 0) || 0;
      const previousWeekTotal = previousWeekData?.reduce((sum, t) => sum + t.carbon_emission, 0) || 0;

      const reduction = previousWeekTotal - currentWeekTotal;
      const reductionPercentage = previousWeekTotal > 0 ? (reduction / previousWeekTotal) * 100 : 0;

      return {
        currentWeek: currentWeekTotal,
        previousWeek: previousWeekTotal,
        reduction: reduction,
        reductionPercentage: reductionPercentage,
        qualifiesForReward: reduction > 0 && reductionPercentage >= 10, // 10% reduction threshold
      };
    } catch (error) {
      console.error('Error calculating weekly reduction:', error);
      throw error;
    }
  }

  // Award Gift Voucher
  async awardGiftVoucher(userId, voucherType, amount) {
    try {
      const voucher = {
        user_id: userId,
        voucher_type: voucherType,
        amount: amount,
        provider: GIFT_VOUCHER_PROVIDERS[voucherType],
        code: this.generateVoucherCode(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        awarded_at: new Date().toISOString(),
        status: 'active',
      };

      const { data, error } = await supabase
        .from('gift_vouchers')
        .insert(voucher)
        .select()
        .single();

      if (error) throw error;

      // Update user's eco-points
      await supabase.rpc('increment_eco_points', {
        user_id: userId,
        points: amount * 10, // 10 points per dollar value
      });

      return data;
    } catch (error) {
      console.error('Error awarding gift voucher:', error);
      throw error;
    }
  }

  // Generate Voucher Code
  generateVoucherCode() {
    return 'ECO-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  // Get User's Vouchers
  async getUserVouchers(userId) {
    try {
      const { data, error } = await supabase
        .from('gift_vouchers')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('awarded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user vouchers:', error);
      throw error;
    }
  }

  // Purchase Carbon Offsets
  async purchaseOffsets(userId, offsetProvider, tonsCO2, totalPrice) {
    try {
      const offset = {
        user_id: userId,
        provider: offsetProvider,
        tons_co2: tonsCO2,
        price_per_ton: OFFSET_PROVIDERS[offsetProvider].pricePerTon,
        total_price: totalPrice,
        certificate_id: this.generateCertificateId(),
        purchased_at: new Date().toISOString(),
        status: 'active',
      };

      const { data, error } = await supabase
        .from('carbon_offsets')
        .insert(offset)
        .select()
        .single();

      if (error) throw error;

      // Update user's total offsets
      await supabase.rpc('update_user_offsets', {
        user_id: userId,
        tons_offset: tonsCO2,
      });

      return data;
    } catch (error) {
      console.error('Error purchasing offsets:', error);
      throw error;
    }
  }

  // Generate Certificate ID
  generateCertificateId() {
    return 'CERT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
  }

  // Get Premium Features Status
  async getPremiumStatus(userId) {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      return {
        isPremium: !!data,
        plan: data?.plan_type || 'free',
        features: data ? this.getPremiumFeatures(data.plan_type) : this.getFreeFeatures(),
      };
    } catch (error) {
      return {
        isPremium: false,
        plan: 'free',
        features: this.getFreeFeatures(),
      };
    }
  }

  // Premium Features
  getPremiumFeatures(planType) {
    const features = {
      basic: [
        'Unlimited bank connections',
        'Advanced carbon analytics',
        'Monthly offset recommendations',
        'Basic gift vouchers',
      ],
      premium: [
        'All Basic features',
        'Real-time carbon tracking',
        'Premium gift vouchers',
        'Custom offset portfolios',
        'Carbon impact reports',
        'Priority customer support',
      ],
      enterprise: [
        'All Premium features',
        'Team carbon tracking',
        'Corporate offset programs',
        'API access',
        'Custom integrations',
        'Dedicated account manager',
      ],
    };

    return features[planType] || features.basic;
  }

  // Free Features
  getFreeFeatures() {
    return [
      '1 bank connection',
      'Basic carbon tracking',
      'Weekly summaries',
      'Limited voucher access',
    ];
  }
}

// Export singleton instance
export const plaidService = new PlaidService();
export { CARBONIZER_FACTORS, GIFT_VOUCHER_PROVIDERS, OFFSET_PROVIDERS };