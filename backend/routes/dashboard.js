import fs from 'fs';
import path from 'path';
import os from 'os';
import express from 'express';
import { supabase } from '../config/supabase.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { getEffectiveSessionId } from '../utils/sessionHelper.js';

const router = express.Router();

// GET /api/dashboard
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { college } = req.query;
    const userId = req.user?.id;
    const activeSessionId = await getEffectiveSessionId(req);

    // Fetch user/accessible sessions list
    let sessions = [];
    try {
      let allSessQuery = supabase.from('import_sessions').select('*').order('id', { ascending: false });
      if (userId) allSessQuery = allSessQuery.eq('created_by', userId);
      const { data: sessData } = await allSessQuery;
      if (sessData && sessData.length > 0) {
        sessions = sessData;
      }
    } catch (_) {}

    // If import_sessions is empty or restricted, look up distinct sessions in students
    if (!sessions || sessions.length === 0) {
      try {
        let q = supabase.from('students').select('session_id, college').order('id', { ascending: false }).limit(200);
        if (userId) q = q.eq('created_by', userId);
        const { data: stdList } = await q;
        if (stdList && stdList.length > 0) {
          const seen = new Set();
          for (const row of stdList) {
            if (row.session_id && !seen.has(row.session_id)) {
              seen.add(row.session_id);
              sessions.push({
                id: row.session_id,
                course: 'VNSGU Examination Result',
                semester: 'Active Semester',
                academic_year: '2025-2026',
                college_name: row.college || 'VNSGU Affiliated College'
              });
            }
          }
        }
      } catch (_) {}
    }

    // If no active session requested, return clean empty stats
    if (!activeSessionId) {
      return res.json({
        success: true,
        session_id: null,
        stats: {
          total: 0, appeared: 0, passed: 0, failed: 0, atkt: 0,
          pass_percentage: 0, avg_sgpa: 0, colleges_count: 0
        },
        result_summary: null,
        grade_distribution: { 'O': 0, 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'F': 0 },
        gender_distribution: { 'Male': 0, 'Female': 0 },
        colleges: [],
        sessions: sessions || []
      });
    }

    // Fetch students strictly for this active session
    let stdQuery = supabase
      .from('students')
      .select('id, seat_no, name, college, total_marks, percentage, sgpa, overall_grade, overall_status, gender, atkt_count')
      .eq('session_id', activeSessionId);

    if (userId) stdQuery = stdQuery.eq('created_by', userId);
    if (college && college !== 'ALL') {
      stdQuery = stdQuery.eq('college', college);
    }

    const { data: students, error: stdErr } = await stdQuery;
    if (stdErr) throw stdErr;

    const list = students || [];
    const total = list.length;
    const passed = list.filter(s => s.overall_status === 'PASS').length;
    const atkt = list.filter(s => s.overall_status === 'ATKT').length;
    const failed = list.filter(s => s.overall_status === 'FAIL').length;
    const passPercentage = total > 0 ? Number(((passed / total) * 100).toFixed(2)) : 0;
    
    // Average SGPA calculation
    let sgpaSum = 0;
    let validSgpaCount = 0;
    list.forEach(s => {
      const val = parseFloat(s.sgpa);
      if (!isNaN(val) && val > 0) {
        sgpaSum += val;
        validSgpaCount++;
      }
    });
    const avgSgpa = validSgpaCount > 0 ? Number((sgpaSum / validSgpaCount).toFixed(2)) : 0;

    // Grade Distribution
    const gradeDist = { 'O': 0, 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'F': 0 };
    list.forEach(s => {
      const g = (s.overall_grade || '').toUpperCase().trim();
      if (gradeDist[g] !== undefined) gradeDist[g]++;
      else gradeDist['F']++;
    });

    // Gender Distribution
    const genderDist = { 'Male': 0, 'Female': 0 };
    list.forEach(s => {
      if ((s.gender || '').toUpperCase() === 'F' || (s.gender || '').toUpperCase() === 'FEMALE') {
        genderDist['Female']++;
      } else {
        genderDist['Male']++;
      }
    });

    // Distinct colleges in this session
    const collegesSet = new Set();
    list.forEach(s => { if (s.college) collegesSet.add(s.college); });
    const colleges = Array.from(collegesSet);

    // Official Gazette Result Summary
    let resultSummary = null;
    try {
      const candidatePaths = [
        path.join(os.tmpdir(), 'vnsgu_data', 'session_summaries.json'),
        path.join(process.cwd(), 'backend/data/session_summaries.json')
      ];
      const summariesPath = candidatePaths.find(p => fs.existsSync(p));
      if (summariesPath) {
        const allSummaries = JSON.parse(fs.readFileSync(summariesPath, 'utf8'));
        if (allSummaries[activeSessionId]) {
          resultSummary = allSummaries[activeSessionId];
        }
      }
    } catch (_) {}

    // If no pre-stored summary or if filtering by college, dynamically compute from student records
    if (!resultSummary || (college && college !== 'ALL')) {
      const absentCount = list.filter(s => (s.overall_status || '').toUpperCase() === 'ABSENT').length;
      const withdrawnCount = list.filter(s => (s.overall_status || '').toUpperCase() === 'WITHDRAWN').length;
      resultSummary = {
        total_result: total > 0 ? `${passPercentage} %` : '0.00 %',
        total_pass: passed,
        fail: failed + atkt,
        absent: absentCount,
        form_withdrawn: withdrawnCount,
        reserved: 0,
        withheld: 0,
        dlo: 0,
        cancelled: 0,
        wo_165: 0,
        dlo_fec: 0
      };
    }

    res.json({
      success: true,
      session_id: activeSessionId,
      stats: {
        total,
        appeared: total,
        passed,
        atkt,
        failed,
        pass_percentage: passPercentage,
        avg_sgpa: avgSgpa,
        colleges_count: colleges.length
      },
      result_summary: resultSummary,
      grade_distribution: gradeDist,
      gender_distribution: genderDist,
      colleges,
      sessions: sessions || []
    });

  } catch (err) {
    console.error('Dashboard API Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/dashboard/sessions
router.get('/sessions', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    let sessions = [];
    try {
      let q = supabase.from('import_sessions').select('*').order('id', { ascending: false });
      if (userId) q = q.eq('created_by', userId);
      const { data } = await q;
      if (data && data.length > 0) sessions = data;
    } catch (_) {}

    if (sessions.length === 0) {
      try {
        let q = supabase.from('students').select('session_id, college').order('id', { ascending: false }).limit(100);
        if (userId) q = q.eq('created_by', userId);
        const { data: list } = await q;
        if (list && list.length > 0) {
          const seen = new Set();
          for (const row of list) {
            if (row.session_id && !seen.has(row.session_id)) {
              seen.add(row.session_id);
              sessions.push({
                id: row.session_id,
                course: 'VNSGU Examination Result',
                semester: 'Active Semester',
                academic_year: '2025-2026',
                college_name: row.college || 'VNSGU Affiliated College'
              });
            }
          }
        }
      } catch (_) {}
    }

    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
