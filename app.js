require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const bcrypt = require('bcryptjs');
const expressLayouts = require('express-ejs-layouts');
const { createUser, findUserByUsername } = require('./database/db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');

// Session configuration with SQLite store for persistence
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: './database',
    table: 'sessions'
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key', // In production, use environment variable
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

// Custom middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Routes
app.get('/', (req, res) => {
  res.render('index', { 
    userId: req.session.userId || null,
    username: req.session.username || null
  });
});

app.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', { 
    error: null,
    userId: null,
    username: null
  });
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await findUserByUsername(username);
    
    if (!user) {
      return res.render('login', { 
        error: 'Invalid username or password',
        userId: null,
        username: null
      });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.render('login', { 
        error: 'Invalid username or password',
        userId: null,
        username: null
      });
    }
    
    req.session.userId = user.id;
    req.session.username = user.username;
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('error', { 
      message: 'An error occurred during login',
      userId: null,
      username: null
    });
  }
});

app.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('register', { 
    error: null,
    userId: null,
    username: null
  });
});

app.post('/register', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;
    
    if (password !== confirmPassword) {
      return res.render('register', { 
        error: 'Passwords do not match',
        userId: null,
        username: null
      });
    }
    
    if (password.length < 6) {
      return res.render('register', { 
        error: 'Password must be at least 6 characters long',
        userId: null,
        username: null
      });
    }
    
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      return res.render('register', { 
        error: 'Username already exists',
        userId: null,
        username: null
      });
    }
    
    await createUser(username, password);
    res.redirect('/login');
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).render('error', { 
      message: 'An error occurred during registration',
      userId: null,
      username: null
    });
  }
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { 
    username: req.session.username,
    userId: req.session.userId 
  });
});

// API Routes
app.use('/api', apiRoutes);

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Error logging out');
    }
    res.redirect('/');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found' });
});

// Start server locally, export for Vercel serverless
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
