import express from 'express';
import { supabase } from '../config/supabase.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { getEffectiveSessionId } from '../utils/sessionHelper.js';

const router = express.Router();

// GET /api/risk-radar/analytics
router.get('/analytics', optionalAuth, async (req, res) => {
  try {
    const { college } = req.query;
    const sessionId = await getEffectiveSessionId(req);

    if (!sessionId) {
      return res.json({
        success: true,
        summary: { total_assessed: 0, critical_count: 0, moderate_count: 0, safe_count: 0 },
        critical_students: [],
        moderate_students: []
      });
    }

    let query = supabase.from('students').select('*').eq('session_id', sessionId);
    if (college && college !== 'ALL') query = query.eq('college', college);

    const { data: students, error } = await query;
    if (error) throw error;

    const list = students || [];
    const highRisk = [];
    const moderateRisk = [];
    const safeZone = [];

    list.forEach(s => {
      const atkt = s.atkt_count || 0;
      const sgpa = parseFloat(s.sgpa) || 0;

      if (atkt >= 3 || sgpa < 4.5 || s.overall_status === 'FAIL') {
        highRisk.push({ ...s, risk_level: 'Critical Risk', risk_score: 85 + Math.min(15, atkt * 5) });
      } else if (atkt >= 1 || sgpa < 5.5 || s.overall_status === 'ATKT') {
        moderateRisk.push({ ...s, risk_level: 'Moderate Risk', risk_score: 55 + atkt * 10 });
      } else {
        safeZone.push({ ...s, risk_level: 'Safe Zone', risk_score: 15 });
      }
    });

    res.json({
      success: true,
      summary: {
        total_assessed: list.length,
        critical_count: highRisk.length,
        moderate_count: moderateRisk.length,
        safe_count: safeZone.length
      },
      critical_students: highRisk,
      moderate_students: moderateRisk
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
