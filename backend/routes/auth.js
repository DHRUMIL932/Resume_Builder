const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const protect = require('../middleware/auth');

// ── Rate limiters ─────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many accounts created from this IP. Try again in an hour.' },
});

// ── Helpers ───────────────────────────────────────────────────────
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    res.status(400).json({ success: false, message: first.msg });
    return false;
  }
  return true;
};

// ── POST /api/auth/register ───────────────────────────────────────
router.post(
  '/register',
  registerLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }).withMessage('Name too long'),
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const { name, email, password } = req.body;
      if (await User.findOne({ email })) {
        return res.status(400).json({ success: false, message: 'An account with that email already exists' });
      }
      const user = await User.create({ name, email, password });
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: { id: user._id, name: user.name, email: user.email, avatar: user.avatar || '', token: generateToken(user._id) },
      });
    } catch (error) {
      console.error('POST /register error:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }
);

// ── POST /api/auth/login ──────────────────────────────────────────
router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { id: user._id, name: user.name, email: user.email, avatar: user.avatar || '', token: generateToken(user._id) },
      });
    } catch (error) {
      console.error('POST /login error:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }
);

// ── GET /api/auth/me ──────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: { id: req.user._id, name: req.user.name, email: req.user.email, avatar: req.user.avatar || '', createdAt: req.user.createdAt },
    });
  } catch (error) {
    console.error('GET /me error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
