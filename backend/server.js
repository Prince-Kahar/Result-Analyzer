import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Session-Id', 'x-session-id']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static assets (logos, icons)
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// API Routes Mounting
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/upload.js';
import dashboardRoutes from './routes/dashboard.js';
import studentsRoutes from './routes/students.js';
import subjectsRoutes from './routes/subjects.js';
import collegesRoutes from './routes/colleges.js';
import verifyRoutes from './routes/verify.js';
import riskRadarRoutes from './routes/riskRadar.js';
import helpdeskRoutes from './routes/helpdesk.js';
import certificatesRoutes from './routes/certificates.js';
import exportRoutes from './routes/export.js';
import adminRoutes from './routes/admin.js';

app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/analytics', subjectsRoutes);
app.use('/api/colleges', collegesRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/risk-radar', riskRadarRoutes);
app.use('/api/help-desk', helpdeskRoutes);
app.use('/api/branding', certificatesRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/admin', adminRoutes);

// Sessions endpoints alias
import { supabase } from './config/supabase.js';
import { requireAuth } from './middleware/authMiddleware.js';

app.get('/api/sessions', requireAuth, async (req, res) => {
  try {
    const { data: sessions } = await supabase
      .from('import_sessions')
      .select('*')
      
      .order('id', { ascending: false });
    res.json({ success: true, sessions: sessions || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/sessions/:id', requireAuth, async (req, res) => {
  try {
    const sessionId = req.params.id;
    await supabase.from('import_sessions').delete().eq('id', sessionId);
    await supabase.from('students').delete().eq('session_id', sessionId);
    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    platform: 'VNSGU Student Result Analyzer & Academic Intelligence Suite (Node.js)',
    status: 'Operational',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🎓 VNSGU Result Analyzer Backend Server Running`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`📡 Supabase: Connected to ${process.env.SUPABASE_URL}`);
  console.log(`⚡ Status: Fully Operational at http://127.0.0.1:${PORT}`);
  console.log(`==================================================`);
});
