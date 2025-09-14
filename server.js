import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import Razorpay from 'razorpay';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const TMDB_KEY = process.env.TMDB_API_KEY || 'efa4bba6280252ded1c68c4884f56085';
const TMDB_BASE = 'https://api.themoviedb.org/3';

// OTP Configuration
const OTP_EXPIRY_MINUTES = 10;
const OTP_LENGTH = 6;

// Payment Gateway Configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_TEST_KEY';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'YOUR_TEST_SECRET';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// Email Configuration (using Gmail SMTP for demo)
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// For development, we'll also log OTPs to console
const logOTP = (email, otp) => {
  console.log(`\n🔐 OTP for ${email}: ${otp}\n`);
};

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use(
  '/api/',
  rateLimit({ windowMs: 60 * 1000, max: 180 })
);

// Static frontend serving
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(__dirname));
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'movie_website.html'));
});
// TMDB proxy helpers
function buildTmdbUrl(path, params = {}) {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set('api_key', TMDB_KEY);
  if (!url.searchParams.has('language')) url.searchParams.set('language', 'en-US');
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(k, v);
  });
  return url.toString();
}

app.get('/api/tmdb/search/movie', async (req, res) => {
  try {
    const { query, page = '1' } = req.query;
    const url = buildTmdbUrl('/search/movie', { query, page });
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch {
    res.status(500).json({ error: 'tmdb search failed' });
  }
});

app.get('/api/tmdb/movie/popular', async (req, res) => {
  try {
    const { page = '1' } = req.query;
    const url = buildTmdbUrl('/movie/popular', { page });
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch {
    res.status(500).json({ error: 'tmdb popular failed' });
  }
});

app.get('/api/tmdb/trending/movie/week', async (req, res) => {
  try {
    const url = buildTmdbUrl('/trending/movie/week');
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch {
    res.status(500).json({ error: 'tmdb trending failed' });
  }
});

app.get('/api/tmdb/movie/:id', async (req, res) => {
  try {
    const url = buildTmdbUrl(`/movie/${req.params.id}`);
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch {
    res.status(500).json({ error: 'tmdb movie failed' });
  }
});

let db;
async function initDb() {
  db = await open({ filename: './auth.db', driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      is_verified BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      phone TEXT,
      otp TEXT NOT NULL,
      type TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_type TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      end_date DATETIME NOT NULL,
      payment_id TEXT,
      amount INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'INR',
      status TEXT NOT NULL,
      plan_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);
}

// Helpers
function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

// OTP Helpers
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isOTPExpired(expiresAt) {
  return new Date() > new Date(expiresAt);
}

async function sendOTPEmail(email, otp) {
  // Log OTP to console for development
  logOTP(email, otp);
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'your-email@gmail.com',
    to: email,
    subject: 'MovieFlix - Your OTP Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e50914;">MovieFlix</h2>
        <h3>Your OTP Code</h3>
        <p>Your verification code is:</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #e50914;">
          ${otp}
        </div>
        <p>This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      </div>
    `
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    // In development, we still return true since OTP is logged to console
    return process.env.NODE_ENV === 'development';
  }
}

// Subscription Helpers
function calculateEndDate(planType) {
  const now = new Date();
  switch (planType) {
    case 'monthly':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    case 'yearly':
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
}

function getPlanAmount(planType) {
  switch (planType) {
    case 'monthly':
      return 299; // ₹299
    case 'yearly':
      return 2999; // ₹2999
    default:
      return 299;
  }
}

// Payment Helpers
async function createRazorpayOrder(amount, currency = 'INR') {
  const options = {
    amount: amount * 100, // Razorpay expects amount in paise
    currency: currency,
    receipt: 'receipt_' + Date.now(),
  };

  try {
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    throw error;
  }
}

function verifyPaymentSignature(orderId, paymentId, signature) {
  const text = orderId + '|' + paymentId;
  const generated_signature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(text)
    .digest('hex');
  
  return generated_signature === signature;
}

// OTP Authentication Routes
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email, phone, type = 'email' } = req.body;
    
    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone number required' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP in database
    await db.run(
      'INSERT INTO otps (email, phone, otp, type, expires_at) VALUES (?, ?, ?, ?, ?)',
      [email, phone, otp, type, expiresAt]
    );

    // Send OTP via email
    if (email) {
      const emailSent = await sendOTPEmail(email, otp);
      if (!emailSent) {
        return res.status(500).json({ error: 'Failed to send OTP email' });
      }
    }

    // For demo purposes, also return OTP in response (remove in production)
    res.json({ 
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, phone, otp, type = 'email' } = req.body;
    
    if (!otp) {
      return res.status(400).json({ error: 'OTP required' });
    }
     if (!email) {
      return res.status(400).json({ error: 'Email is required for OTP verification' });
    }


    // Find the most recent OTP for this email/phone
    const otpRecord = await db.get(
      'SELECT * FROM otps WHERE (email = ? OR phone = ?) AND type = ? ORDER BY created_at DESC LIMIT 1',
      [email, phone, type]
    );

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (isOTPExpired(otpRecord.expires_at)) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // OTP is valid, now find or create the user
    let user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      // User does not exist, create a new one
      // For OTP-based auth, we can use a dummy password hash
      const dummyHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
      const result = await db.run(
        'INSERT INTO users (email, password_hash, is_verified) VALUES (?, ?, 1)',
        [email, dummyHash]
      );
      user = { id: result.lastID, email };
    } else {
      // User exists, ensure they are marked as verified
      await db.run('UPDATE users SET is_verified = 1 WHERE id = ?', [user.id]);
    }

    // Delete the used OTP
    await db.run('DELETE FROM otps WHERE id = ?', [otpRecord.id]);

    // Generate a token and send it back
    const token = generateToken(user);
    res.json({
      message: 'OTP verified successfully',
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, phone } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    const hash = await bcrypt.hash(password, 10);
    try {
      const result = await db.run(
        'INSERT INTO users (email, password_hash, phone) VALUES (?, ?, ?)', 
        [email, hash, phone]
      );
      const user = { id: result.lastID, email, phone };
      const token = generateToken(user);
      res.json({ token, user });
    } catch (e) {
      if (e && e.message && e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered' });
      throw e;
    }
  } catch (e) {
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: 'Signin failed' });
  }
});

app.get('/api/auth/profile', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await db.get('SELECT id, email, created_at FROM users WHERE id = ?', [payload.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Auth helper middleware
function authenticate(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Update profile (email and/or password)
app.put('/api/auth/profile', authenticate, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email && !password) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    // Fetch current user
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prepare updates
    let newEmail = user.email;
    let newPasswordHash = user.password_hash;

    if (email && email !== user.email) {
      // Check for uniqueness
      const exists = await db.get('SELECT id FROM users WHERE email = ?', [email]);
      if (exists && exists.id !== user.id) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      newEmail = email;
    }

    if (password) {
      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      newPasswordHash = await bcrypt.hash(password, 10);
    }

    await db.run(
      'UPDATE users SET email = ?, password_hash = ? WHERE id = ?',
      [newEmail, newPasswordHash, user.id]
    );

    const updated = await db.get('SELECT id, email, created_at FROM users WHERE id = ?', [user.id]);
    const token = generateToken(updated);
    return res.json({ message: 'Profile updated', user: updated, token });
  } catch (e) {
    console.error('Profile update failed:', e);
    return res.status(500).json({ error: 'Profile update failed' });
  }
});

// ========== SUBSCRIPTION ROUTES ==========

// Get available subscription plans
app.get('/api/subscriptions/plans', (req, res) => {
  const plans = [
    {
      id: 'monthly',
      name: 'Monthly Plan',
      price: 299,
      currency: 'INR',
      duration: '30 days',
      features: ['Unlimited movies', 'HD quality', 'Watch on any device']
    },
    {
      id: 'yearly',
      name: 'Yearly Plan',
      price: 2999,
      currency: 'INR',
      duration: '365 days',
      features: ['Unlimited movies', '4K quality', 'Watch on any device', '2 months free']
    }
  ];
  res.json({ plans });
});

// Get user's current subscription
app.get('/api/subscriptions/current', authenticate, async (req, res) => {
  try {
    const subscription = await db.get(
      'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active" AND end_date > datetime("now") ORDER BY end_date DESC LIMIT 1',
      [req.user.id]
    );

    if (!subscription) {
      return res.json({ subscription: null });
    }

    res.json({ subscription });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// Create payment order
app.post('/api/payments/create-order', authenticate, async (req, res) => {
  try {
    const { planType } = req.body;
    
    if (!planType || !['monthly', 'yearly'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    const amount = getPlanAmount(planType);
    
    // Create Razorpay order
    const order = await createRazorpayOrder(amount);
    
    // Store payment record
    await db.run(
      'INSERT INTO payments (user_id, razorpay_order_id, amount, status, plan_type) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, order.id, amount, 'pending', planType]
    );

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Verify payment and activate subscription
app.post('/api/payments/verify', authenticate, async (req, res) => {
  try {
    const { orderId, paymentId, signature, planType } = req.body;
    
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    // Verify payment signature
    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Update payment status
    await db.run(
      'UPDATE payments SET razorpay_payment_id = ?, status = "completed" WHERE razorpay_order_id = ?',
      [paymentId, orderId]
    );

    // Get payment details
    const payment = await db.get(
      'SELECT * FROM payments WHERE razorpay_order_id = ?',
      [orderId]
    );

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Deactivate any existing active subscription
    await db.run(
      'UPDATE subscriptions SET status = "cancelled" WHERE user_id = ? AND status = "active"',
      [req.user.id]
    );

    // Create new subscription
    const endDate = calculateEndDate(planType);
    const result = await db.run(
      'INSERT INTO subscriptions (user_id, plan_type, end_date, payment_id, amount) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, planType, endDate, paymentId, payment.amount]
    );

    const subscription = await db.get(
      'SELECT * FROM subscriptions WHERE id = ?',
      [result.lastID]
    );

    res.json({
      message: 'Payment verified and subscription activated',
      subscription
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Get payment history
app.get('/api/payments/history', authenticate, async (req, res) => {
  try {
    const payments = await db.all(
      'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ payments });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

// Subscription middleware to check if user has active subscription
function requireSubscription(req, res, next) {
  // For now, allow all users (you can modify this based on your requirements)
  next();
}

// Start
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Auth server running on http://localhost:${PORT}`);
  });
});


