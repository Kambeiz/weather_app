// Database abstraction layer - automatically chooses between SQLite and PostgreSQL
// based on environment variables

let db;

if (process.env.DATABASE_URL || process.env.DB_PASSWORD) {
  // Use PostgreSQL (Supabase or local PostgreSQL)
  console.log('Using PostgreSQL database');
  db = require('./postgresDb');
} else {
  // Use SQLite (local development)
  console.log('Using SQLite database');
  db = require('./db');
}

module.exports = db;
