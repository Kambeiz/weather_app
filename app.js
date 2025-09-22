require('dotenv').config();
const express = require('express');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const bcrypt = require('bcryptjs');
const path = require('path');
const { createMySQLSessionStore } = require('./database/mysqlSessionStore');

// Initialize session store asynchronously
let sessionStoreReady = false;
let sessionStore = null;

async function initializeSessionStore() {
  if (process.env.NODE_ENV === 'production') {
    try {
      sessionStore = await createMySQLSessionStore();
      sessionStoreReady = true;
      console.log('Session store initialized successfully');
    } catch (error) {
      console.error('Failed to initialize session store:', error);
      sessionStoreReady = true; // Continue with memory store
    }
  } else {
    sessionStoreReady = true;
  }
}

if (process.env.NODE_ENV === 'production' && !process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD is required in production. Memory database is not allowed.');
}

console.log('DB_PASSWORD exists:', !!process.env.DB_PASSWORD);
console.log('NODE_ENV:', process.env.NODE_ENV);

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

// Session configuration function to be called after store initialization
function configureSession() {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    name: 'dweather.sid',
    cookie: { 
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      sameSite: 'lax'
    },
    // Use the initialized session store
    store: sessionStore
  }));
}

// Custom middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  console.log('Auth check - Session ID:', req.sessionID, 'User ID:', req.session?.userId);
  console.log('Cookie secure setting:', req.app.get('env') === 'production' ? 'true' : 'false');
  console.log('Request protocol:', req.protocol, 'Headers:', req.get('x-forwarded-proto'));
  if (!req.session?.userId) {
    console.log('No user ID in session, redirecting to login');
    return res.redirect('/login');
  }
  console.log('User authenticated:', req.session.username);
  next();
};

// Routes
app.get('/', (req, res) => {
  res.render('index', { 
    userId: req.session?.userId || null,
    username: req.session?.username || null
  });
});

app.get('/login', (req, res) => {
  if (req.session?.userId) {
    return res.redirect('/dashboard');
  }
  const successMessage = req.query.registered === 'true' ? 
    'Registration successful! Please log in with your credentials.' : null;
    
  res.render('login', { 
    error: null,
    success: successMessage,
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
    
    // Log in the user
    if (req.session) {
      req.session.userId = user.id;
      req.session.username = user.username;
      
      // Force session save before redirect
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          console.error('Session save error details:', {
            code: err.code,
            message: err.message,
            stack: err.stack
          });
          return res.status(500).render('login', { 
            error: 'Login failed due to session error. Please try again.',
            userId: null,
            username: null,
            query: req.query
          });
        } else {
          console.log('Session saved successfully');
        }
        console.log('User logged in successfully:', username, 'Session ID:', req.sessionID);
        console.log('Session data after login:', JSON.stringify(req.session, null, 2));
        res.redirect('/dashboard');
      });
    } else {
      console.error('Session not available during login');
      console.error('Session object:', req.session);
      console.error('Session ID:', req.sessionID);
      res.status(500).render('login', { 
        error: 'Session initialization failed. Please try again.',
        userId: null,
        username: null,
        query: req.query
      });
    }
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
  if (req.session?.userId) {
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
    const { username, email, password, confirmPassword } = req.body;
    console.log('Registration attempt:', { username, email });
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Password provided:', !!password);
    
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
    
    res.redirect('/login?registered=true');
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Registration error stack:', error.stack);
    console.error('Registration error details:', {
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState
    });
    res.status(500).render('register', { 
      error: 'Something went wrong during registration. Please try again.',
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
    
    // Hash the new password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Find user by email to get userId
    const user = await findUserByEmail(resetToken.email);
    if (!user) {
      return res.render('forgot-password', { 
        error: 'User not found. Please request a new password reset.',
        success: null,
        userId: null,
        username: null
      });
    }
    
    await updateUserPassword(user.id, hashedPassword);
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
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).send('Error logging out');
      }
      res.redirect('/');
    });
  } else {
    res.redirect('/');
  }
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

// Initialize app asynchronously
async function initializeApp() {
  try {
    // Initialize session store first
    await initializeSessionStore();
    
    // Configure session middleware after store is ready
    configureSession();
    
    console.log('App initialization complete');
    
    // Start server locally
    if (process.env.NODE_ENV !== 'production') {
      app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
      });
    }
  } catch (error) {
    console.error('Failed to initialize app:', error);
    process.exit(1);
  }
}

// Initialize the app
initializeApp();

module.exports = app;
