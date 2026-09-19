import fs from 'fs';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env if available (local development)
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Session-Id', 'x-session-id']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// URL normalizer for Vercel Serverless rewrites
// Ensures routes always match whether called with /api prefix or stripped
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/assets')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Prevent aggressive browser caching for HTML, Service Worker, and Manifest
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html' || req.path === '/sw.js' || req.path === '/manifest.webmanifest') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

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

// Serve production singlefile frontend (for local standalone server)
const candidateDistDirs = [
  path.join(__dirname, 'public'),
  path.join(__dirname, '../frontend/dist'),
  path.join(__dirname, 'dist')
];
const frontendDist = candidateDistDirs.find(d => fs.existsSync(d) && fs.existsSync(path.join(d, 'index.html')));

if (frontendDist) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/assets')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

export default app;
export { app };
