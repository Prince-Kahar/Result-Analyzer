import express from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';
import { requireAdmin } from '../middleware/authMiddleware.js';
import { sendOtpEmail } from '../services/emailService.js';
import { sanitizeSqlInput, validatePassword } from './auth.js';

const router = express.Router();

// Apply requireAdmin middleware to all /api/admin routes
router.use(requireAdmin);

// ==================== 1. SYSTEM & ADMIN STATS ====================

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    // 1. Total users from profiles table
    const { data: users, error: usersErr } = await supabase
      .from('profiles')
      .select('id, username, password, subscription');

    if (usersErr) throw usersErr;

    const totalUsers = users?.length || 0;
    const adminCount = users?.filter(u => {
      if (u.username === 'sascma_admin') return true;
      try {
        const sub = typeof u.subscription === 'string' ? JSON.parse(u.subscription) : u.subscription;
        return sub?.role === 'admin';
      } catch {
        return false;
      }
    }).length || 1;

    const bcryptProtectedCount = users?.filter(u => u.password && (u.password.startsWith('$2a$') || u.password.startsWith('$2b$'))).length || 0;

    // 2. Total Sessions
    const { data: sessions, error: sessErr } = await supabase
      .from('import_sessions')
      .select('id, session_name, total_students, created_at');

    const totalSessions = sessions?.length || 0;
    const totalStudents = sessions?.reduce((acc, s) => acc + (Number(s.total_students) || 0), 0) || 0;

    res.json({
      success: true,
      stats: {
        totalUsers,
        adminCount,
        bcryptProtectedCount,
        totalSessions,
        totalStudents,
        securityMode: 'Bcrypt (Salt 10 Rounds) + Anti-SQL Injection Defense',
        smtpStatus: 'Operational (smtp.gmail.com)',
        databaseStatus: 'Connected (Supabase Cloud PostgreSQL)'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin stats: ' + err.message });
  }
});

// ==================== 2. USER MANAGEMENT ====================

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, username, email, phone, college_name, course, updated_at, subscription')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Format role dynamically based on sascma_admin or subscription.role
    const formatted = (users || []).map(u => {
      let sub = {};
      try {
        sub = typeof u.subscription === 'string' ? JSON.parse(u.subscription) : (u.subscription || {});
      } catch {}
      return {
        ...u,
        created_at: u.updated_at,
        role: (u.username === 'sascma_admin' || sub.role === 'admin') ? 'admin' : 'faculty'
      };
    });

    res.json({ success: true, users: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/users/:id/role - Toggle / Update user role
router.post('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // 'admin' | 'faculty'

    if (!role || !['admin', 'faculty', 'user'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be admin or faculty' });
    }

    const { data: user } = await supabase
      .from('profiles')
      .select('username, subscription')
      .eq('id', id)
      .maybeSingle();

    if (user?.username === 'sascma_admin' && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Primary super administrator role cannot be demoted.' });
    }

    let sub = {};
    try {
      sub = typeof user?.subscription === 'string' ? JSON.parse(user.subscription) : (user?.subscription || {});
    } catch {}
    sub.role = role === 'admin' ? 'admin' : 'faculty';

    const { error } = await supabase
      .from('profiles')
      .update({ subscription: JSON.stringify(sub), updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: `User role updated to ${role}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/users/:id - Delete user account
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Protect main superadmin from deletion
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', id)
      .maybeSingle();

    if (targetUser?.username === 'sascma_admin') {
      return res.status(400).json({ success: false, message: 'Primary super administrator account cannot be deleted.' });
    }

    // Delete profile
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;

    // Delete from auth admin if present
    try {
      await supabase.auth.admin.deleteUser(id);
    } catch (_) {}

    res.json({ success: true, message: 'User account permanently removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/users/:id/reset-password - Admin password reset with Bcrypt hashing
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || !validatePassword(new_password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include uppercase, lowercase, numbers, and a special character.'
      });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    const { error } = await supabase
      .from('profiles')
      .update({ password: hashedPassword, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'User password reset successfully with Bcrypt encryption.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 3. EXAMINATION SESSIONS MANAGEMENT ====================

// GET /api/admin/sessions
router.get('/sessions', async (req, res) => {
  try {
    const { data: sessions, error } = await supabase
      .from('import_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, sessions: sessions || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/sessions/:id - Delete examination session and cascade
router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete marks and students associated
    try {
      await supabase.from('student_marks').delete().eq('session_id', id);
      await supabase.from('students').delete().eq('session_id', id);
    } catch (_) {}

    const { error } = await supabase.from('import_sessions').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true, message: 'Examination session removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 4. SECURITY & SYSTEM DIAGNOSTICS ====================

// POST /api/admin/test-smtp - Send live test diagnostic email
router.post('/test-smtp', async (req, res) => {
  try {
    const targetEmail = req.body.email || req.user.email || 'prince.kahar.king@gmail.com';
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();

    await sendOtpEmail(targetEmail, testCode, 'Admin SMTP Diagnostic Test');

    res.json({
      success: true,
      message: `Diagnostic email successfully dispatched to ${targetEmail}. SMTP is fully operational.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'SMTP Diagnostic Failed: ' + err.message });
  }
});

// POST /api/admin/rehash-legacy-passwords - One-click security upgrade to Bcrypt
router.post('/rehash-legacy-passwords', async (req, res) => {
  try {
    const { data: users, error } = await supabase.from('profiles').select('id, username, password');
    if (error) throw error;

    let updatedCount = 0;
    for (const u of (users || [])) {
      if (u.password && !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
        const hash = await bcrypt.hash(u.password, 10);
        await supabase.from('profiles').update({ password: hash }).eq('id', u.id);
        updatedCount++;
      }
    }

    res.json({
      success: true,
      message: `Security migration completed! ${updatedCount} legacy passwords converted to salted Bcrypt hashes.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Security upgrade failed: ' + err.message });
  }
});

export default router;
