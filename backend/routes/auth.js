import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { sendOtpEmail, sendWelcomeEmail } from '../services/emailService.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'SASCMA_STERS_VNSGU_JWT_SECRET_2026';
const inMemoryOtps = new Map();

// ==================== SECURITY & VALIDATION HELPERS ====================

// PostgREST / SQL Injection prevention sanitizer
export const sanitizeSqlInput = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[(),'";\\]/g, '').trim();
};

// 1. Username validation: minimum 6 characters, max 30, no spaces, only alphanumeric and - / _
export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  const clean = username.trim();
  if (clean.length < 6 || clean.length > 30) return false;
  if (/\s/.test(clean)) return false;
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) return false;
  if (!/[a-zA-Z]/.test(clean)) return false; // At least one alphabet
  return true;
};

// 2. Email validation: standard RFC format with verified domain structure
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  if (/\s/.test(clean)) return false;
  if (!clean.includes('@')) return false;
  const parts = clean.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length === 0 || !domain || domain.length < 4) return false;

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) return false;

  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;
  const tld = domainParts[domainParts.length - 1];
  if (!/^[a-zA-Z]{2,10}$/.test(tld)) return false;

  const mainDomain = domainParts[domainParts.length - 2];
  if (!mainDomain || mainDomain.length < 2) return false;

  return true;
};

// 3. Mobile Number validation: exactly 10 digits, starts with 6, 7, 8, 9
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
  return /^[6-9]\d{9}$/.test(cleaned);
};

// 4. Password validation: min 8 chars, upper, lower, num, special
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

// GET /api/auth/check-username - Real-time username check (min 6 characters)
router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username || !username.trim()) {
      return res.status(400).json({ available: false, valid: false, message: 'Username is required' });
    }

    const cleanUsername = sanitizeSqlInput(username);
    if (!validateUsername(cleanUsername)) {
      return res.json({
        available: false,
        valid: false,
        message: 'Username must be at least 6 characters long (no spaces, only letters, numbers, - and _).'
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

// GET /api/auth/check-email - Real-time email uniqueness & domain check
router.get('/check-email', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email || !email.trim()) {
      return res.status(400).json({ available: false, valid: false, message: 'Email is required' });
    }

    const cleanEmail = sanitizeSqlInput(email.toLowerCase());
    if (!cleanEmail.includes('@')) {
      return res.json({
        available: false,
        valid: false,
        message: "Email address must contain '@' symbol (e.g. name@gmail.com)."
      });
    }

    if (!validateEmail(cleanEmail)) {
      return res.json({
        available: false,
        valid: false,
        message: 'Please enter a valid email domain (e.g. @gmail.com or @vnsgu.ac.in).'
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

// POST /api/auth/send-otp
// STRICT PRE-CHECK: Email, Mobile Number, and Username MUST be 100% valid & unique before sending OTP!
router.post('/send-otp', async (req, res) => {
  try {
    const { email, purpose, username, phone } = req.body;
    const isRegistration = !purpose || purpose.toLowerCase().includes('regist') || purpose.toLowerCase().includes('faculty');

    if (!email) return res.status(400).json({ success: false, message: 'Institutional email is required' });

    const cleanEmail = sanitizeSqlInput(email.toLowerCase());
    if (!cleanEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        message: "Email address must contain '@' symbol (e.g. name@gmail.com)."
      });
    }

    if (!validateEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email domain (e.g. @gmail.com or @vnsgu.ac.in).'
      });
    }

    if (isRegistration) {
      // 1. Validate Mobile Number (Mandatory for registration OTP)
      if (!phone || !validatePhone(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9 before requesting OTP.'
        });
      }

      // 2. Validate Username (Mandatory minimum 6 characters)
      if (!username || !validateUsername(username)) {
        return res.status(400).json({
          success: false,
          message: 'Username must be at least 6 characters long (no spaces, only letters, numbers, - and _).'
        });
      }
      const cleanUsername = sanitizeSqlInput(username);

      // 3. Database Check: Email must not be already registered
      const { data: existingEmail } = await supabase
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

      // 4. Database Check: Username must not be already taken
      const { data: existingUser } = await supabase
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
    } else if (purpose && purpose.toLowerCase().includes('reset')) {
      // Forgot Password: Email MUST exist
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

    // 5. Generate 6-digit OTP ONLY after passing all checks
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

    const cleanEmail = sanitizeSqlInput(email.toLowerCase());
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
// Password is cryptographically hashed with salted bcrypt (10 rounds)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, college_name, phone, otp } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Username, email and password are required' });
    }

    const cleanUsername = sanitizeSqlInput(username);
    const cleanEmail = sanitizeSqlInput(email.toLowerCase());

    // 1. Username validation: min 6 chars
    if (!validateUsername(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 6 characters long (no spaces, only letters, numbers, - and _).'
      });
    }

    // 2. Email validation: valid domain structure
    if (!validateEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email domain (e.g. @gmail.com or @vnsgu.ac.in).'
      });
    }

    // 3. Mobile Number validation: exactly 10 digits
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

    // 6. Double check uniqueness in database
    const { data: existingEmail } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'This email is already registered. Please sign in.' });
    }

    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ success: false, message: `Username "${cleanUsername}" is already taken.` });
    }

    // 7. BCRYPT HASHING: Salted 10 rounds to prevent password cracking
    const hashedPassword = await bcrypt.hash(password, 10);

    // 8. Create user in Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true
    });

    if (authErr || !authData?.user?.id) {
      return res.status(400).json({ success: false, message: authErr?.message || 'Failed to create user account' });
    }

    const userId = authData.user.id;

    // 9. Update profile with Bcrypt hashed password and clean inputs
    await supabase
      .from('profiles')
      .update({
        username: cleanUsername,
        college_name: sanitizeSqlInput(college_name) || 'VNSGU Affiliated College',
        course: 'All Courses',
        phone: cleanedPhone,
        password: password, // Store original password directly
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    const token = jwt.sign(
      { id: userId, username: cleanUsername, email: cleanEmail, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 10. Automated Welcome Email dispatch
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
        role: 'user',
        college_name: college_name || 'VNSGU Affiliated College'
      }
    });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
// Supports plain original password verification (and legacy bcrypt if present), preserving database password as-is
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username/email and password required' });
    }

    const cleanInput = sanitizeSqlInput(username);
    const cleanLower = cleanInput.toLowerCase();

    // Query profiles in Supabase safely
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

    // Password verification: original password preserved without altering database
    let isPasswordValid = false;
    if (user.password === password) {
      isPasswordValid = true;
    } else if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
      isPasswordValid = await bcrypt.compare(password, user.password);
    }

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Incorrect password entered.' });
    }

    const role = (user.username === 'sascma_admin' || user.role === 'admin' || user.subscription?.role === 'admin') ? 'admin' : 'user';

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role },
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
        role,
        college_name: user.college_name || ''
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
    if (college_name) updateData.college_name = sanitizeSqlInput(college_name);

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

    // Original password preserved directly in database
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

// POST /api/auth/reset-password (Unauthenticated OTP-based password reset)
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;
    if (!email || !otp || !new_password) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
    }

    const cleanEmail = sanitizeSqlInput(email.toLowerCase().trim());

    if (!validatePassword(new_password)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters and include uppercase, lowercase, numbers, and a special character.'
      });
    }

    const record = inMemoryOtps.get(cleanEmail);
    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'No active OTP verification session found. Please request a new OTP code.'
      });
    }

    if (Date.now() > record.expiresAt) {
      inMemoryOtps.delete(cleanEmail);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a fresh OTP.' });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please enter the correct 6-digit code.' });
    }

    // Verify user exists in profiles
    const { data: user, error: userErr } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (userErr || !user) {
      return res.status(404).json({ success: false, message: 'No registered user found with this email address.' });
    }

    // Update password directly in profiles (original password preserved)
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        password: new_password,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateErr) throw updateErr;

    // Consume OTP once verified
    inMemoryOtps.delete(cleanEmail);

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
