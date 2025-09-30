// src/screens/main/PaymentScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../api/supabase';

export default function PaymentScreen({ route, navigation }) {
  const { theme, isDarkMode } = useTheme();
  const { plan, price, planName } = route.params;
  
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [processing, setProcessing] = useState(false);

  // Format card number with spaces
  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(' ') : cleaned;
  };

  // Format expiry date as MM/YY
  const formatExpiryDate = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  // Validate card number (Luhn algorithm)
  const validateCardNumber = (number) => {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };

  // Get card type from number
  const getCardType = (number) => {
    const cleaned = number.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'discover';
    return 'card';
  };

  const handlePayment = async () => {
    // Validation
    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
      Alert.alert('Missing Information', 'Please fill in all card details');
      return;
    }

    if (!validateCardNumber(cardNumber)) {
      Alert.alert('Invalid Card', 'Please enter a valid card number');
      return;
    }

    const [month, year] = expiryDate.split('/');
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    
    if (!month || !year || parseInt(year) < currentYear || 
        (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
      Alert.alert('Invalid Expiry', 'Please enter a valid expiry date');
      return;
    }

    if (cvv.length < 3) {
      Alert.alert('Invalid CVV', 'Please enter a valid CVV');
      return;
    }

    setProcessing(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'Please log in to continue');
        setProcessing(false);
        return;
      }

      // In a real app, you would integrate with Stripe, PayPal, or another payment processor
      // For demo purposes, we'll simulate a successful payment
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update user subscription in database
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          plan_type: plan,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          // In production, you'd store Stripe IDs here
          stripe_subscription_id: 'demo_sub_' + Date.now(),
          stripe_customer_id: 'demo_cus_' + Date.now(),
        });

      if (subscriptionError) {
        throw subscriptionError;
      }

      // Update user profile to premium
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ is_premium: true })
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      setProcessing(false);

      Alert.alert(
        'Welcome to Premium! 🎉',
        `Your ${planName} subscription is now active!\n\nYou now have access to all premium features.`,
        [
          {
            text: 'Awesome!',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Payment error:', error);
      setProcessing(false);
      Alert.alert('Payment Failed', 'Unable to process payment. Please try again.');
    }
  };

  // Dummy card info helper
  const useDummyCard = () => {
    setCardNumber('4242 4242 4242 4242');
    setExpiryDate('12/25');
    setCvv('123');
    setCardholderName('Test User');
    
    Alert.alert(
      'Test Card Loaded',
      'Dummy card details have been filled in for testing purposes.',
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plan Summary */}
        <View style={[styles.summaryCard, {
          backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
          borderColor: theme.accentText,
        }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.primaryText }]}>Plan:</Text>
            <Text style={[styles.summaryValue, { color: theme.accentText }]}>{planName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.primaryText }]}>Free Trial:</Text>
            <Text style={[styles.summaryValue, { color: theme.accentText }]}>7 days</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.primaryText }]}>Then:</Text>
            <Text style={[styles.summaryValue, { color: theme.accentText }]}>${price}/month</Text>
          </View>
        </View>

        {/* Dummy Card Button */}
        <TouchableOpacity 
          style={[styles.dummyButton, { 
            backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
            borderColor: '#3B82F6'
          }]}
          onPress={useDummyCard}
        >
          <Ionicons name="card-outline" size={20} color="#3B82F6" />
          <Text style={[styles.dummyButtonText, { color: '#3B82F6' }]}>
            Use Test Card (For Demo)
          </Text>
        </TouchableOpacity>

        {/* Card Information */}
        <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Card Information</Text>

        {/* Card Number */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>Card Number</Text>
          <View style={[styles.inputWrapper, { 
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.divider,
            borderColor: theme.border 
          }]}>
            <Ionicons 
              name={getCardType(cardNumber)} 
              size={24} 
              color={theme.secondaryText} 
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: theme.primaryText }]}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={theme.secondaryText}
              value={cardNumber}
              onChangeText={(text) => {
                const cleaned = text.replace(/\s/g, '');
                if (cleaned.length <= 16) {
                  setCardNumber(formatCardNumber(cleaned));
                }
              }}
              keyboardType="numeric"
              maxLength={19}
            />
          </View>
        </View>

        {/* Expiry and CVV */}
        <View style={styles.rowInputs}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
            <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>Expiry Date</Text>
            <View style={[styles.inputWrapper, { 
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.divider,
              borderColor: theme.border 
            }]}>
              <Ionicons name="calendar-outline" size={20} color={theme.secondaryText} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.primaryText }]}
                placeholder="MM/YY"
                placeholderTextColor={theme.secondaryText}
                value={expiryDate}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '');
                  if (cleaned.length <= 4) {
                    setExpiryDate(formatExpiryDate(cleaned));
                  }
                }}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
          </View>

          <View style={[styles.inputContainer, { flex: 1, marginLeft: 10 }]}>
            <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>CVV</Text>
            <View style={[styles.inputWrapper, { 
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.divider,
              borderColor: theme.border 
            }]}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.secondaryText} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.primaryText }]}
                placeholder="123"
                placeholderTextColor={theme.secondaryText}
                value={cvv}
                onChangeText={(text) => {
                  if (text.length <= 4) {
                    setCvv(text.replace(/\D/g, ''));
                  }
                }}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />
            </View>
          </View>
        </View>

        {/* Cardholder Name */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>Cardholder Name</Text>
          <View style={[styles.inputWrapper, { 
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.divider,
            borderColor: theme.border 
          }]}>
            <Ionicons name="person-outline" size={20} color={theme.secondaryText} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.primaryText }]}
              placeholder="John Doe"
              placeholderTextColor={theme.secondaryText}
              value={cardholderName}
              onChangeText={setCardholderName}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Security Info */}
        <View style={[styles.securityInfo, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF' }]}>
          <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
          <Text style={[styles.securityText, { color: theme.secondaryText }]}>
            Your payment information is encrypted and secure. We never store your full card details.
          </Text>
        </View>

        {/* Terms */}
        <Text style={[styles.termsText, { color: theme.secondaryText }]}>
          By confirming, you agree to our Terms of Service and Privacy Policy. Your trial starts today and you'll be charged ${price} on {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}. Cancel anytime before then to avoid charges.
        </Text>
      </ScrollView>

      {/* Pay Button */}
      <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.payButton, { 
            backgroundColor: theme.accentText,
            opacity: processing ? 0.7 : 1
          }]}
          onPress={handlePayment}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color={theme.buttonText} />
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color={theme.buttonText} />
              <Text style={[styles.payButtonText, { color: theme.buttonText }]}>
                Start Free Trial
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dummyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
  },
  dummyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
 inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  rowInputs: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 16,
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
  },
  termsText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});