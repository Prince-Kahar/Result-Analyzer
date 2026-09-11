import express from 'express';
import { supabase } from '../config/supabase.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { getEffectiveSessionId } from '../utils/sessionHelper.js';

const router = express.Router();

// GET /api/colleges
router.get('/', optionalAuth, async (req, res) => {
  try {
    const sessionId = await getEffectiveSessionId(req);
    if (!sessionId) {
      return res.json({ success: true, colleges: [] });
    }

    const { data: rows } = await supabase
      .from('students')
      .select('college')
      .eq('session_id', sessionId);

    const collegesSet = new Set();
    (rows || []).forEach(r => { if (r.college) collegesSet.add(r.college); });

    res.json({ success: true, colleges: Array.from(collegesSet) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/colleges/stats
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const sessionId = await getEffectiveSessionId(req);
    if (!sessionId) {
      return res.json({ success: true, college_stats: [] });
    }

    const { data: students, error } = await supabase
      .from('students')
      .select('college, overall_status, sgpa')
      .eq('session_id', sessionId);

    if (error) throw error;

    const map = new Map();
    (students || []).forEach(s => {
      const col = s.college || 'VNSGU Department';
      if (!map.has(col)) {
        map.set(col, { college: col, total: 0, passed: 0, failed: 0, atkt: 0, sgpa_sum: 0 });
      }
      const entry = map.get(col);
      entry.total++;
      if (s.overall_status === 'PASS') entry.passed++;
      else if (s.overall_status === 'ATKT') entry.atkt++;
      else entry.failed++;
      entry.sgpa_sum += (parseFloat(s.sgpa) || 0);
    });

    const stats = Array.from(map.values()).map(c => ({
      college: c.college,
      total_students: c.total,
      passed: c.passed,
      failed: c.failed,
      atkt: c.atkt,
      pass_percentage: Number(((c.passed / c.total) * 100).toFixed(1)),
      avg_sgpa: Number((c.sgpa_sum / c.total).toFixed(2))
    }));

    res.json({ success: true, college_stats: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
