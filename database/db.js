const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Connect to SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'weather.db'), (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initializeDatabase();
  }
});

// Initialize database with tables
function initializeDatabase() {
  // Create users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create cities table
  db.run(`CREATE TABLE IF NOT EXISTS favorite_cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    city_name TEXT NOT NULL,
    country_code TEXT,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id, lat, lon)
  )`);
}

// Helper function to run SQL queries with promises
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Helper function to run SQL commands with promises
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

// User related database operations
const createUser = async (username, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await run(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [username, hashedPassword]
  );
  return { id: result.id, username };
};

const findUserByUsername = async (username) => {
  const users = await query('SELECT * FROM users WHERE username = ?', [username]);
  return users[0];
};

// Favorite cities related database operations
const addFavoriteCity = async (userId, cityName, countryCode, lat, lon) => {
  const result = await run(
    'INSERT INTO favorite_cities (user_id, city_name, country_code, lat, lon) VALUES (?, ?, ?, ?, ?)',
    [userId, cityName, countryCode, lat, lon]
  );
  return result.id;
};

const removeFavoriteCity = async (userId, cityId) => {
  const result = await run(
    'DELETE FROM favorite_cities WHERE id = ? AND user_id = ?',
    [cityId, userId]
  );
  return result.changes > 0;
};

const getUserFavoriteCities = async (userId) => {
  return await query(
    'SELECT id, city_name, country_code, lat, lon FROM favorite_cities WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
};

module.exports = {
  db,
  query,
  run,
  createUser,
  findUserByUsername,
  addFavoriteCity,
  removeFavoriteCity,
  getUserFavoriteCities
};
