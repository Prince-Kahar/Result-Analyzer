import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { sendOtpEmail, sendWelcomeEmail } from '../services/emailService.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'SASCMA_STERS_VNSGU_JWT_SECRET_2026';
const inMemoryOtps = new Map();

// ==================== VALIDATION HELPER FUNCTIONS ====================

export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  // No spaces, only alphanumeric and - or _ allowed, 3-30 chars
  return /^[a-zA-Z0-9_-]{3,30}$/.test(username);
};

export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const cleanEmail = email.trim();
  if (/\s/.test(cleanEmail)) return false;
  // RFC standard email pattern with proper domain and min 2-letter TLD
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(cleanEmail)) return false;
  const parts = cleanEmail.split('@');
  if (parts.length !== 2) return false;
  const domainParts = parts[1].split('.');
  if (domainParts.length < 2) return false;
  const tld = domainParts[domainParts.length - 1];
  return /^[a-zA-Z]{2,}$/.test(tld);
};

export const cleanPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }
  return cleaned.slice(-10);
};

export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = cleanPhone(phone);
  // Valid Indian mobile number: starts with 6, 7, 8, 9 and has exactly 10 digits
  return /^[6-9]\d{9}$/.test(cleaned);
};

export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  return hasUpper && hasLower && hasNumber && hasSpecial;
};

// ==================== REAL-TIME VALIDATION ENDPOINTS ====================

// GET /api/auth/check-username - Real-time username uniqueness check
router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username || !username.trim()) {
      return res.status(400).json({ available: false, valid: false, message: 'Username is required' });
    }

    const cleanUsername = username.trim();
    if (!validateUsername(cleanUsername)) {
      return res.json({
        available: false,
        valid: false,
        message: 'Username cannot contain spaces. Only letters, numbers, hyphens (-) and underscores (_) are allowed (3 to 30 characters).'
      });
    }

    const { data: existingUser, error } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (error) {
      console.error('[Check Username Error]', error);
      return res.status(500).json({ available: false, valid: true, message: 'Database check failed' });
    }

    if (existingUser) {
      return res.json({
        available: false,
        valid: true,
        message: `Username "${cleanUsername}" is already taken.`
      });
    }

    return res.json({
      available: true,
      valid: true,
      message: `Username "${cleanUsername}" is available.`
    });
  } catch (err) {
    res.status(500).json({ available: false, message: err.message });
  }
});

// GET /api/auth/check-email - Real-time email uniqueness & format check
router.get('/check-email', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email || !email.trim()) {
      return res.status(400).json({ available: false, valid: false, message: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!validateEmail(cleanEmail)) {
      return res.json({
        available: false,
        valid: false,
        message: 'Please enter a valid institutional email address (e.g. faculty@college.vnsgu.ac.in).'
      });
    }

    const { data: existingEmail, error } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (error) {
      console.error('[Check Email Error]', error);
      return res.status(500).json({ available: false, message: 'Database check failed' });
    }

    if (existingEmail) {
      return res.json({
        available: false,
        valid: true,
        message: 'This email is already registered in our database. Please sign in.'
      });
    }

    return res.json({
      available: true,
      valid: true,
      message: 'Email is valid & available.'
    });
  } catch (err) {
    res.status(500).json({ available: false, message: err.message });
  }
});

// GET /api/auth/check-phone - Real-time phone format check
router.get('/check-phone', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || !phone.trim()) {
      return res.status(400).json({ valid: false, message: 'Phone number is required' });
    }

    if (!validatePhone(phone)) {
      return res.json({
        valid: false,
        message: 'Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9.'
      });
    }

    return res.json({
      valid: true,
      message: 'Mobile number is valid.'
    });
  } catch (err) {
    res.status(500).json({ valid: false, message: err.message });
  }
});

// ==================== AUTHENTICATION & OTP ROUTES ====================

// POST /api/auth/send-otp - Strict check: OTP only generated/sent if email, username & phone pass validation
router.post('/send-otp', async (req, res) => {
  try {
    const { email, purpose, username, phone } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Institutional email is required' });

    const cleanEmail = email.trim().toLowerCase();
    if (!validateEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid institutional email address (e.g. faculty@college.vnsgu.ac.in).'
      });
    }

    const isRegistration = !purpose || purpose.toLowerCase().includes('regist') || purpose.toLowerCase().includes('faculty');

    // 1. STRICT REGISTRATION CHECKS:
    if (isRegistration) {
      // Validate mobile number if provided
      if (phone && !validatePhone(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.'
        });
      }

      // Check email in profiles - agar database me ho to OTP send NAHI hona chahiye
      const { data: existingEmail, error: emailErr } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'This email is already registered in our database. Please sign in or use Forgot Password.'
        });
      }

      // Check username in profiles if provided
      if (username && typeof username === 'string') {
        const cleanUsername = username.trim();
        if (!validateUsername(cleanUsername)) {
          return res.status(400).json({
            success: false,
            message: 'Username cannot contain spaces. Only letters, numbers, hyphens (-) and underscores (_) are allowed (3 to 30 characters).'
          });
        }

        const { data: existingUser, error: userErr } = await supabase
          .from('profiles')
          .select('id, username')
          .ilike('username', cleanUsername)
          .maybeSingle();

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: `Username "${cleanUsername}" is already taken in our database. Please choose another username.`
          });
        }
      }
    } else if (purpose && purpose.toLowerCase().includes('reset')) {
      // Forgot Password: Email MUST exist in database
      const { data: existingEmail } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (!existingEmail) {
        return res.status(404).json({
          success: false,
          message: 'No registered account found with this email address. Please register first.'
        });
      }
    }

    // 2. Generate 6-digit OTP (ONLY reached if all database & format checks pass)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    inMemoryOtps.set(cleanEmail, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    console.log(`[OTP Generated] For ${cleanEmail} (${purpose || 'Verification'}): ${otp}`);

    let emailSent = false;
    let emailError = null;
    try {
      await sendOtpEmail(cleanEmail, otp, purpose || 'Faculty Registration');
      emailSent = true;
    } catch (err) {
      console.warn(`[SMTP Warning] Failed to send email via SMTP: ${err.message}`);
      emailError = err.message;
    }

    res.json({
      success: true,
      message: emailSent
        ? 'Verification OTP sent to your email successfully.'
        : 'Verification OTP generated.',
      demoOtp: !emailSent ? otp : undefined
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate OTP: ' + err.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });

    const cleanEmail = email.trim().toLowerCase();
    const record = inMemoryOtps.get(cleanEmail);
    if (!record) return res.status(400).json({ success: false, message: 'No OTP requested for this email' });
    if (Date.now() > record.expiresAt) {
      inMemoryOtps.delete(cleanEmail);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP entered. Please check your email.' });
    }

    res.json({ success: true, message: 'OTP verified successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, college_name, phone, otp } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Username, email and password are required' });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Username validation: No spaces, only alphanumeric and - / _
    if (!validateUsername(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Username cannot contain spaces. Only letters, numbers, hyphens (-) and underscores (_) are allowed (3 to 30 characters).'
      });
    }

    // 2. Email validation: Valid format
    if (!validateEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid institutional email address (e.g. faculty@college.vnsgu.ac.in).'
      });
    }

    // 3. Mobile Number validation: Valid 10-digit number
    if (!phone || !validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.'
      });
    }
    const cleanedPhone = cleanPhone(phone);

    // 4. Password validation: Uppercase, lowercase, numeric, special char, min 8 chars
    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.'
      });
    }

    // 5. OTP verification
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'Email verification required. Please enter the OTP sent to your email.'
      });
    }

    const record = inMemoryOtps.get(cleanEmail);
    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found for this email. Please click "Generate OTP" first.'
      });
    }

    if (Date.now() > record.expiresAt) {
      inMemoryOtps.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a fresh OTP.'
      });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code. Please enter the correct 6-digit code.'
      });
    }

    // Consume OTP once verified
    inMemoryOtps.delete(cleanEmail);

    // 6. Double check if user already exists in profiles
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, username, email')
      .or(`email.ilike.${cleanEmail},username.ilike.${cleanUsername}`)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username or Email already registered. Please sign in.' });
    }

    // 7. Create user in Supabase Auth (triggers profile creation)
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true
    });

    if (authErr || !authData?.user?.id) {
      return res.status(400).json({ success: false, message: authErr?.message || 'Failed to create user account' });
    }

    const userId = authData.user.id;

    // 8. Update profile with custom faculty details including verified phone
    await supabase
      .from('profiles')
      .update({
        username: cleanUsername,
        college_name: college_name || 'VNSGU Affiliated College',
        course: 'All Courses',
        phone: cleanedPhone,
        password: password,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    const token = jwt.sign(
      { id: userId, username: cleanUsername, email: cleanEmail, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 9. Automated Welcome Email dispatch
    sendWelcomeEmail(cleanEmail, cleanUsername, college_name || 'VNSGU Affiliated College')
      .then(() => console.log(`[Welcome Email Sent] To ${cleanEmail}`))
      .catch((e) => console.warn(`[Welcome Email Error] ${e.message}`));

    res.json({
      success: true,
      message: 'Registration successful! Welcome to VNSGU Result Analyzer.',
      token,
      user: {
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        phone: cleanedPhone,
        college_name: college_name || 'VNSGU Affiliated College'
      }
    });
  } catch (err) {
    console.error('Registration Error:', err);
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

// POST /api/auth/update-profile
router.post('/update-profile', requireAuth, async (req, res) => {
  try {
    const { phone, college_name } = req.body;
    const updateData = {};
    if (phone) {
      if (!validatePhone(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.'
        });
      }
      updateData.phone = cleanPhone(phone);
    }
    if (college_name) updateData.college_name = college_name;

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
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

    if (!validatePassword(new_password)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters and include uppercase, lowercase, numbers, and a special character.'
      });
    }

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
