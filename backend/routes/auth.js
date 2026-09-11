import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { sendOtpEmail } from '../services/emailService.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'SASCMA_STERS_VNSGU_JWT_SECRET_2026';
const inMemoryOtps = new Map();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, full_name, college_name, phone } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Username, email and password are required' });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists in profiles
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, username, email')
      .or(`email.eq.${cleanEmail},username.eq.${cleanUsername}`)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username or Email already registered' });
    }

    // Insert user into Supabase profiles
    const { data: newUser, error: insertError } = await supabase
      .from('profiles')
      .insert({
        username: cleanUsername,
        email: cleanEmail,
        password: password, // preserved matching legacy auth schema
        phone: phone || '',
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ success: false, message: insertError.message });
    }

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, email: newUser.email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        phone: newUser.phone,
        college_name: college_name || 'VNSGU Affiliated'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username/email and password required' });
    }

    const cleanInput = username.trim();
    const cleanLower = cleanInput.toLowerCase();

    // Query profiles in Supabase
    let query = supabase.from('profiles').select('*');
    if (cleanInput.includes('@')) {
      query = query.ilike('email', cleanLower);
    } else {
      query = query.ilike('username', cleanInput);
    }

    const { data: profiles, error } = await query.limit(1);

    if (error || !profiles || profiles.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    const user = profiles[0];

    // Password verification (plain text or bcrypt hash fallback)
    const isPasswordValid = user.password === password || (user.password_hash && await bcrypt.compare(password, user.password_hash));
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Incorrect password entered.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.username === 'sascma_admin' ? 'admin' : 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone || '',
        role: user.username === 'sascma_admin' ? 'admin' : 'user'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    inMemoryOtps.set(email.trim().toLowerCase(), {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    await sendOtpEmail(email.trim().toLowerCase(), otp, purpose || 'Verification');
    res.json({ success: true, message: 'OTP sent to your email successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send OTP: ' + err.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });

    const record = inMemoryOtps.get(email.trim().toLowerCase());
    if (!record) return res.status(400).json({ success: false, message: 'No OTP requested for this email' });
    if (Date.now() > record.expiresAt) {
      inMemoryOtps.delete(email.trim().toLowerCase());
      return res.status(400).json({ success: false, message: 'OTP has expired. Request a new one.' });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP code.' });
    }

    inMemoryOtps.delete(email.trim().toLowerCase());
    res.json({ success: true, message: 'OTP verified successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/update-profile
router.post('/update-profile', requireAuth, async (req, res) => {
  try {
    const { phone, college_name } = req.body;
    const { error } = await supabase
      .from('profiles')
      .update({ phone: phone || '' })
      .eq('id', req.user.id);

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/update-password
router.post('/update-password', requireAuth, async (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password) return res.status(400).json({ success: false, message: 'New password is required' });

    const { error } = await supabase
      .from('profiles')
      .update({ password: new_password })
      .eq('id', req.user.id);

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
