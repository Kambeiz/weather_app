const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

let sessionStore = null;

const createMySQLSessionStore = () => {
  if (sessionStore) return sessionStore;

  try {
    // Read SSL certificate for Aiven
    const sslCA = fs.readFileSync(path.join(__dirname, 'ca-certificate.pem'));
    
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
      createDatabaseTable: true,
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
