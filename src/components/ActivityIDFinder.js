// ActivityIdFinder.js - WITH CATEGORY FILTER
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Clipboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CLIMATIQ_API_KEY = '36MH766FPN409EJQD4V7PS0PEW';
const CLIMATIQ_BASE_URL = 'https://api.climatiq.io/data/v1';

// Category definitions from Climatiq
const CATEGORIES = [
  { id: 'all', label: '🌍 All Categories', value: null },
  { id: 'Fuels', label: '⛽ Fuels', value: 'Fuels' },
  { id: 'Energy', label: '⚡ Energy', value: 'Energy' },
  { id: 'Transportation', label: '🚗 Transportation', value: 'Transportation' },
  { id: 'Food', label: '🍔 Food', value: 'Food' },
  { id: 'Materials', label: '🏗️ Materials', value: 'Materials' },
  { id: 'Waste', label: '🗑️ Waste', value: 'Waste' },
  { id: 'Agriculture', label: '🌾 Agriculture', value: 'Agriculture' },
  { id: 'Manufacturing', label: '🏭 Manufacturing', value: 'Manufacturing' },
];

export default function ActivityIdFinder() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const searchActivities = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      console.log('🔍 Searching for:', searchQuery, 'Category:', selectedCategory);
      
      // Build URL with category filter
      let url = `${CLIMATIQ_BASE_URL}/search?query=${encodeURIComponent(searchQuery)}&data_version=^23&results_per_page=50`;
      
      // Add category filter if not "all"
      const category = CATEGORIES.find(c => c.id === selectedCategory);
      if (category?.value) {
        url += `&category=${encodeURIComponent(category.value)}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CLIMATIQ_API_KEY}`
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        setError(`API Error: ${response.status}`);
        return;
      }

      const data = await response.json();
      console.log(`Found ${data.results?.length || 0} results`);
      
      setResults(data.results || []);
      
      if (data.results?.length === 0) {
        setError('No results found. Try different keywords or change the category filter.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickSearch = async (term, category = 'all') => {
    setSearchQuery(term);
    setSelectedCategory(category);
    setTimeout(() => searchActivities(), 100);
  };

  const copyToClipboard = (text) => {
    Clipboard.setString(text);
    alert('Copied to clipboard!');
  };

  const testActivityId = async (activityId) => {
    console.log('Testing activity:', activityId);
    
    try {
      const response = await fetch(`https://api.climatiq.io/estimate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emission_factor: {
            activity_id: activityId,
            data_version: '^23'
          },
          parameters: {
            distance: 10,
            distance_unit: 'km'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Works! Emissions: ${data.co2e} ${data.co2e_unit}`);
      } else {
        const error = await response.text();
        alert(`❌ Failed: ${error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Climatiq Activity ID Finder</Text>
        <Text style={styles.subtitle}>
          Find the correct activity IDs for your emission calculations
        </Text>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <Text style={styles.sectionTitle}>Filter by Category:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryButtons}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    selectedCategory === category.id && styles.categoryButtonTextActive
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Quick Search Buttons */}
      <View style={styles.quickSearchContainer}>
        <Text style={styles.sectionTitle}>Recommended Searches:</Text>
        <View style={styles.buttonGrid}>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => quickSearch('vehicle', 'Transportation')}
          >
            <Text style={styles.quickButtonText}>🚗 Vehicle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => quickSearch('bus', 'Transportation')}
          >
            <Text style={styles.quickButtonText}>🚌 Bus</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => quickSearch('train', 'Transportation')}
          >
            <Text style={styles.quickButtonText}>🚆 Train</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => quickSearch('gas', 'Fuels')}
          >
            <Text style={styles.quickButtonText}>⛽ Natural Gas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => quickSearch('electricity', 'Energy')}
          >
            <Text style={styles.quickButtonText}>💡 Electricity</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => quickSearch('beef', 'Food')}
          >
            <Text style={styles.quickButtonText}>🥩 Beef</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => quickSearch('chicken', 'Food')}
          >
            <Text style={styles.quickButtonText}>🍗 Chicken</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => quickSearch('pork', 'Food')}
          >
            <Text style={styles.quickButtonText}>🍖 Pork</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => quickSearch('fish', 'Food')}
          >
            <Text style={styles.quickButtonText}>🐟 Fish</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => quickSearch('fuel oil', 'Fuels')}
          >
            <Text style={styles.quickButtonText}>🔥 Fuel Oil</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => quickSearch('heating', 'Energy')}
          >
            <Text style={styles.quickButtonText}>🏠 Heating</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => quickSearch('flight', 'Transportation')}
          >
            <Text style={styles.quickButtonText}>✈️ Flight</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search: car, bus, beef, electricity..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchActivities}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={searchActivities}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Ionicons name="search" size={24} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Results */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>
          📊 Results ({results.length})
        </Text>
        
        {results.map((result, index) => (
          <View key={index} style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultName}>{result.name}</Text>
              <View style={styles.resultBadge}>
                <Text style={styles.resultBadgeText}>{result.category}</Text>
              </View>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Activity ID:</Text>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={() => copyToClipboard(result.activity_id)}
              >
                <Text style={styles.activityId} numberOfLines={2}>
                  {result.activity_id}
                </Text>
                <Ionicons name="copy-outline" size={16} color="#10B981" />
              </TouchableOpacity>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Region:</Text>
              <Text style={styles.resultValue}>{result.region || 'Global'}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Year:</Text>
              <Text style={styles.resultValue}>{result.year || 'N/A'}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Unit Type:</Text>
              <Text style={styles.resultValue}>{result.unit_type}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Source:</Text>
              <Text style={styles.resultValue} numberOfLines={1}>
                {result.source}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.testButton}
              onPress={() => testActivityId(result.activity_id)}
            >
              <Ionicons name="flask-outline" size={16} color="#FFF" />
              <Text style={styles.testButtonText}>Test This ID</Text>
            </TouchableOpacity>
          </View>
        ))}

        {results.length === 0 && !loading && !error && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              Search for activities above to find their IDs
            </Text>
            <Text style={styles.emptySubtext}>
              Tip: Use the category filter to narrow down results
            </Text>
          </View>
        )}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>💡 How to use:</Text>
        <Text style={styles.infoText}>
          1. Select a category filter (or leave as "All")
        </Text>
        <Text style={styles.infoText}>
          2. Search for an activity (e.g., "car", "beef", "electricity")
        </Text>
        <Text style={styles.infoText}>
          3. Find the result that matches your need
        </Text>
        <Text style={styles.infoText}>
          4. Copy the Activity ID
        </Text>
        <Text style={styles.infoText}>
          5. Use it in your EmissionService mapping
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
    color: '#FFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 4,
    opacity: 0.9,
  },
  categoryContainer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  categoryButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#FFF',
  },
  quickSearchContainer: {
    padding: 16,
    backgroundColor: '#FFF',
    marginTop: 1,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  quickButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  searchButton: {
    backgroundColor: '#10B981',
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#DC2626',
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
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  resultBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  resultBadgeText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  activityId: {
    fontSize: 12,
    color: '#10B981',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  testButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  testButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
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
});