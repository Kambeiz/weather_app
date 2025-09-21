const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Database connection pool
let pool;

const initializeMySQL = async () => {
  try {
    // Read SSL certificate for Aiven
    const sslCA = fs.readFileSync(path.join(__dirname, 'ca-certificate.pem'));
    
    // Create connection pool with timeout and retry settings
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'defaultdb',
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true,
      ssl: process.env.NODE_ENV === 'production' ? { 
        ca: sslCA,
        rejectUnauthorized: true
      } : false
    });

    console.log('Connected to MySQL database.');
    await initializeDatabase();
  } catch (error) {
    console.error('Error connecting to MySQL:', error);
    throw error;
  }
};

// Initialize database with tables
async function initializeDatabase() {
  try {
    console.log('Initializing MySQL database...');
    
    // Test connection
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('MySQL connection test successful');
    
    // Create users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create password_reset_tokens table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create favorite_cities table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS favorite_cities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        city_name VARCHAR(255) NOT NULL,
        country VARCHAR(255),
        lat DECIMAL(10, 8),
        lon DECIMAL(11, 8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_city (user_id, city_name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('MySQL database initialized successfully');
  } catch (error) {
    console.error('Error initializing MySQL database:', error);
    throw error;
  }
}

// Generic query function
async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Generic run function for INSERT/UPDATE/DELETE
async function run(sql, params = []) {
  try {
    const [result] = await pool.execute(sql, params);
    return result;
  } catch (error) {
    console.error('Database run error:', error);
    throw error;
  }
}

// User management functions
async function createUser(username, email, hashedPassword) {
  try {
    const result = await run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
    return { id: result.insertId, username, email };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('Username or email already exists');
    }
    throw error;
  }
}

async function findUserByUsername(username) {
  const users = await query('SELECT * FROM users WHERE username = ?', [username]);
  return users[0] || null;
}

async function findUserByEmail(email) {
  const users = await query('SELECT * FROM users WHERE email = ?', [email]);
  return users[0] || null;
}

async function updateUserPassword(userId, hashedPassword) {
  await run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
}

// Password reset functions
async function createPasswordResetToken(userId, token, expiresAt) {
  await run(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt]
  );
}

async function validatePasswordResetToken(token) {
  const tokens = await query(
    'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW() AND used = FALSE',
    [token]
  );
  return tokens[0] || null;
}

async function usePasswordResetToken(token) {
  await run('UPDATE password_reset_tokens SET used = TRUE WHERE token = ?', [token]);
}

// Favorite cities functions
async function addFavoriteCity(userId, cityName, country = null, lat = null, lon = null) {
  try {
    await run(
      'INSERT INTO favorite_cities (user_id, city_name, country, lat, lon) VALUES (?, ?, ?, ?, ?)',
      [userId, cityName, country, lat, lon]
    );
    return true;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return false; // City already in favorites
    }
    throw error;
  }
}

async function removeFavoriteCity(userId, cityName) {
  const result = await run(
    'DELETE FROM favorite_cities WHERE user_id = ? AND city_name = ?',
    [userId, cityName]
  );
  return result.affectedRows > 0;
}

async function getUserFavoriteCities(userId) {
  return await query(
    'SELECT city_name, country, lat, lon FROM favorite_cities WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
}

// Initialize MySQL if environment variables are present
if (process.env.DB_PASSWORD || process.env.NODE_ENV === 'production') {
  initializeMySQL().catch(console.error);
}

module.exports = {
  query,
  run,
  createUser,
  findUserByUsername,
  findUserByEmail,
  updateUserPassword,
  createPasswordResetToken,
  validatePasswordResetToken,
  usePasswordResetToken,
  addFavoriteCity,
  removeFavoriteCity,
  getUserFavoriteCities
};
