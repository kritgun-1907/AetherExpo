// src/services/EmissionService.js - COMPLETE AND FIXED
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../api/supabase';

const CLIMATIQ_API_KEY = process.env.EXPO_PUBLIC_CLIMATIQ_API_KEY || '36MH766FPN409EJQD4V7PS0PEW';
const CLIMATIQ_BASE_URL = 'https://api.climatiq.io';

class EmissionService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 3600000;
    this.fallbackFactors = this.getMinimalFallbackFactors();
    this.isInitialized = false;
    this.initializeFallbackFactors();
  }

  async initializeFallbackFactors() {
    try {
      const { data } = await supabase
        .from('emission_factors')
        .select('*')
        .eq('is_active', true);
      
      if (data && data.length > 0) {
        this.fallbackFactors = this.organizeFallbackFactors(data);
        await AsyncStorage.setItem('emission_factors', JSON.stringify(this.fallbackFactors));
      } else {
        const stored = await AsyncStorage.getItem('emission_factors');
        if (stored) {
          this.fallbackFactors = JSON.parse(stored);
        }
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Error loading emission factors:', error);
      this.isInitialized = true;
    }
  }

  organizeFallbackFactors(data) {
    const organized = {};
    data.forEach(factor => {
      if (!organized[factor.category]) {
        organized[factor.category] = {};
      }
      organized[factor.category][factor.activity_id] = {
        factor: factor.emission_factor,
        unit: factor.unit,
        label: factor.label,
        source: factor.source,
        last_updated: factor.updated_at
      };
    });
    return organized;
  }

  getMinimalFallbackFactors() {
    return {
      transport: {
        car: { factor: 0.21, unit: 'km', label: 'Car', source: 'IPCC 2021' },
        vehicle: { factor: 0.21, unit: 'km', label: 'Vehicle', source: 'IPCC 2021' },
        car_petrol: { factor: 0.21, unit: 'km', label: 'Petrol Car', source: 'IPCC 2021' },
        car_diesel: { factor: 0.17, unit: 'km', label: 'Diesel Car', source: 'IPCC 2021' },
        car_electric: { factor: 0.05, unit: 'km', label: 'Electric Car', source: 'IPCC 2021' },
        bus: { factor: 0.089, unit: 'km', label: 'Bus', source: 'DEFRA 2023' },
        train: { factor: 0.041, unit: 'km', label: 'Train', source: 'DEFRA 2023' },
        motorcycle: { factor: 0.113, unit: 'km', label: 'Motorcycle', source: 'DEFRA 2023' },
        flight_domestic: { factor: 0.255, unit: 'km', label: 'Domestic Flight', source: 'ICAO' },
        flight_international: { factor: 0.195, unit: 'km', label: 'International Flight', source: 'ICAO' },
        automobile: { factor: 0.21, unit: 'km', label: 'Automobile', source: 'IPCC 2021' }
      },
      food: {
        meat: { factor: 27, unit: 'kg', label: 'Meat (Beef)', source: 'FAO' },
        beef: { factor: 27, unit: 'kg', label: 'Beef', source: 'FAO' },
        chicken: { factor: 6.9, unit: 'kg', label: 'Chicken', source: 'FAO' },
        pork: { factor: 7.19, unit: 'kg', label: 'Pork', source: 'FAO' },
        fish: { factor: 6.1, unit: 'kg', label: 'Fish', source: 'FAO' },
        vegetarian: { factor: 2, unit: 'kg', label: 'Vegetarian Meal', source: 'FAO' },
        vegan: { factor: 1.5, unit: 'kg', label: 'Vegan Meal', source: 'FAO' },
        dairy: { factor: 1.9, unit: 'L', label: 'Dairy', source: 'FAO' },
        vegetables: { factor: 2, unit: 'kg', label: 'Vegetables', source: 'FAO' }
      },
      home: {
        electricity: { factor: 0.233, unit: 'kWh', label: 'Electricity', source: 'IEA 2023' },
        gas: { factor: 2.04, unit: 'm³', label: 'Natural Gas', source: 'EPA' },
        natural_gas: { factor: 2.04, unit: 'm³', label: 'Natural Gas', source: 'EPA' },
        oil: { factor: 2.52, unit: 'L', label: 'Heating Oil', source: 'EPA' },
        fuel_oil: { factor: 2.52, unit: 'L', label: 'Fuel Oil', source: 'EPA' },
        fuel: { factor: 2.52, unit: 'L', label: 'Fuel', source: 'EPA' },
        heating: { factor: 2.04, unit: 'm³', label: 'Central Heating', source: 'EPA' },
        central_heating: { factor: 2.04, unit: 'm³', label: 'Central Heating', source: 'EPA' },
        water: { factor: 0.0003, unit: 'L', label: 'Water', source: 'EPA' }
      },
      shopping: {
        clothing: { factor: 8.11, unit: 'item', label: 'Clothing', source: 'WRI' },
        electronics: { factor: 70, unit: 'item', label: 'Electronics', source: 'WRI' },
        furniture: { factor: 25, unit: 'item', label: 'Furniture', source: 'WRI' },
        groceries: { factor: 2.5, unit: 'kg', label: 'Groceries', source: 'WRI' },
        plastic: { factor: 6, unit: 'kg', label: 'Plastic Products', source: 'WRI' }
      },
      education: {
        driving_school: { factor: 5, unit: 'hour', label: 'Driving School', source: 'Estimate' },
        flight_training: { factor: 50, unit: 'hour', label: 'Flight Training', source: 'Estimate' }
      }
    };
  }

  // UPDATED ACTIVITY IDs WITH YOUR VERIFIED FINDINGS
  getClimatiqActivityId(category, activity) {
    const mappings = {
      transport: {
        // General car/vehicle (VERIFIED)
        car: {
          activity_id: 'passenger_vehicle-vehicle_type_motor_vehicle_bodies_and_special_purpose_motor_vehicles-fuel_source_na-engine_size_na-vehicle_age_na-vehicle_weight_na',
          parameter_type: 'distance',
          unit: 'km'
        },
        vehicle: {
          activity_id: 'passenger_vehicle-vehicle_type_motor_vehicle_bodies_and_special_purpose_motor_vehicles-fuel_source_na-engine_size_na-vehicle_age_na-vehicle_weight_na',
          parameter_type: 'distance',
          unit: 'km'
        },
        automobile: {
          activity_id: 'education-type_automobile_driving_schools-automobile',
          parameter_type: 'money',
          unit: 'usd'
        },
        // Specific fuel types
        car_petrol: {
          activity_id: 'passenger_vehicle-vehicle_type_car-fuel_source_petrol-distance_na-engine_size_na',
          parameter_type: 'distance',
          unit: 'km'
        },
        car_diesel: {
          activity_id: 'passenger_vehicle-vehicle_type_car-fuel_source_diesel-distance_na-engine_size_na',
          parameter_type: 'distance',
          unit: 'km'
        },
        car_electric: {
          activity_id: 'passenger_vehicle-vehicle_type_car-fuel_source_bev-distance_na-engine_size_na',
          parameter_type: 'distance',
          unit: 'km'
        },
        bus: {
          activity_id: 'passenger_vehicle-vehicle_type_bus-fuel_source_na-distance_na-engine_size_na',
          parameter_type: 'distance',
          unit: 'km'
        },
        train: {
          activity_id: 'passenger_train-route_type_na-fuel_source_na',
          parameter_type: 'distance',
          unit: 'km'
        },
        motorcycle: {
          activity_id: 'passenger_vehicle-vehicle_type_motorcycle-fuel_source_na-engine_size_na-vehicle_age_na-vehicle_weight_na',
          parameter_type: 'distance',
          unit: 'km'
        },
        flight_domestic: {
          activity_id: 'passenger_flight-route_type_domestic-aircraft_type_na-distance_na-class_na-rf_na',
          parameter_type: 'distance',
          unit: 'km'
        },
        flight_international: {
          activity_id: 'passenger_flight-route_type_international-aircraft_type_na-distance_na-class_na-rf_na',
          parameter_type: 'distance',
          unit: 'km'
        }
      },
      food: {
        beef: {
          activity_id: 'food-type_beef_roast_beef_roasted_baked',
          parameter_type: 'weight',
          unit: 'kg'
        },
        chicken: {
          activity_id: 'food-type_chicken',
          parameter_type: 'weight',
          unit: 'kg'
        },
        meat: {
          activity_id: 'food-type_beef_roast_beef_roasted_baked',
          parameter_type: 'weight',
          unit: 'kg'
        },
        pork: {
          activity_id: 'food-type_pork',
          parameter_type: 'weight',
          unit: 'kg'
        },
        fish: {
          activity_id: 'fishing_aquaculture-type_fish_other_fishing_products_services_incidental_of_fishing-fish',
          parameter_type: 'weight',
          unit: 'kg'
        },
        dairy: {
          activity_id: 'food-type_milk',
          parameter_type: 'weight',
          unit: 'kg'
        },
        vegetables: {
          activity_id: 'food-type_vegetables',
          parameter_type: 'weight',
          unit: 'kg'
        }
      },
      home: {
        electricity: {
          activity_id: 'electricity-supply_grid-source_residual_mix',
          parameter_type: 'energy',
          unit: 'kWh'
        },
        // VERIFIED: Gas activity ID
        natural_gas: {
          activity_id: 'fuel-type_gas-fuel_use_na',
          parameter_type: 'energy',
          unit: 'kWh'
        },
        gas: {
          activity_id: 'fuel-type_gas-fuel_use_na',
          parameter_type: 'energy',
          unit: 'kWh'
        },
        // VERIFIED: Fuel oil activity ID
        fuel_oil: {
          activity_id: 'fuel-type_fuel_oil-fuel_use_stationary',
          parameter_type: 'energy',
          unit: 'kWh'
        },
        oil: {
          activity_id: 'fuel-type_fuel_oil-fuel_use_stationary',
          parameter_type: 'energy',
          unit: 'kWh'
        },
        fuel: {
          activity_id: 'fuel-type_fuel_oil-fuel_use_stationary',
          parameter_type: 'energy',
          unit: 'kWh'
        },
        heating: {
          activity_id: 'heat_and_steam-type_district_heating_oil',
          parameter_type: 'energy',
          unit: 'kWh'
        },
        central_heating: {
          activity_id: 'heat_and_steam-type_district_heating_oil',
          parameter_type: 'energy',
          unit: 'kWh'
        }
      },
      shopping: {
        clothing: {
          activity_id: 'consumer_goods-type_clothing_clothing_accessories_stores',
          parameter_type: 'money',
          unit: 'usd'
        },
        electronics: {
          activity_id: 'electronics-type_other_electronic_components',
          parameter_type: 'money',
          unit: 'usd'
        },
        furniture: {
          activity_id: 'waste-type_waste_and_scrap_of_wood_and_wood_by_products-disposal_method_na',
          parameter_type: 'money',
          unit: 'usd'
        }
      },
      education: {
        driving_school: {
          activity_id: 'education-type_automobile_driving_schools-automobile',
          parameter_type: 'money',
          unit: 'usd'
        },
        flight_training: {
          activity_id: 'education-type_flight_training',
          parameter_type: 'money',
          unit: 'usd'
        }
      }
    };

    return mappings[category]?.[activity] || null;
  }

  async calculateEmissions(category, activity, amount, options = {}) {
    console.log(`🔍 Calculating emissions: ${category}/${activity} - ${amount} ${options.unit || ''}`);
    
    const cacheKey = `${category}_${activity}_${amount}_${JSON.stringify(options)}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('✅ Using cached data');
        return cached.data;
      }
    }

    // Try Climatiq API first
    try {
      console.log('🌐 Trying Climatiq API...');
      const climatiqResult = await this.calculateWithClimatiq(category, activity, amount, options);
      
      if (climatiqResult.success) {
        console.log('✅ Climatiq API success:', climatiqResult.emissions, 'kg CO2e');
        
        this.cache.set(cacheKey, {
          data: climatiqResult,
          timestamp: Date.now()
        });
        
        await this.storeCalculation(category, activity, amount, climatiqResult.emissions, 'climatiq');
        
        return climatiqResult;
      }
    } catch (error) {
      console.warn('⚠️ Climatiq API failed:', error.message);
      console.log('📊 Falling back to local emission factors...');
    }

    // Fallback to local factors
    const fallbackResult = await this.calculateWithFallback(category, activity, amount, options);
    
    if (fallbackResult.success) {
      this.cache.set(cacheKey, {
        data: fallbackResult,
        timestamp: Date.now()
      });
    }
    
    return fallbackResult;
  }

  async calculateWithClimatiq(category, activity, amount, options = {}) {
  const activityMapping = this.getClimatiqActivityId(category, activity);
  
  if (!activityMapping) {
    throw new Error(`No Climatiq mapping for ${category}/${activity}`);
  }

  // Build parameters based on parameter type
  const parameters = {};
  if (activityMapping.parameter_type === 'distance') {
    parameters.distance = amount;
    parameters.distance_unit = options.unit || activityMapping.unit;
  } else if (activityMapping.parameter_type === 'weight') {
    parameters.weight = amount;
    parameters.weight_unit = options.unit || activityMapping.unit;
  } else if (activityMapping.parameter_type === 'energy') {
    parameters.energy = amount;
    parameters.energy_unit = options.unit || activityMapping.unit;
  } else if (activityMapping.parameter_type === 'money') {
    parameters.money = amount;
    parameters.money_unit = options.unit || activityMapping.unit || 'usd';
  } else if (activityMapping.parameter_type === 'volume') {
    parameters.volume = amount;
    parameters.volume_unit = options.unit || activityMapping.unit;
  }

  const requestBody = {
    emission_factor: {
      activity_id: activityMapping.activity_id,
      data_version: '^23'
    },
    parameters
  };

  console.log('📤 Climatiq request:', JSON.stringify(requestBody, null, 2));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${CLIMATIQ_BASE_URL}/estimate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Climatiq API error:', errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Climatiq response:', data);
    
    // 🔥 FIX: Return 'api' instead of 'Climatiq API (Real-time)'
    return {
      success: true,
      emissions: data.co2e || 0,
      unit: data.co2e_unit || 'kg',
      source: 'api', // ✅ FIXED: Matches database constraint
      source_detail: 'Climatiq API', // ✅ NEW: Store detail separately
      emission_factor: data.emission_factor?.factor,
      calculation_id: data.calculation_id,
      confidence: 'high',
      details: {
        co2: data.co2 || 0,
        ch4: data.ch4 || 0,
        n2o: data.n2o || 0,
        co2e_total: data.co2e || 0,
        methodology: data.emission_factor?.source,
        region: data.emission_factor?.region
      }
    };
  } catch (error) {
    console.error('❌ Climatiq API error:', error);
    throw error;
  }
}

  async calculateWithFallback(category, activity, amount, options = {}) {
  console.log('📊 Using fallback calculation...');
  
  const factor = this.fallbackFactors[category]?.[activity];
  
  if (!factor) {
    return {
      success: false,
      error: `No emission factor found for ${category}/${activity}`,
      emissions: 0
    };
  }

  const emissions = amount * factor.factor;

  return {
    success: true,
    emissions: emissions,
    unit: 'kg CO2e',
    source: 'manual', // ✅ FIXED: Matches database constraint
    source_detail: `Local Database (${factor.source})`, // ✅ NEW: Store detail separately
    emission_factor: factor.factor,
    confidence: 'medium',
    details: {
      factor_source: factor.source,
      last_updated: factor.last_updated
    }
  };
}

  async storeCalculation(category, activity, amount, emissions, source) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('emission_calculations').insert({
          user_id: user.id,
          category,
          activity,
          amount,
          emissions,
          source,
          calculated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error storing calculation:', error);
    }
  }

  async testApiConnection() {
    console.log('🧪 Testing Climatiq API connection...');
    console.log('🔑 API Key (first 10 chars):', CLIMATIQ_API_KEY.substring(0, 10) + '...');
    
    try {
      const response = await fetch(
        `${CLIMATIQ_BASE_URL}/data/v1/search?query=car&data_version=^23&results_per_page=1`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${CLIMATIQ_API_KEY}`
          }
        }
      );
      
      console.log('📥 Response status:', response.status);
      
      if (response.status === 401) {
        return { success: false, error: 'Invalid API key' };
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API connection successful!');
        return { 
          success: true, 
          message: 'Connected to Climatiq API',
          sample_results: data.results?.length || 0
        };
      }
      
      return { success: false, error: `HTTP ${response.status}` };
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return { 
        success: false, 
        error: error.message
      };
    }
  }

  async searchEmissionFactors(query, category = null) {
    try {
      const params = new URLSearchParams({ 
        query, 
        data_version: '^23',
        results_per_page: '20' 
      });
      
      if (category) params.append('category', category);

      const response = await fetch(
        `${CLIMATIQ_BASE_URL}/data/v1/search?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${CLIMATIQ_API_KEY}`
          }
        }
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      return {
        success: true,
        results: data.results || []
      };
    } catch (error) {
      console.error('Search error:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  async calculateBatch(activities) {
    const results = await Promise.all(
      activities.map(async (activity) => {
        const result = await this.calculateEmissions(
          activity.category,
          activity.type,
          activity.amount,
          activity.options || {}
        );
        return { ...activity, ...result };
      })
    );

    const totalEmissions = results.reduce((sum, r) => sum + (r.emissions || 0), 0);
    
    return {
      activities: results,
      total: totalEmissions,
      unit: 'kg CO2e'
    };
  }

  // Helper method to get all available activities by category
  getAvailableActivities(category) {
    const mappings = this.getClimatiqActivityId(category, '');
    return Object.keys(mappings || {});
  }

  // Helper method to validate activity ID
  async validateActivityId(activityId) {
    try {
      const response = await fetch(`${CLIMATIQ_BASE_URL}/estimate`, {
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
            distance: 1,
            distance_unit: 'km'
          }
        })
      });

      return {
        valid: response.ok,
        status: response.status
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

export default new EmissionService();