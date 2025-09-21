const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database connection - supports both local PostgreSQL and Supabase
let pool;

const initializePostgres = () => {
  if (process.env.DATABASE_URL) {
    // Use connection string (Supabase or other PostgreSQL)
    const dbUrl = process.env.DATABASE_URL.trim();
    console.log('Raw DATABASE_URL length:', dbUrl.length);
    console.log('DATABASE_URL starts with:', dbUrl.substring(0, 30));
    console.log('DATABASE_URL ends with:', dbUrl.substring(dbUrl.length - 30));
    
    // Validate URL format
    if (!dbUrl.startsWith('postgresql://')) {
      throw new Error('Invalid DATABASE_URL format. Must start with postgresql://');
    }
    
    pool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  } else if (process.env.SUPABASE_URL) {
    // Use Supabase environment variables to construct connection
    const supabaseUrl = new URL(process.env.SUPABASE_URL);
    const projectId = supabaseUrl.hostname.split('.')[0];
    
    // Construct PostgreSQL connection string from Supabase variables
    const connectionString = `postgresql://postgres.${projectId}:${process.env.SUPABASE_DB_PASSWORD || 'Ordinateur93*'}@aws-1-eu-west-3.pooler.supabase.com:6543/postgres`;
    
    console.log('Connecting to PostgreSQL via Supabase URL');
    pool = new Pool({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false }
    });
  } else {
    // Use individual connection parameters
    pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'weather_app',
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
    });
  }

  console.log('Connected to PostgreSQL database.');
  initializeDatabase();
};

// Initialize database with tables
async function initializeDatabase() {
  try {
    console.log('Initializing PostgreSQL database...');
    // Test connection first
    await pool.query('SELECT NOW()');
    console.log('PostgreSQL connection test successful');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255) NOT NULL,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create favorite_cities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorite_cities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        city_name VARCHAR(255) NOT NULL,
        country_code VARCHAR(10),
        lat DECIMAL(10, 8) NOT NULL,
        lon DECIMAL(11, 8) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, lat, lon)
      )
    `);

    console.log('PostgreSQL tables initialized successfully.');
  } catch (error) {
    console.error('Error initializing PostgreSQL database:', error);
  }
}

// Helper function to run SQL queries
const query = async (text, params = []) => {
  try {
    const result = await pool.query(text, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Helper function to run SQL commands and return result info
const run = async (text, params = []) => {
  try {
    const result = await pool.query(text, params);
    return {
      id: result.rows[0]?.id,
      changes: result.rowCount,
      rows: result.rows
    };
  } catch (error) {
    console.error('Database run error:', error);
    throw error;
  }
};

// User related database operations
const createUser = async (username, password, email = null) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id, username, email',
    [username, hashedPassword, email]
  );
  return result.rows[0];
};

const findUserByUsername = async (username) => {
  const result = await query('SELECT * FROM users WHERE username = $1', [username]);
  return result[0];
};

const findUserByEmail = async (email) => {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result[0];
};

const updateUserResetToken = async (email, resetToken, expiresAt) => {
  const result = await run(
    'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
    [resetToken, expiresAt, email]
  );
  return result.changes > 0;
};

const findUserByResetToken = async (resetToken) => {
  const result = await query(
    'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
    [resetToken]
  );
  return result[0];
};

const updateUserPassword = async (userId, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const result = await run(
    'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
    [hashedPassword, userId]
  );
  return result.changes > 0;
};

// Favorite cities related database operations
const addFavoriteCity = async (userId, cityName, countryCode, lat, lon) => {
  const result = await pool.query(
    'INSERT INTO favorite_cities (user_id, city_name, country_code, lat, lon) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [userId, cityName, countryCode, lat, lon]
  );
  return result.rows[0].id;
};

const removeFavoriteCity = async (userId, cityId) => {
  const result = await run(
    'DELETE FROM favorite_cities WHERE id = $1 AND user_id = $2',
    [cityId, userId]
  );
  return result.changes > 0;
};

const getUserFavoriteCities = async (userId) => {
  return await query(
    'SELECT id, city_name, country_code, lat, lon FROM favorite_cities WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
};

// Initialize the connection
if (process.env.DATABASE_URL || process.env.DB_PASSWORD || process.env.SUPABASE_URL) {
  initializePostgres();
}

module.exports = {
  pool,
  query,
  run,
  createUser,
  findUserByUsername,
  findUserByEmail,
  updateUserResetToken,
  findUserByResetToken,
  updateUserPassword,
  addFavoriteCity,
  removeFavoriteCity,
  getUserFavoriteCities
};
