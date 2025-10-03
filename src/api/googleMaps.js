// src/api/googleMaps.js
const GOOGLE_MAPS_API_KEY = 'AIzaSyAXwZK2l4RP6fTuGvKglvWFfJwu30KtlyE';

class GoogleMapsService {
  constructor() {
    this.apiKey = GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api';
  }

  // Get directions between two points
  async getDirections(origin, destination, mode = 'driving') {
    try {
      const url = `${this.baseUrl}/directions/json?` +
        `origin=${origin.latitude},${origin.longitude}&` +
        `destination=${destination.latitude},${destination.longitude}&` +
        `mode=${mode}&` +
        `key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          distance: route.legs[0].distance.value / 1000, // Convert to km
          duration: route.legs[0].duration.value / 60, // Convert to minutes
          polyline: route.overview_polyline.points,
          steps: route.legs[0].steps,
        };
      }
      
      throw new Error(`Directions API error: ${data.status}`);
    } catch (error) {
      console.error('Error getting directions:', error);
      throw error;
    }
  }

  // Decode polyline for drawing route
  decodePolyline(encoded) {
    const poly = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return poly;
  }

  // Reverse geocoding - get address from coordinates
  async reverseGeocode(latitude, longitude) {
    try {
      const url = `${this.baseUrl}/geocode/json?` +
        `latlng=${latitude},${longitude}&` +
        `key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        return {
          formattedAddress: data.results[0].formatted_address,
          components: data.results[0].address_components,
        };
      }
      
      throw new Error(`Geocoding API error: ${data.status}`);
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      throw error;
    }
  }

  // Get places nearby
  async getNearbyPlaces(latitude, longitude, type = 'restaurant', radius = 1000) {
    try {
      const url = `${this.baseUrl}/place/nearbysearch/json?` +
        `location=${latitude},${longitude}&` +
        `radius=${radius}&` +
        `type=${type}&` +
        `key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        return data.results.map(place => ({
          placeId: place.place_id,
          name: place.name,
          vicinity: place.vicinity,
          rating: place.rating,
          location: place.geometry.location,
          types: place.types,
        }));
      }
      
      throw new Error(`Places API error: ${data.status}`);
    } catch (error) {
      console.error('Error getting nearby places:', error);
      throw error;
    }
  }

  // Calculate distance between multiple points
  async getDistanceMatrix(origins, destinations, mode = 'driving') {
    try {
      const originsStr = origins.map(o => `${o.latitude},${o.longitude}`).join('|');
      const destinationsStr = destinations.map(d => `${d.latitude},${d.longitude}`).join('|');

      const url = `${this.baseUrl}/distancematrix/json?` +
        `origins=${originsStr}&` +
        `destinations=${destinationsStr}&` +
        `mode=${mode}&` +
        `key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        return data.rows[0].elements.map(element => ({
          distance: element.distance ? element.distance.value / 1000 : null,
          duration: element.duration ? element.duration.value / 60 : null,
          status: element.status,
        }));
      }
      
      throw new Error(`Distance Matrix API error: ${data.status}`);
    } catch (error) {
      console.error('Error getting distance matrix:', error);
      throw error;
    }
  }
}

export default new GoogleMapsService();
export { GOOGLE_MAPS_API_KEY };