const bcrypt = require('bcryptjs');

// In-memory database for Vercel serverless compatibility
let users = [];
let favoriteCities = [];
let passwordResetTokens = [];
let nextUserId = 1;
let nextCityId = 1;

// User operations
const createUser = async (username, password, email = null) => {
  console.log('MemoryDB: Creating user:', username, 'with email:', email);
  console.log('MemoryDB: Current users count:', users.length);
  
  // Check if user already exists
  const existingUser = users.find(u => u.username === username);
  if (existingUser) {
    console.log('MemoryDB: User already exists:', username);
    throw new Error('Username already exists');
  }

  // Check if email already exists
  if (email) {
    const existingEmail = users.find(u => u.email === email);
    if (existingEmail) {
      console.log('MemoryDB: Email already exists:', email);
      throw new Error('Email already exists');
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: nextUserId++,
    username,
    email,
    password: hashedPassword,
    created_at: new Date().toISOString()
  };
  
  users.push(user);
  console.log('MemoryDB: User created successfully:', user.id, username);
  console.log('MemoryDB: Total users now:', users.length);
  return { id: user.id, username: user.username, email: user.email };
};

const findUserByUsername = async (username) => {
  console.log('MemoryDB: Finding user:', username);
  console.log('MemoryDB: Available users:', users.map(u => u.username));
  const user = users.find(u => u.username === username);
  console.log('MemoryDB: User found:', !!user);
  return user;
};

const findUserByEmail = async (email) => {
  console.log('MemoryDB: Finding user by email:', email);
  const user = users.find(u => u.email === email);
  console.log('MemoryDB: User found by email:', !!user);
  return user;
};

// Password reset token operations
const createPasswordResetToken = async (email) => {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
  
  // Remove any existing tokens for this email
  passwordResetTokens = passwordResetTokens.filter(t => t.email !== email);
  
  const resetToken = {
    token,
    email,
    expiresAt,
    used: false
  };
  
  passwordResetTokens.push(resetToken);
  console.log('MemoryDB: Password reset token created for:', email);
  return token;
};

const validatePasswordResetToken = async (token) => {
  const resetToken = passwordResetTokens.find(t => 
    t.token === token && !t.used && new Date() < new Date(t.expiresAt)
  );
  
  console.log('MemoryDB: Token validation result:', !!resetToken);
  return resetToken;
};

const usePasswordResetToken = async (token) => {
  const resetToken = passwordResetTokens.find(t => t.token === token);
  if (resetToken) {
    resetToken.used = true;
    console.log('MemoryDB: Password reset token used:', token);
    return true;
  }
  return false;
};

const updateUserPassword = async (email, newPassword) => {
  const user = users.find(u => u.email === email);
  if (user) {
    user.password = await bcrypt.hash(newPassword, 10);
    console.log('MemoryDB: Password updated for user:', email);
    return true;
  }
  return false;
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
  findUserByEmail,
  createPasswordResetToken,
  validatePasswordResetToken,
  usePasswordResetToken,
  updateUserPassword,
  addFavoriteCity,
  removeFavoriteCity,
  getUserFavoriteCities,
  query,
  run
};
