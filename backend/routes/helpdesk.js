import express from 'express';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();
let tickets = []; // In-memory ticket storage for instant responsiveness

// POST /api/help-desk (Create ticket)
router.post('/', optionalAuth, (req, res) => {
  const { name, email, seat_no, subject, message, priority } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email and message are required' });
  }

  const trackId = 'TCK-' + Math.floor(100000 + Math.random() * 900000);
  const newTicket = {
    id: tickets.length + 1,
    tracking_id: trackId,
    name,
    email,
    seat_no: seat_no || '',
    subject: subject || 'General Query',
    message,
    priority: priority || 'Medium',
    status: 'Open',
    created_at: new Date().toISOString(),
    replies: []
  };

  tickets.unshift(newTicket);
  res.json({ success: true, tracking_id: trackId, message: 'Support ticket submitted successfully.' });
});

// GET or POST /api/help-desk/track
router.all('/track', (req, res) => {
  const trackId = req.query.tracking_id || req.body.tracking_id;
  if (!trackId) return res.status(400).json({ success: false, message: 'Tracking ID is required' });

  const ticket = tickets.find(t => t.tracking_id === trackId.trim());
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

  res.json({ success: true, ticket });
});

// GET /api/help-desk (List all tickets)
router.get('/', optionalAuth, (req, res) => {
  res.json({ success: true, tickets });
});

// POST /api/help-desk/reply
router.post('/reply', (req, res) => {
  const { tracking_id, reply_text, author } = req.body;
  const ticket = tickets.find(t => t.tracking_id === tracking_id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

  ticket.replies.push({
    author: author || 'Support Team',
    message: reply_text,
    created_at: new Date().toISOString()
  });

  res.json({ success: true, message: 'Reply sent successfully.' });
});

export default router;
