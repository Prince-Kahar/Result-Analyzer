import express from 'express';
import ExcelJS from 'exceljs';
import { supabase } from '../config/supabase.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { getEffectiveSessionId } from '../utils/sessionHelper.js';

const router = express.Router();

// GET /api/export?format=xlsx|csv
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { format = 'xlsx', college } = req.query;
    const sessionId = await getEffectiveSessionId(req);

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'No active examination session found to export' });
    }

    let query = supabase.from('students').select('*').eq('session_id', sessionId);
    if (college && college !== 'ALL') query = query.eq('college', college);

    const { data: students, error } = await query.order('seat_no');
    if (error) throw error;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Student Results');

    worksheet.columns = [
      { header: 'Seat No', key: 'seat_no', width: 14 },
      { header: 'SPID', key: 'sp_id', width: 16 },
      { header: 'Student Name', key: 'name', width: 32 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'College / Department', key: 'college', width: 35 },
      { header: 'Total Marks', key: 'total_marks', width: 14 },
      { header: 'Percentage', key: 'percentage', width: 14 },
      { header: 'SGPA', key: 'sgpa', width: 12 },
      { header: 'Grade', key: 'overall_grade', width: 12 },
      { header: 'Status', key: 'overall_status', width: 14 },
      { header: 'ATKTs', key: 'atkt_count', width: 10 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D9488' }
    };

    (students || []).forEach(std => {
      worksheet.addRow({
        seat_no: std.seat_no,
        sp_id: std.sp_id,
        name: std.name,
        gender: std.gender,
        college: std.college,
        total_marks: std.total_marks,
        percentage: std.percentage + '%',
        sgpa: std.sgpa,
        overall_grade: std.overall_grade,
        overall_status: std.overall_status,
        atkt_count: std.atkt_count
      });
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="student_results.csv"');
      await workbook.csv.write(res);
      res.end();
    } else {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="student_results.xlsx"');
      await workbook.xlsx.write(res);
      res.end();
    }

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
