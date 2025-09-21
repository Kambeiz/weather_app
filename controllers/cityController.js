// Use PostgreSQL for production, fallback to memory for development
const dbModule = (process.env.DATABASE_URL || process.env.SUPABASE_URL) ? '../database/postgresDb' : '../database/memoryDb';
const { query, run, getUserFavoriteCities: getDbFavoriteCities, addFavoriteCity: addDbFavoriteCity, removeFavoriteCity: removeDbFavoriteCity } = require(dbModule);
const { getWeatherData } = require('../services/weatherService');

/**
 * Get all favorite cities for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of favorite cities
 */
async function getUserFavoriteCities(userId) {
  try {
    return await getDbFavoriteCities(userId);
  } catch (error) {
    console.error('Error getting user favorite cities:', error);
    throw error;
  }
}

/**
 * Add a city to user's favorites
 * @param {number} userId - User ID
 * @param {string} cityName - Name of the city
 * @param {string} countryCode - Country code (optional)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} The added city
 */
async function addFavoriteCity(userId, cityName, countryCode, lat, lon) {
  try {
    const cityId = await addDbFavoriteCity(userId, cityName, countryCode, lat, lon);
    return {
      id: cityId,
      city_name: cityName,
      country_code: countryCode,
      lat,
      lon
    };
  } catch (error) {
    console.error('Error adding favorite city:', error);
    throw error;
  }
}

/**
 * Remove a city from user's favorites
 * @param {number} userId - User ID
 * @param {number} cityId - City ID to remove
 * @returns {Promise<boolean>} True if the city was removed, false otherwise
 */
async function removeFavoriteCity(userId, cityId) {
  try {
    return await removeDbFavoriteCity(userId, cityId);
  } catch (error) {
    console.error('Error removing favorite city:', error);
    throw error;
  }
}

/**
 * Get weather for all favorite cities
 * @param {number} userId - User ID
 * @param {string} units - Units of measurement (metric or imperial)
 * @returns {Promise<Array>} Array of cities with weather data
 */
async function getFavoriteCitiesWithWeather(userId, units = 'metric') {
  try {
    const cities = await getUserFavoriteCities(userId);
    
    if (cities.length === 0) {
      return [];
    }
    
    // Get weather for each city
    const weatherPromises = cities.map(async (city) => {
      try {
        const weather = await getWeatherData(city.lat, city.lon, units);
        return {
          ...city,
          weather
        };
      } catch (error) {
        console.error(`Error getting weather for ${city.city_name}:`, error);
        return {
          ...city,
          error: 'Failed to fetch weather data'
        };
      }
    });
    
    return Promise.all(weatherPromises);
  } catch (error) {
    console.error('Error getting favorite cities with weather:', error);
    throw error;
  }
}

module.exports = {
  getUserFavoriteCities,
  addFavoriteCity,
  removeFavoriteCity,
  getFavoriteCitiesWithWeather
};
