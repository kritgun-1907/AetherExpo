// src/api/climatiq.js
const CLIMATIQ_API_KEY = '36MH766FPN409EJQD4V7PS0PEW';

export const calculateRealEmissions = async (activity, value) => {
  try {
    const response = await fetch('https://beta3.api.climatiq.io/estimate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emission_factor: {
          activity_id: activity,
        },
        parameters: {
          distance: value,
          distance_unit: 'km'
        }
      })
    });
    
    const data = await response.json();
    return data.co2e || 0;
  } catch (error) {
    console.error('Climatiq error:', error);
    // Fallback to local calculation
    return value * 0.21; // Average car emissions
  }
};