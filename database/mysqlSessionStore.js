const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

let sessionStore = null;

const createMySQLSessionStore = async () => {
  if (sessionStore) return sessionStore;

  try {
    // Read SSL certificate for Aiven
    const sslCA = fs.readFileSync(path.join(__dirname, 'ca-certificate.pem'));
    
    // First ensure the sessions table exists
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.NODE_ENV === 'production' ? { 
        ca: sslCA,
        rejectUnauthorized: true
      } : false
    });

    // Create sessions table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
        expires INT(11) UNSIGNED NOT NULL,
        data MEDIUMTEXT COLLATE utf8mb4_bin,
        PRIMARY KEY (session_id)
      )
    `);
    
    await connection.end();
    console.log('Sessions table ensured to exist');
    
    const options = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.NODE_ENV === 'production' ? { 
        ca: sslCA,
        rejectUnauthorized: true
      } : false,
      createDatabaseTable: false, // Table already exists
      schema: {
        tableName: 'sessions',
        columnNames: {
          session_id: 'session_id',
          expires: 'expires',
          data: 'data'
        }
      }
    };

    sessionStore = new MySQLStore(options);
    console.log('MySQL session store created successfully');
    return sessionStore;
  } catch (error) {
    console.error('Error creating MySQL session store:', error);
    return null;
  }
};

module.exports = { createMySQLSessionStore };
