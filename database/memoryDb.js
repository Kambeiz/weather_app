const bcrypt = require('bcryptjs');

// In-memory database for Vercel serverless compatibility
let users = [];
let favoriteCities = [];
let nextUserId = 1;
let nextCityId = 1;

// User operations
const createUser = async (username, password) => {
  // Check if user already exists
  const existingUser = users.find(u => u.username === username);
  if (existingUser) {
    throw new Error('Username already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: nextUserId++,
    username,
    password: hashedPassword,
    created_at: new Date().toISOString()
  };
  
  users.push(user);
  return { id: user.id, username: user.username };
};

const findUserByUsername = async (username) => {
  return users.find(u => u.username === username);
};

// Favorite cities operations
const addFavoriteCity = async (userId, cityName, countryCode, lat, lon) => {
  // Check if city already exists for user
  const existing = favoriteCities.find(c => 
    c.user_id === userId && c.lat === lat && c.lon === lon
  );
  
  if (existing) {
    throw new Error('City already in favorites');
  }

  const city = {
    id: nextCityId++,
    user_id: userId,
    city_name: cityName,
    country_code: countryCode,
    lat,
    lon,
    created_at: new Date().toISOString()
  };
  
  favoriteCities.push(city);
  return city.id;
};

const removeFavoriteCity = async (userId, cityId) => {
  const index = favoriteCities.findIndex(c => 
    c.id === parseInt(cityId) && c.user_id === userId
  );
  
  if (index > -1) {
    favoriteCities.splice(index, 1);
    return true;
  }
  return false;
};

const getUserFavoriteCities = async (userId) => {
  return favoriteCities
    .filter(c => c.user_id === userId)
    .map(c => ({
      id: c.id,
      city_name: c.city_name,
      country_code: c.country_code,
      lat: c.lat,
      lon: c.lon
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

// Helper functions for compatibility
const query = async (sql, params = []) => {
  // This is a placeholder for compatibility
  console.log('Memory DB query:', sql, params);
  return [];
};

const run = async (sql, params = []) => {
  // This is a placeholder for compatibility
  console.log('Memory DB run:', sql, params);
  return { id: 1, changes: 1 };
};

module.exports = {
  createUser,
  findUserByUsername,
  addFavoriteCity,
  removeFavoriteCity,
  getUserFavoriteCities,
  query,
  run
};
