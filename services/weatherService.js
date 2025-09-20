const axios = require('axios');
require('dotenv').config();

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org';

/**
 * Get weather data for a specific location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} units - Units of measurement (metric or imperial)
 * @returns {Promise<Object>} Weather data
 */
async function getWeatherData(lat, lon, units = 'metric') {
  try {
    const response = await axios.get(`${OPENWEATHER_BASE_URL}/data/2.5/weather`, {
      params: {
        lat,
        lon,
        units,
        appid: OPENWEATHER_API_KEY,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw new Error('Failed to fetch weather data');
  }
}

/**
 * Get coordinates for a city name
 * @param {string} query - City name
 * @param {string} country - Optional country code for filtering
 * @returns {Promise<Array>} Array of location data
 */
async function getCityCoordinates(query, country = null) {
  try {
    // Build query with country filter if provided
    const searchQuery = country ? `${query},${country}` : query;
    
    const response = await axios.get(`${OPENWEATHER_BASE_URL}/geo/1.0/direct`, {
      params: {
        q: searchQuery,
        limit: 5,
        appid: OPENWEATHER_API_KEY,
      },
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No locations found');
    }

    // Format the response to include only necessary data
    return response.data.map(location => ({
      name: location.name,
      country: location.country,
      state: location.state,
      lat: location.lat,
      lon: location.lon,
    }));
  } catch (error) {
    console.error('Error fetching city coordinates:', error);
    throw new Error('Failed to find location');
  }
}

/**
 * Get weather data for multiple cities
 * @param {Array} cities - Array of city objects with lat and lon
 * @param {string} units - Units of measurement (metric or imperial)
 * @returns {Promise<Array>} Array of weather data for each city
 */
async function getWeatherForCities(cities, units = 'metric') {
  try {
    const weatherPromises = cities.map(city => 
      getWeatherData(city.lat, city.lon, units)
        .then(weather => ({
          ...city,
          weather
        }))
        .catch(error => {
          console.error(`Error fetching weather for ${city.city_name}:`, error);
          return {
            ...city,
            error: 'Failed to fetch weather data'
          };
        })
    );

    return Promise.all(weatherPromises);
  } catch (error) {
    console.error('Error fetching weather for multiple cities:', error);
    throw new Error('Failed to fetch weather for multiple cities');
  }
}

module.exports = {
  getWeatherData,
  getCityCoordinates,
  getWeatherForCities,
};
