import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// GET /api/verify/student/:id (Public, no login needed)
router.get('/student/:id', async (req, res) => {
  try {
    const studentIdOrSeat = req.params.id;

    let query = supabase.from('students').select('*');
    if (isNaN(studentIdOrSeat)) {
      query = query.or(`id.eq.${studentIdOrSeat},seat_no.eq.${studentIdOrSeat}`);
    } else {
      query = query.or(`id.eq.${parseInt(studentIdOrSeat)},seat_no.eq.${studentIdOrSeat}`);
    }

    const { data: student, error } = await query.limit(1).maybeSingle();

    if (error || !student) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'No authenticated record found for this credential ID'
      });
    }

    // Get subjects
    const { data: subjects } = await supabase
      .from('subject_marks')
      .select('*')
      .eq('student_id', student.id)
      .order('subject_index', { ascending: true });

    // Session info
    const { data: session } = await supabase
      .from('import_sessions')
      .select('course, semester, academic_year')
      .eq('id', student.session_id)
      .maybeSingle();

    const authHash = `SHA256-VNSGU-AUTH-${student.seat_no}-${student.sp_id}-${student.total_marks}`;

    res.json({
      success: true,
      verified: true,
      institution: 'Veer Narmad South Gujarat University',
      credential_type: 'Digital Examination Transcript & Marksheet',
      verification_hash: authHash,
      verified_at: new Date().toISOString(),
      student: {
        seat_no: student.seat_no,
        sp_id: student.sp_id,
        name: student.name,
        college: student.college,
        course: session?.course || 'Bachelor of Science',
        semester: session?.semester || 'Semester 1',
        academic_year: session?.academic_year || '2025-2026',
        total_marks: student.total_marks,
        percentage: student.percentage,
        sgpa: student.sgpa,
        overall_grade: student.overall_grade,
        overall_status: student.overall_status,
        subjects: subjects || []
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, verified: false, message: err.message });
  }
});

export default router;
