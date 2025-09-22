import axios from 'axios';
import { CLIMATIQ_API_KEY } from '@env';

const climatiqAPI = axios.create({
  baseURL: 'https://beta4.api.climatiq.io',
  headers: {
    'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

export const calculateTransportEmissions = async (mode, distance) => {
  try {
    const response = await climatiqAPI.post('/estimate', {
      emission_factor: {
        activity_id: `passenger_vehicle-vehicle_type_${mode}`,
      },
      parameters: {
        distance: distance,
        distance_unit: 'km'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Climatiq API Error:', error);
    return null;
  }
};

export const calculateFoodEmissions = async (foodType, quantity) => {
  try {
    const response = await climatiqAPI.post('/estimate', {
      emission_factor: {
        activity_id: `consumer_goods-type_${foodType}`,
      },
      parameters: {
        weight: quantity,
        weight_unit: 'kg'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Food emission calculation error:', error);
    return null;
  }
};