require('dotenv').config();
const express = require('express');
const session = require('express-session');
// const SQLiteStore = require('connect-sqlite3')(session); // Disabled for Vercel serverless
const path = require('path');
const bcrypt = require('bcryptjs');
const expressLayouts = require('express-ejs-layouts');
const { createMySQLSessionStore } = require('./database/mysqlSessionStore');

console.log('DB_PASSWORD exists:', !!process.env.DB_PASSWORD);
console.log('NODE_ENV:', process.env.NODE_ENV);

if (process.env.NODE_ENV === 'production' && !process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD is required in production. Memory database is not allowed.');
}

const dbModule = process.env.DB_PASSWORD ? './database/mysqlDb' : './database/memoryDb';
console.log('Using database module:', dbModule);
const { createUser, findUserByUsername, findUserByEmail, createPasswordResetToken, validatePasswordResetToken, usePasswordResetToken, updateUserPassword, addFavoriteCity, removeFavoriteCity, getUserFavoriteCities } = require(dbModule);
const { sendPasswordResetEmail, sendWelcomeEmail } = require('./services/emailService');
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

// Session configuration - use secure settings for production
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  name: 'dweather.sid',
  cookie: { 
    secure: process.env.NODE_ENV === 'production' && process.env.VERCEL_URL ? true : false,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: 'lax'
  },
  // Add session store configuration for production
  store: process.env.NODE_ENV === 'production' ? createMySQLSessionStore() : undefined // Will use MemoryStore but suppress warning
}));

// Custom middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  console.log('Auth check - Session ID:', req.sessionID, 'User ID:', req.session.userId);
  if (!req.session.userId) {
    console.log('No user ID in session, redirecting to login');
    return res.redirect('/login');
  }
  console.log('User authenticated:', req.session.username);
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
    console.log('Login attempt for:', req.body.username);
    const { username, password } = req.body;
    const user = await findUserByUsername(username);
    
    if (!user) {
      console.log('User not found:', username);
      return res.render('login', { 
        error: 'Invalid username or password',
        userId: null,
        username: null,
        query: {}
      });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log('Password mismatch for user:', username);
      return res.render('login', { 
        error: 'Invalid username or password',
        userId: null,
        username: null,
        query: {}
      });
    }
    
    // Set session data
    req.session.userId = user.id;
    req.session.username = user.username;
    
    // Force session save before redirect
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).render('error', { 
          message: 'Login failed - session error',
          userId: null,
          username: null
        });
      }
      console.log('User logged in successfully:', username, 'Session ID:', req.sessionID);
      res.redirect('/dashboard');
    });
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
    
    // Check for existing username
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      console.log('Username already exists:', username);
      return res.render('register', { 
        error: 'Username already exists',
        userId: null,
        username: null
      });
    }
    // Check for existing email
    const existingEmailUser = await findUserByEmail(email);
    if (existingEmailUser) {
      console.log('Email already registered:', email);
      return res.render('register', { 
        error: 'Email already in use',
        userId: null,
        username: null
      });
    }
    
    console.log('Creating new user:', username, 'with email:', email);
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await createUser(username, email, hashedPassword);
    console.log('User created successfully:', newUser);
    
    // Send welcome email
    try {
      await sendWelcomeEmail(email, username);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }
    
    // Automatically log in the user after successful registration
    req.session.userId = newUser.id;
    req.session.username = newUser.username;
    console.log('User automatically logged in after registration:', newUser.username);
    
    res.redirect('/dashboard');
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
    
    // Send password reset email
    try {
      const emailResult = await sendPasswordResetEmail(email, resetToken);
      res.render('forgot-password', { 
        error: null,
        success: `Password reset instructions sent to ${email}. Check your email and server logs for the reset link.`,
        userId: null,
        username: null
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      res.render('forgot-password', { 
        error: null,
        success: `Password reset instructions would be sent to ${email}. Check the server logs for the reset link.`,
        userId: null,
        username: null
      });
    }
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
