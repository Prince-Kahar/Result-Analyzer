import express from 'express';
import { supabase } from '../config/supabase.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();
let brandingConfig = {
  college_name: 'Veer Narmad South Gujarat University',
  sub_header: 'Accredited B++ (2.90 CGPA) by NAAC | Examination Division',
  logo_url: '/assets/vnsgu.png',
  watermark_text: 'VNSGU OFFICIAL TRANSCRIPT',
  watermark_opacity: 0.12,
  principal_signature: 'Controller of Examinations',
  card_theme: 'emerald'
};

// GET /api/branding/certificate
router.get('/branding/certificate', optionalAuth, (req, res) => {
  res.json({ success: true, branding: brandingConfig });
});

// POST /api/branding/certificate
router.post('/branding/certificate', optionalAuth, (req, res) => {
  brandingConfig = { ...brandingConfig, ...req.body };
  res.json({ success: true, message: 'Branding settings updated', branding: brandingConfig });
});

export default router;
