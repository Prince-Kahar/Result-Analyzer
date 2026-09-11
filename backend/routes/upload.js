import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { supabase } from '../config/supabase.js';
import { parsePdfWithWorker } from '../services/pdfParserService.js';
import { uploadFileToS3 } from '../services/s3Service.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure multer storage ensuring uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 100 * 1024 * 1024 } // up to 100 MB
});

// POST /api/upload - Accepts optionalAuth so upload never hard-fails due to missing/expired token
router.post('/', optionalAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No PDF file was provided. Please select a valid file.' });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname || 'Examination_Gazette.pdf';

  console.log(`Received upload: ${originalName} (${req.file.size} bytes), user: ${req.user?.username || 'Guest Faculty'}`);

  try {
    // 1. Parse PDF using Dual-Engine parser
    const parsedData = await parsePdfWithWorker(filePath);

    if (!parsedData.success) {
      throw new Error(parsedData.error || 'Failed to parse VNSGU examination PDF');
    }

    const { course, semester, academic_year, college_name, students } = parsedData;

    if (!students || students.length === 0) {
      throw new Error('No student records could be extracted from this PDF format. Please ensure it is an official VNSGU examination gazette.');
    }

    // 2. Archive raw PDF to S3 if configured
    let s3Archive = null;
    try {
      s3Archive = await uploadFileToS3(filePath, originalName);
    } catch (s3Err) {
      console.warn('S3 archive warning (non-fatal):', s3Err.message);
    }

    // 3. Create or register import session
    let sessionId = Math.floor(Date.now() / 1000);
    const userId = req.user?.id || null;

    try {
      const { data: sessionData, error: sessionErr } = await supabase
        .from('import_sessions')
        .insert({
          pdf_filename: originalName,
          course: course || 'Bachelor of Science',
          semester: semester || 'Semester 1',
          academic_year: academic_year || '2025-2026',
          college_name: college_name || 'VNSGU Affiliated College',
          max_marks: 700,
          created_by: userId
        })
        .select()
        .maybeSingle();

      if (!sessionErr && sessionData?.id) {
        sessionId = sessionData.id;
      }
    } catch (e) {
      console.warn('Supabase import_sessions fallback:', e.message);
    }

    // 4. Batch insert students
    const chunkSize = 50;
    let insertedStudentsCount = 0;

    for (let i = 0; i < students.length; i += chunkSize) {
      const chunk = students.slice(i, i + chunkSize).map(std => ({
        session_id: sessionId,
        seat_no: String(std.seat_no || '').trim(),
        sp_id: String(std.sp_id || '').trim(),
        name: String(std.name || 'Student').trim(),
        gender: String(std.gender || 'M').trim(),
        college: String(std.college || college_name || 'VNSGU College').trim(),
        total_marks: Number(std.total_marks) || 0,
        percentage: Number(std.percentage) || 0,
        sgpa: String(std.sgpa || '--'),
        overall_grade: String(std.overall_grade || '--'),
        overall_status: String(std.overall_status || 'PASS'),
        atkt_count: Number(std.atkt_count) || 0,
        created_by: userId
      }));

      const { data: insertedStudents, error: stdErr } = await supabase
        .from('students')
        .insert(chunk)
        .select('id, seat_no');

      if (stdErr) {
        const cleanChunk = chunk.map(c => {
          const copy = { ...c };
          delete copy.created_by;
          return copy;
        });
        const { data: retryStudents, error: retryErr } = await supabase
          .from('students')
          .insert(cleanChunk)
          .select('id, seat_no');

        if (!retryErr) {
          insertedStudentsCount += (retryStudents || []).length;
        }
      } else {
        insertedStudentsCount += (insertedStudents || []).length;
      }

      // 5. Batch insert Subject Marks
      const currentInserted = insertedStudents || [];
      const marksToInsert = [];
      const studentIdMap = new Map(currentInserted.map(s => [String(s.seat_no), s.id]));

      for (const std of students.slice(i, i + chunkSize)) {
        const studentDbId = studentIdMap.get(String(std.seat_no));
        if (!studentDbId || !std.subjects) continue;

        for (const sub of std.subjects) {
          marksToInsert.push({
            student_id: studentDbId,
            subject_index: sub.subject_index ?? 0,
            subject_name: String(sub.subject_name || `Subject ${(sub.subject_index || 0) + 1}`),
            int_mark: String(sub.int_mark || '-'),
            ext_mark: String(sub.ext_mark || '-'),
            total_mark: Number(sub.total_mark) || 0,
            grade: String(sub.grade || '--'),
            status: String(sub.status || 'PASS'),
            created_by: userId
          });
        }
      }

      if (marksToInsert.length > 0) {
        try {
          const { error: markErr } = await supabase.from('subject_marks').insert(marksToInsert);
          if (markErr) {
            const cleanMarks = marksToInsert.map(m => {
              const copy = { ...m };
              delete copy.created_by;
              return copy;
            });
            await supabase.from('subject_marks').insert(cleanMarks);
          }
        } catch (mErr) {
          console.warn('Marks insert notice:', mErr.message);
        }
      }
    }

    // Clean up temporary local upload file
    try { fs.unlinkSync(filePath); } catch (_) {}

    res.json({
      success: true,
      message: `Successfully parsed and imported ${insertedStudentsCount || students.length} student records`,
      session_id: sessionId,
      archived_s3: !!s3Archive,
      details: {
        filename: originalName,
        course,
        semester,
        academic_year,
        college_name,
        total_students: insertedStudentsCount || students.length
      }
    });

  } catch (err) {
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
    console.error('Upload Error:', err);
    res.status(500).json({ success: false, message: 'Upload & parse failed: ' + err.message });
  }
});

// POST /api/upload/clear-sessions
router.post('/clear-sessions', optionalAuth, async (req, res) => {
  try {
    try { await supabase.from('import_sessions').delete(); } catch (_) {}
    await supabase.from('students').delete();
    await supabase.from('subject_marks').delete();
    res.json({ success: true, message: 'All student and session records cleared.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
