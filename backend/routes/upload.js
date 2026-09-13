import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { supabase } from '../config/supabase.js';
import { parsePdfWithWorker } from '../services/pdfParserService.js';
import { uploadFileToS3 } from '../services/s3Service.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 100 * 1024 * 1024 }
});

// Shared processor for all upload pathways
async function processUploadedPdf(filePath, originalName, user, res) {
  console.log(`Received upload: ${originalName}, user: ${user?.username || 'Guest Faculty'}`);

  try {
    const parsedData = await parsePdfWithWorker(filePath);

    if (!parsedData.success) {
      throw new Error(parsedData.error || 'Failed to parse VNSGU examination PDF');
    }

    const { course, semester, academic_year, college_name, students, result_summary } = parsedData;

    // Persist Gazette Result Summary for instant Dashboard display
    if (result_summary && Object.keys(result_summary).length > 0) {
      try {
        const summariesPath = path.join(process.cwd(), 'backend/data/session_summaries.json');
        let allSummaries = {};
        if (fs.existsSync(summariesPath)) {
          allSummaries = JSON.parse(fs.readFileSync(summariesPath, 'utf8'));
        }
        allSummaries[sessionId] = result_summary;
        fs.writeFileSync(summariesPath, JSON.stringify(allSummaries, null, 2));
      } catch (err) {
        console.warn('Failed to save session summary:', err.message);
      }
    }

    if (!students || students.length === 0) {
      throw new Error('No student records could be extracted from this PDF format. Please ensure it is an official VNSGU examination gazette.');
    }

    let s3Archive = null;
    try {
      s3Archive = await uploadFileToS3(filePath, originalName);
    } catch (s3Err) {
      console.warn('S3 archive warning (non-fatal):', s3Err.message);
    }

    let sessionId = Math.floor(Date.now() / 1000);
    let userId = null;
    if (user?.id) {
      try {
        const { data: pCheck } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
        if (pCheck?.id) userId = pCheck.id;
      } catch (_) {}
    }

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

      let finalInsertedStudents = [];
      const { data: insertedStudents, error: stdErr } = await supabase
        .from('students')
        .insert(chunk)
        .select('id, seat_no');

      if (stdErr) {
        console.warn('Initial student chunk notice, retrying with sanitized payload:', stdErr.message);
        const cleanChunk = chunk.map(c => {
          const copy = { ...c };
          delete copy.created_by;
          return copy;
        });
        const { data: retryStudents, error: retryErr } = await supabase
          .from('students')
          .insert(cleanChunk)
          .select('id, seat_no');

        if (!retryErr && retryStudents) {
          finalInsertedStudents = retryStudents;
          insertedStudentsCount += retryStudents.length;
        } else if (retryErr) {
          console.error('Failed to insert student chunk on retry:', retryErr.message);
        }
      } else if (insertedStudents) {
        finalInsertedStudents = insertedStudents;
        insertedStudentsCount += insertedStudents.length;
      }

      const currentInserted = finalInsertedStudents;
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

    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}

    return res.json({
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
    return res.status(500).json({ success: false, message: 'Upload & parse failed: ' + err.message });
  }
}

// 1. Primary: Standard multipart form-data upload
router.post('/', optionalAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No PDF file was provided. Please select a valid file.' });
  }
  await processUploadedPdf(req.file.path, req.file.originalname || 'Examination_Gazette.pdf', req.user, res);
});

// 2. Fallback: Raw binary octet-stream upload (Ultra-reliable for mobile browsers)
router.post('/raw', optionalAuth, express.raw({ type: ['application/pdf', 'application/octet-stream', '*/*'], limit: '100mb' }), async (req, res) => {
  if (!req.body || req.body.length === 0) {
    return res.status(400).json({ success: false, message: 'No binary PDF data received.' });
  }

  const rawFilename = req.headers['x-filename'] ? decodeURIComponent(req.headers['x-filename']) : 'Mobile_Upload.pdf';
  const tempPath = path.join(uploadDir, `raw_${Date.now()}_${path.basename(rawFilename)}`);

  fs.writeFileSync(tempPath, req.body);
  await processUploadedPdf(tempPath, rawFilename, req.user, res);
});

// 3. Fallback: Base64 JSON upload
router.post('/base64', optionalAuth, express.json({ limit: '100mb' }), async (req, res) => {
  const { filename, base64 } = req.body || {};
  if (!base64) {
    return res.status(400).json({ success: false, message: 'No base64 data received.' });
  }

  const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');
  const tempPath = path.join(uploadDir, `b64_${Date.now()}_${path.basename(filename || 'Mobile.pdf')}`);

  fs.writeFileSync(tempPath, buffer);
  await processUploadedPdf(tempPath, filename || 'Mobile_Upload.pdf', req.user, res);
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
