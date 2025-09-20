require('dotenv').config();
const express = require('express');
const session = require('express-session');
// const SQLiteStore = require('connect-sqlite3')(session); // Disabled for Vercel serverless
const path = require('path');
const bcrypt = require('bcryptjs');
const expressLayouts = require('express-ejs-layouts');
// Switch to memory database for Vercel serverless compatibility
const { createUser, findUserByUsername, findUserByEmail, createPasswordResetToken, validatePasswordResetToken, usePasswordResetToken, updateUserPassword, addFavoriteCity, removeFavoriteCity, getUserFavoriteCities } = require('./database/memoryDb');
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

// Session configuration - memory store for Vercel serverless
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true
  }
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
    username: null,
    query: req.query
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
    console.log('Registration attempt:', req.body.username, 'email:', req.body.email);
    const { username, email, password, confirmPassword } = req.body;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      console.log('Invalid email format:', email);
      return res.render('register', { 
        error: 'Please enter a valid email address',
        userId: null,
        username: null
      });
    }
    
    if (password !== confirmPassword) {
      console.log('Password mismatch for user:', username);
      return res.render('register', { 
        error: 'Passwords do not match',
        userId: null,
        username: null
      });
    }
    
    if (password.length < 6) {
      console.log('Password too short for user:', username);
      return res.render('register', { 
        error: 'Password must be at least 6 characters long',
        userId: null,
        username: null
      });
    }
    
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      console.log('User already exists:', username);
      return res.render('register', { 
        error: 'Username already exists',
        userId: null,
        username: null
      });
    }
    
    console.log('Creating new user:', username, 'with email:', email);
    const newUser = await createUser(username, password, email);
    console.log('User created successfully:', newUser);
    res.redirect('/login?registered=true');
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).render('error', { 
      message: 'An error occurred during registration: ' + error.message,
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

// Forgot Password Routes
app.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { 
    error: null,
    success: null,
    userId: null,
    username: null
  });
});

app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.render('forgot-password', { 
        error: 'Please enter a valid email address',
        success: null,
        userId: null,
        username: null
      });
    }
    
    const user = await findUserByEmail(email);
    if (!user) {
      // For security, don't reveal if email exists or not
      return res.render('forgot-password', { 
        error: null,
        success: 'If an account with that email exists, we\'ve sent password reset instructions.',
        userId: null,
        username: null
      });
    }
    
    const resetToken = await createPasswordResetToken(email);
    
    // In a real app, you would send an email here
    // For demo purposes, we'll show the reset link
    console.log(`Password reset link: http://localhost:3000/reset-password?token=${resetToken}`);
    
    res.render('forgot-password', { 
      error: null,
      success: `Password reset instructions sent! For demo purposes, check the console for the reset link.`,
      userId: null,
      username: null
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.render('forgot-password', { 
      error: 'An error occurred. Please try again.',
      success: null,
      userId: null,
      username: null
    });
  }
});

app.get('/reset-password', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.redirect('/forgot-password');
    }
    
    const resetToken = await validatePasswordResetToken(token);
    if (!resetToken) {
      return res.render('forgot-password', { 
        error: 'Invalid or expired reset token. Please request a new password reset.',
        success: null,
        userId: null,
        username: null
      });
    }
    
    res.render('reset-password', { 
      error: null,
      token: token,
      userId: null,
      username: null
    });
  } catch (error) {
    console.error('Reset password page error:', error);
    res.redirect('/forgot-password');
  }
});

app.post('/reset-password', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;
    
    if (password !== confirmPassword) {
      return res.render('reset-password', { 
        error: 'Passwords do not match',
        token: token,
        userId: null,
        username: null
      });
    }
    
    if (password.length < 6) {
      return res.render('reset-password', { 
        error: 'Password must be at least 6 characters long',
        token: token,
        userId: null,
        username: null
      });
    }
    
    const resetToken = await validatePasswordResetToken(token);
    if (!resetToken) {
      return res.render('forgot-password', { 
        error: 'Invalid or expired reset token. Please request a new password reset.',
        success: null,
        userId: null,
        username: null
      });
    }
    
    await updateUserPassword(resetToken.email, password);
    await usePasswordResetToken(token);
    
    res.redirect('/login?reset=true');
  } catch (error) {
    console.error('Reset password error:', error);
    res.render('reset-password', { 
      error: 'An error occurred. Please try again.',
      token: req.body.token,
      userId: null,
      username: null
    });
  }
});

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
