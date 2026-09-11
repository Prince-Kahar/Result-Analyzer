import express from 'express';
import { supabase } from '../config/supabase.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { getEffectiveSessionId } from '../utils/sessionHelper.js';

const router = express.Router();

// GET /api/subjects
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { college } = req.query;
    const sessionId = await getEffectiveSessionId(req);

    if (!sessionId) {
      return res.json({ success: true, subjects: [] });
    }

    // 1. Fetch students for this active session
    let stdQuery = supabase.from('students').select('id').eq('session_id', sessionId);
    if (college && college !== 'ALL') stdQuery = stdQuery.eq('college', college);

    const { data: stdList } = await stdQuery.limit(1000);
    const studentIds = (stdList || []).map(s => s.id);

    if (studentIds.length === 0) {
      return res.json({ success: true, subjects: [] });
    }

    // 2. Fetch marks strictly for students in this uploaded PDF session
    const { data: marks, error } = await supabase
      .from('subject_marks')
      .select('*')
      .in('student_id', studentIds.slice(0, 500));

    if (error) throw error;

    // Group by subject_name
    const subjectMap = new Map();
    (marks || []).forEach(m => {
      const name = (m.subject_name || `Subject ${(m.subject_index || 0) + 1}`).trim();
      if (!name) return;

      if (!subjectMap.has(name)) {
        subjectMap.set(name, {
          subject_name: name,
          index: m.subject_index ?? 0,
          total_students: 0,
          passed: 0,
          failed: 0,
          highest_mark: 0,
          lowest_mark: 100,
          total_sum: 0,
          ext_sum: 0,
          int_sum: 0
        });
      }
      const s = subjectMap.get(name);
      const tot = Number(m.total_mark) || 0;
      s.total_students++;
      if (m.status === 'PASS') s.passed++;
      else s.failed++;
      if (tot > s.highest_mark) s.highest_mark = tot;
      if (tot < s.lowest_mark) s.lowest_mark = tot;
      s.total_sum += tot;
      s.ext_sum += Number(m.ext_mark) || 0;
      s.int_sum += Number(m.int_mark) || 0;
    });

    const subjects = Array.from(subjectMap.values()).map(s => {
      const count = s.total_students || 1;
      const passRate = Number(((s.passed / count) * 100).toFixed(1));
      const diffRating = Number((Math.min(10, ((s.failed / count) * 10 + (100 - (s.total_sum / count)) * 0.05))).toFixed(1));
      return {
        subject_name: s.subject_name,
        subject_index: s.index,
        total_students: s.total_students,
        passed: s.passed,
        failed: s.failed,
        pass_percentage: passRate,
        highest_mark: s.highest_mark,
        lowest_mark: s.lowest_mark === 100 ? 0 : s.lowest_mark,
        avg_mark: Number((s.total_sum / count).toFixed(1)),
        avg_ext: Number((s.ext_sum / count).toFixed(1)),
        avg_int: Number((s.int_sum / count).toFixed(1)),
        difficulty_rating: diffRating,
        recommendation: diffRating > 6 ? 'High failure rate: Recommend remedial tutorials and conceptual revision.' : 'Healthy performance index.'
      };
    });

    subjects.sort((a, b) => a.subject_index - b.subject_index);

    res.json({ success: true, subjects });
  } catch (err) {
    console.error('Subjects API Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/analytics/exam-difficulty
router.get('/exam-difficulty', optionalAuth, async (req, res) => {
  try {
    req.url = '/';
    return router.handle(req, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
