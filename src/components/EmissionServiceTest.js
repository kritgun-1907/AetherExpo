// TEST COMPONENT - Add this to your app to verify EmissionService works
// src/components/EmissionServiceTest.js

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import EmissionService from '../services/EmissionService';

export default function EmissionServiceTest() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const testCases = [
    { category: 'transport', activity: 'car_petrol', amount: 20, unit: 'km', label: 'Drive 20km (Petrol Car)' },
    { category: 'transport', activity: 'bus', amount: 15, unit: 'km', label: 'Bus 15km' },
    { category: 'food', activity: 'beef', amount: 0.3, unit: 'kg', label: 'Beef Burger (300g)' },
    { category: 'food', activity: 'vegetarian', amount: 0.3, unit: 'kg', label: 'Vegetarian Meal' },
    { category: 'home', activity: 'electricity', amount: 50, unit: 'kWh', label: '50 kWh Electricity' },
    { category: 'shopping', activity: 'clothing', amount: 1, unit: 'item', label: '1 T-Shirt' },
  ];

  const runTest = async (test) => {
    setLoading(true);
    try {
      const result = await EmissionService.calculateEmissions(
        test.category,
        test.activity,
        test.amount,
        { unit: test.unit, region: 'US' }
      );
      
      setResults(prev => [...prev, {
        ...test,
        result,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (error) {
      setResults(prev => [...prev, {
        ...test,
        error: error.message,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setResults([]);
    for (const test of testCases) {
      await runTest(test);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between tests
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧪 Emission Service Test</Text>
        <Text style={styles.subtitle}>Test Climatiq API vs Fallback</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runAllTests}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Testing...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => setResults([])}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.testGrid}>
        {testCases.map((test, index) => (
          <TouchableOpacity
            key={index}
            style={styles.testCard}
            onPress={() => runTest(test)}
            disabled={loading}
          >
            <Text style={styles.testLabel}>{test.label}</Text>
            <Text style={styles.testDetails}>
              {test.amount} {test.unit}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Calculating emissions...</Text>
        </View>
      )}

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>
          📊 Results ({results.length})
        </Text>
        
        {results.map((item, index) => (
          <View
            key={index}
            style={[
              styles.resultCard,
              { backgroundColor: item.error ? '#FEE2E2' : '#D1FAE5' }
            ]}
          >
            <View style={styles.resultHeader}>
              <Text style={styles.resultLabel}>{item.label}</Text>
              <Text style={styles.resultTime}>{item.timestamp}</Text>
            </View>

            {item.error ? (
              <Text style={styles.errorText}>❌ {item.error}</Text>
            ) : (
              <>
                <View style={styles.resultRow}>
                  <Text style={styles.resultKey}>Emissions:</Text>
                  <Text style={styles.resultValue}>
                    {item.result.emissions.toFixed(2)} {item.result.unit}
                  </Text>
                </View>

                <View style={styles.resultRow}>
                  <Text style={styles.resultKey}>Source:</Text>
                  <Text style={[
                    styles.resultValue,
                    { 
                      color: item.result.source.includes('Climatiq') ? '#059669' : '#D97706',
                      fontWeight: '600'
                    }
                  ]}>
                    {item.result.source}
                  </Text>
                </View>

                <View style={styles.resultRow}>
                  <Text style={styles.resultKey}>Confidence:</Text>
                  <Text style={styles.resultValue}>{item.result.confidence}</Text>
                </View>

                {item.result.details?.methodology && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultKey}>Method:</Text>
                    <Text style={styles.resultValue} numberOfLines={2}>
                      {item.result.details.methodology}
                    </Text>
                  </View>
                )}

                {item.result.emission_factor && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultKey}>Factor:</Text>
                    <Text style={styles.resultValue}>
                      {item.result.emission_factor.toFixed(4)}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        ))}

        {results.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No results yet. Click "Run All Tests" or tap individual tests above.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ How it works:</Text>
        <Text style={styles.infoText}>
          1. <Text style={styles.bold}>Climatiq API</Text> is tried first (real-time data)
        </Text>
        <Text style={styles.infoText}>
          2. If API fails, <Text style={styles.bold}>Fallback factors</Text> are used
        </Text>
        <Text style={styles.infoText}>
          3. Green source = Live API, Orange = Fallback
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    padding: 20,
    backgroundColor: '#10B981',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#10B981',
  },
  secondaryButton: {
    backgroundColor: '#6B7280',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  testGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  testCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  testLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  testDetails: {
    fontSize: 12,
    color: '#6B7280',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  resultsContainer: {
    padding: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  resultCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  resultTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  resultKey: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 13,
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    marginTop: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  infoBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#78350F',
    marginBottom: 4,
  },
  bold: {
    fontWeight: '600',
  },
});