import express from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/admin/users
router.get('/users', requireAuth, async (req, res) => {
  try {
    const { data: users, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, users: users || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
