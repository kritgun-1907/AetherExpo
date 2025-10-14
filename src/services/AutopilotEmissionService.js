// src/services/AutopilotEmissionService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../api/supabase';

const CLIMATIQ_API_KEY = '36MH766FPN409EJQD4V7PS0PEW';
const AUTOPILOT_BASE_URL = 'https://preview.api.climatiq.io/autopilot/v1-preview4'; // Correct URL from docs
const CLIMATIQ_BASE_URL = 'https://beta3.api.climatiq.io';

class AutopilotEmissionService {
  constructor() {
    this.suggestionCache = new Map();
    this.matchCache = new Map();
    this.cacheExpiry = 86400000;
    this.minSimilarityScore = 0.85;
  }

  async getSuggestions(description, unitType, options = {}) {
    const cacheKey = `suggest_${description}_${unitType}_${JSON.stringify(options)}`;
    
    if (this.suggestionCache.has(cacheKey)) {
      const cached = this.suggestionCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('Using cached suggestions');
        return cached.data;
      }
    }

    // Build request body according to Autopilot API spec
    const requestBody = {
      suggest: {
        text: description,
        model: options.model || 'general',
        unit_type: this.mapUnitType(unitType),
        year: options.year || new Date().getFullYear(),
        region: options.region || undefined,
        region_fallback: options.regionFallback !== false,
        source: options.source || undefined,
        exclude_source: options.excludeSource || undefined,
        source_lca_activity: options.lifecycleActivity || undefined,
        access_type: options.accessType || ['public']
      },
      max_suggestions: options.maxSuggestions || 10
    };

    console.log('Requesting Autopilot suggestions:', requestBody);

    try {
      const response = await fetch(`${AUTOPILOT_BASE_URL}/suggest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 404) {
        console.log('Autopilot API not available, falling back to standard search');
        return this.fallbackToStandardSearch(description, unitType, options);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Autopilot API Error:', errorText);
        
        // Check if it's a "not opted in" error
        if (errorText.includes('opt-in') || errorText.includes('preview')) {
          console.log('Autopilot requires opt-in. Using fallback method.');
          return this.fallbackToStandardSearch(description, unitType, options);
        }
        
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform Autopilot response to our expected format
      const suggestions = (data.results || []).map(result => ({
        suggestion_id: result.suggestion_id,
        emission_factor_id: result.emission_factor?.id || result.suggestion_id,
        name: result.emission_factor?.name || description,
        source: result.emission_factor?.source || 'autopilot',
        year: result.emission_factor?.year,
        region: result.emission_factor?.region,
        similarity_score: result.suggestion_details?.label === 'accept' ? 0.9 : 0.7,
        factor: result.emission_factor?.factor,
        unit: result.emission_factor?.unit,
        unit_type: result.emission_factor?.unit_type
      }));
      
      this.suggestionCache.set(cacheKey, {
        data: suggestions,
        timestamp: Date.now()
      });

      return suggestions;

    } catch (error) {
      console.error('Error getting Autopilot suggestions:', error);
      return this.fallbackToStandardSearch(description, unitType, options);
    }
  }

  mapUnitType(unitType) {
    // Map our unit types to Autopilot's expected format
    const mapping = {
      'distance': ['Number'],
      'weight': ['Weight'],
      'money': ['Money'],
      'volume': ['Volume'],
      'energy': ['Number'],
      'number': ['Number']
    };
    
    return mapping[unitType.toLowerCase()] || ['Weight', 'Money', 'Volume', 'Number'];
  }

  async fallbackToStandardSearch(description, unitType, options = {}) {
    try {
      // Use standard Climatiq search API as fallback
      const searchQuery = this.buildSearchQuery(description);
      
      const response = await fetch(`${CLIMATIQ_BASE_URL}/search?query=${encodeURIComponent(searchQuery)}&limit=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
        }
      });

      if (!response.ok) {
        throw new Error('Search API also failed');
      }

      const data = await response.json();
      
      return this.transformSearchResults(data.results || [], description);

    } catch (error) {
      console.error('Fallback search also failed:', error);
      // Last resort: use local suggestions
      return this.getLocalSuggestions(description, unitType);
    }
  }

  buildSearchQuery(description) {
    const keywords = this.extractKeywords(description);
    return keywords.join(' ');
  }

  extractKeywords(description) {
    const lower = description.toLowerCase();
    const keywords = [];
    
    // Transport
    if (lower.includes('drive') || lower.includes('drove') || lower.includes('car')) keywords.push('passenger vehicle car');
    if (lower.includes('bus')) keywords.push('bus public');
    if (lower.includes('train')) keywords.push('train rail');
    if (lower.includes('flight') || lower.includes('fly')) keywords.push('flight air');
    
    // Food
    if (lower.includes('beef') || lower.includes('steak')) keywords.push('beef meat');
    if (lower.includes('chicken')) keywords.push('chicken poultry');
    if (lower.includes('vegetable')) keywords.push('vegetables');
    
    // Energy
    if (lower.includes('electricity')) keywords.push('electricity grid');
    if (lower.includes('gas')) keywords.push('natural gas');
    
    // Shopping
    if (lower.includes('clothing') || lower.includes('shirt')) keywords.push('clothing textile');
    if (lower.includes('phone') || lower.includes('electronic')) keywords.push('electronics');
    
    return keywords.length > 0 ? keywords : [description];
  }

  transformSearchResults(results, originalDescription) {
    return results.map((result, index) => ({
      suggestion_id: `search_${result.activity_id || index}`,
      emission_factor_id: result.id,
      name: result.name || result.activity_id,
      source: result.source || 'climatiq',
      year: result.year,
      region: result.region || 'GLOBAL',
      similarity_score: this.calculateSimilarity(originalDescription, result.name || ''),
      factor: result.factor,
      unit: result.unit
    })).sort((a, b) => b.similarity_score - a.similarity_score);
  }

  calculateSimilarity(description, factorName) {
    const desc = description.toLowerCase();
    const name = factorName.toLowerCase();
    
    let score = 0.5; // Base score
    const descWords = desc.split(/\s+/);
    
    for (const word of descWords) {
      if (name.includes(word) && word.length > 3) {
        score += 0.15;
      }
    }
    
    return Math.min(score, 0.95);
  }

  getLocalSuggestions(description, unitType) {
    const lower = description.toLowerCase();
    const suggestions = [];
    
    const localFactors = {
      transport: [
        { pattern: /car|drive|drove/i, id: 'car_petrol', name: 'Petrol Car', factor: 0.21, unit: 'km' },
        { pattern: /bus/i, id: 'bus', name: 'Bus', factor: 0.089, unit: 'km' },
        { pattern: /train/i, id: 'train', name: 'Train', factor: 0.041, unit: 'km' },
        { pattern: /flight|fly/i, id: 'flight', name: 'Flight', factor: 0.255, unit: 'km' },
      ],
      food: [
        { pattern: /beef|steak/i, id: 'beef', name: 'Beef', factor: 27, unit: 'kg' },
        { pattern: /chicken/i, id: 'chicken', name: 'Chicken', factor: 6.9, unit: 'kg' },
        { pattern: /vegetable/i, id: 'vegetables', name: 'Vegetables', factor: 2, unit: 'kg' },
      ],
      energy: [
        { pattern: /electricity/i, id: 'electricity', name: 'Electricity', factor: 0.233, unit: 'kWh' },
        { pattern: /gas/i, id: 'gas', name: 'Natural Gas', factor: 2.04, unit: 'm³' },
      ]
    };

    for (const [category, factors] of Object.entries(localFactors)) {
      for (const factor of factors) {
        if (factor.pattern.test(lower)) {
          suggestions.push({
            suggestion_id: `local_${factor.id}`,
            emission_factor_id: factor.id,
            name: factor.name,
            source: 'local',
            similarity_score: 0.75,
            factor: factor.factor,
            unit: factor.unit,
            category
          });
        }
      }
    }

    return suggestions;
  }

  async estimateEmissions(suggestionId, quantity, unitType, unit) {
    // If it's a local suggestion, calculate locally
    if (suggestionId.startsWith('local_') || suggestionId.startsWith('search_')) {
      const localFactors = {
        'local_car_petrol': 0.21,
        'local_bus': 0.089,
        'local_train': 0.041,
        'local_flight': 0.255,
        'local_beef': 27,
        'local_chicken': 6.9,
        'local_vegetables': 2,
        'local_electricity': 0.233,
        'local_gas': 2.04,
      };
      
      const factorId = suggestionId.replace('search_', 'local_');
      const factor = localFactors[factorId] || 0.1;
      
      return {
        co2e: quantity * factor,
        co2e_unit: 'kg',
        source: 'local_estimate'
      };
    }

    // Try Autopilot estimate endpoint
    try {
      const response = await fetch(`${AUTOPILOT_BASE_URL}/suggest/estimate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          suggestion_id: suggestionId,
          parameters: this.buildParameters(quantity, unitType, unit)
        })
      });

      if (!response.ok) {
        throw new Error('Estimate failed');
      }

      const data = await response.json();
      return {
        co2e: data.estimate?.co2e || 0,
        co2e_unit: data.estimate?.co2e_unit || 'kg',
        source: 'autopilot'
      };
      
    } catch (error) {
      console.error('Autopilot estimate failed:', error);
      // Fallback to local calculation
      return {
        co2e: quantity * 0.1,
        co2e_unit: 'kg',
        source: 'fallback'
      };
    }
  }

  buildParameters(quantity, unitType, unit) {
    const params = {};
    
    switch (unitType.toLowerCase()) {
      case 'weight':
        params.weight = quantity;
        params.weight_unit = unit || 'kg';
        break;
      case 'money':
        params.money = quantity;
        params.money_unit = unit || 'usd';
        break;
      case 'volume':
        params.volume = quantity;
        params.volume_unit = unit || 'l';
        break;
      case 'distance':
      case 'energy':
      case 'number':
      default:
        params.number = quantity;
        break;
    }
    
    return params;
  }

  async calculateWithAutopilot(description, quantity, unitType, unit, options = {}) {
    try {
      const suggestions = await this.getSuggestions(description, unitType, options);
      
      if (!suggestions || suggestions.length === 0) {
        return {
          success: false,
          error: 'No emission factors found',
          emissions: 0
        };
      }

      const selectedFactor = suggestions[0];
      const emissions = await this.estimateEmissions(
        selectedFactor.suggestion_id,
        quantity,
        unitType,
        unit
      );

      return {
        success: true,
        emissions: emissions.co2e,
        unit: emissions.co2e_unit,
        source: emissions.source,
        confidence: selectedFactor.similarity_score,
        emissionFactor: selectedFactor
      };

    } catch (error) {
      console.error('Autopilot calculation failed:', error);
      return {
        success: false,
        error: error.message,
        emissions: 0
      };
    }
  }
}

export default new AutopilotEmissionService();