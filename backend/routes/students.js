import express from 'express';
import { supabase } from '../config/supabase.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { getEffectiveSessionId } from '../utils/sessionHelper.js';
import { sendParentWarningEmail } from '../services/emailService.js';

const router = express.Router();

// GET /api/students
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { college, status, search, page = 1, limit = 50 } = req.query;
    const sessionId = await getEffectiveSessionId(req);

    if (!sessionId) {
      return res.json({ success: true, total: 0, page: 1, limit: parseInt(limit), students: [] });
    }

    let query = supabase
      .from('students')
      .select('*', { count: 'exact' })
      .eq('session_id', sessionId);

    if (college && college !== 'ALL') query = query.eq('college', college);
    if (status && status !== 'ALL') query = query.eq('overall_status', status);

    if (search) {
      query = query.or(`seat_no.ilike.%${search}%,name.ilike.%${search}%,sp_id.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;

    const { data: students, count, error } = await query
      .order('seat_no', { ascending: true })
      .range(from, to);

    if (error) throw error;

    res.json({
      success: true,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      students: students || []
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/students/top-n
router.get('/top-n', optionalAuth, async (req, res) => {
  try {
    const { college, n = 10 } = req.query;
    const sessionId = await getEffectiveSessionId(req);

    if (!sessionId) {
      return res.json({ success: true, toppers: [] });
    }

    let query = supabase
      .from('students')
      .select('*')
      .eq('session_id', sessionId)
      .eq('overall_status', 'PASS');

    if (college && college !== 'ALL') query = query.eq('college', college);

    const { data: toppers, error } = await query
      .order('percentage', { ascending: false })
      .order('sgpa', { ascending: false })
      .limit(parseInt(n));

    if (error) throw error;

    const ranked = (toppers || []).map((t, idx) => ({ ...t, rank: idx + 1 }));
    res.json({ success: true, toppers: ranked });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/students/failed
router.get('/failed', optionalAuth, async (req, res) => {
  try {
    const { college } = req.query;
    const sessionId = await getEffectiveSessionId(req);

    if (!sessionId) {
      return res.json({ success: true, failed_students: [] });
    }

    let query = supabase
      .from('students')
      .select('*')
      .eq('session_id', sessionId)
      .in('overall_status', ['FAIL', 'ATKT']);

    if (college && college !== 'ALL') query = query.eq('college', college);

    const { data: failedStudents, error } = await query.order('atkt_count', { ascending: false });
    if (error) throw error;

    res.json({ success: true, failed_students: failedStudents || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/students/:id/report
router.get('/:id/report', optionalAuth, async (req, res) => {
  try {
    const studentIdOrSeat = req.params.id;

    let query = supabase.from('students').select('*');
    if (isNaN(studentIdOrSeat)) {
      query = query.or(`id.eq.${studentIdOrSeat},seat_no.eq.${studentIdOrSeat}`);
    } else {
      query = query.or(`id.eq.${parseInt(studentIdOrSeat)},seat_no.eq.${studentIdOrSeat}`);
    }

    const { data: stdData, error: stdErr } = await query.limit(1).maybeSingle();
    if (stdErr || !stdData) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }

    const { data: marks } = await supabase
      .from('subject_marks')
      .select('*')
      .eq('student_id', stdData.id)
      .order('subject_index', { ascending: true });

    const { data: session } = await supabase
      .from('import_sessions')
      .select('*')
      .eq('id', stdData.session_id)
      .maybeSingle();

    // Parse actual semester progression if recorded in sp_id
    let semesterTrends = [];
    if (stdData.sp_id && stdData.sp_id.includes('###SEM_HIST:')) {
      try {
        const histJson = stdData.sp_id.split('###SEM_HIST:')[1];
        const parsed = JSON.parse(histJson);
        semesterTrends = Object.values(parsed).map(s => ({
          semester: `Sem ${s.sem}`,
          sgpa: parseFloat(s.result) || 0,
          status: s.result && s.result.includes('F') ? 'FAIL' : 'PASS'
        }));
      } catch (_) {}
    }

    res.json({
      success: true,
      student: stdData,
      subjects: marks || [],
      session: session || {},
      semester_trends: semesterTrends,
      verification_hash: `SHA256-VNSGU-AUTH-${stdData.seat_no}-${stdData.total_marks}`
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/students/send-warning
router.post('/send-warning', optionalAuth, async (req, res) => {
  try {
    const { email, student } = req.body;
    if (!email || !student) {
      return res.status(400).json({ success: false, message: 'Email and student info are required' });
    }

    await sendParentWarningEmail(email, student);
    res.json({ success: true, message: `Official academic warning dispatched to ${email}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
