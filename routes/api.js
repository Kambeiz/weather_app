const express = require('express');
const router = express.Router();
const { 
    getWeatherData, 
    getForecastData, 
    getAirPollutionData,
    getMarineWeatherData,
    getHistoricalWeatherData,
    getAstronomyData
} = require('../services/weatherProviders');
const { getCityCoordinates } = require('../services/weatherService');
const { 
  getUserFavoriteCities, 
  addFavoriteCity, 
  removeFavoriteCity 
} = require('../controllers/cityController');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Get weather data for a location (public endpoint - no auth required)
router.get('/weather', async (req, res) => {
  try {
    const { lat, lon, units = 'metric', provider = 'openweather' } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    // Use the new provider system with fallback
    const weatherData = await getWeatherData(lat, lon, units, provider);
    res.json(weatherData);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    res.status(500).json({ message: 'Failed to fetch weather data' });
  }
});

// Search for city coordinates (public endpoint - no auth required)
router.get('/geocode', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const results = await getCityCoordinates(q);
    res.json(results);
  } catch (error) {
    console.error('Error geocoding city:', error);
    res.status(500).json({ message: 'Failed to find location' });
  }
});

// Get user's favorite cities
router.get('/cities', requireAuth, async (req, res) => {
  try {
    const cities = await getUserFavoriteCities(req.session.userId);
    res.json(cities);
  } catch (error) {
    console.error('Error fetching favorite cities:', error);
    res.status(500).json({ message: 'Failed to fetch favorite cities' });
  }
});

// Add a city to favorites
router.post('/cities', requireAuth, async (req, res) => {
  try {
    const { cityName, countryCode, lat, lon } = req.body;
    
    if (!cityName || lat === undefined || lon === undefined) {
      return res.status(400).json({ message: 'City name and coordinates are required' });
    }
    
    const city = await addFavoriteCity(req.session.userId, cityName, countryCode, lat, lon);
    res.status(201).json(city);
  } catch (error) {
    console.error('Error adding favorite city:', error);
    res.status(500).json({ message: 'Failed to add favorite city' });
  }
});

// Remove a city from favorites
router.delete('/cities/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await removeFavoriteCity(req.session.userId, id);
    
    if (!success) {
      return res.status(404).json({ message: 'City not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error removing favorite city:', error);
    res.status(500).json({ message: 'Failed to remove favorite city' });
  }
});

// Get forecast data for a location (public endpoint - no auth required)
router.get('/forecast', async (req, res) => {
  try {
    const { lat, lon, units = 'metric', provider = 'openweather' } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    const forecastData = await getForecastData(lat, lon, units, provider);
    res.json(forecastData);
  } catch (error) {
    console.error('Error fetching forecast data:', error);
    res.status(500).json({ message: 'Failed to fetch forecast data' });
  }
});

// Get air pollution data (OpenWeather API)
router.get('/air-pollution', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    const airPollutionData = await getAirPollutionData(lat, lon);
    res.json(airPollutionData);
  } catch (error) {
    console.error('Error fetching air pollution data:', error);
    res.status(500).json({ message: 'Failed to fetch air pollution data' });
  }
});

// Get marine weather data (WeatherAPI)
router.get('/marine', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    const marineData = await getMarineWeatherData(lat, lon);
    res.json(marineData);
  } catch (error) {
    console.error('Error fetching marine weather data:', error);
    res.status(500).json({ message: 'Failed to fetch marine weather data' });
  }
});

// Get historical weather data (WeatherAPI - up to 7 days back)
router.get('/historical', async (req, res) => {
  try {
    const { lat, lon, date } = req.query;
    
    if (!lat || !lon || !date) {
      return res.status(400).json({ message: 'Latitude, longitude, and date are required' });
    }
    
    // Validate date format (YYYY-MM-DD) and ensure it's within last 7 days
    const requestDate = new Date(date);
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    if (requestDate > today || requestDate < sevenDaysAgo) {
      return res.status(400).json({ 
        message: 'Date must be within the last 7 days and not in the future' 
      });
    }
    
    const historicalData = await getHistoricalWeatherData(lat, lon, date);
    res.json(historicalData);
  } catch (error) {
    console.error('Error fetching historical weather data:', error);
    res.status(500).json({ message: 'Failed to fetch historical weather data' });
  }
});

// Get astronomy data (WeatherAPI)
router.get('/astronomy', async (req, res) => {
  try {
    const { lat, lon, date } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    // If no date provided, use today
    const queryDate = date || new Date().toISOString().split('T')[0];
    
    const astronomyData = await getAstronomyData(lat, lon, queryDate);
    res.json(astronomyData);
  } catch (error) {
    console.error('Error fetching astronomy data:', error);
    res.status(500).json({ message: 'Failed to fetch astronomy data' });
  }
});

module.exports = router;
