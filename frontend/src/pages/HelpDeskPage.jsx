import React, { useState } from 'react';
import { api } from '../services/api';
import { HelpCircle, Send, Search, CheckCircle2, MessageSquare } from 'lucide-react';

export const HelpDeskPage = () => {
  const [tab, setTab] = useState('submit'); // 'submit' | 'track'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [seatNo, setSeatNo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);

  // Track state
  const [trackId, setTrackId] = useState('');
  const [trackedTicket, setTrackedTicket] = useState(null);
  const [trackError, setTrackError] = useState('');
  const [replyText, setReplyText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.submitTicket({ name, email, seat_no: seatNo, subject, message });
      if (res.success) {
        setSubmittedTicket(res);
        setName(''); setEmail(''); setSeatNo(''); setSubject(''); setMessage('');
      }
    } catch (err) {
      alert(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    setTrackError('');
    setTrackedTicket(null);
    setLoading(true);
    try {
      const res = await api.trackTicket(trackId.trim());
      if (res.success && res.ticket) {
        setTrackedTicket(res.ticket);
      } else {
        setTrackError('Ticket not found');
      }
    } catch (err) {
      setTrackError(err.message || 'Error fetching ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !trackedTicket) return;
    try {
      await api.replyTicket({
        tracking_id: trackedTicket.tracking_id,
        reply_text: replyText,
        author: trackedTicket.name
      });
      setTrackedTicket(prev => ({
        ...prev,
        replies: [...prev.replies, { author: prev.name, message: replyText, created_at: new Date().toISOString() }]
      }));
      setReplyText('');
    } catch (err) {
      alert('Failed to send reply');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
          <HelpCircle size={26} />
        </div>
        <h2 className="text-2xl font-bold text-white">Student Support & Help Desk</h2>
        <p className="text-xs text-slate-400">Submit queries regarding re-evaluation, marksheet discrepancies, or hall tickets</p>
      </div>

      {/* Switcher */}
      <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/60 max-w-xs mx-auto">
        <button
          type="button"
          onClick={() => setTab('submit')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            tab === 'submit' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Submit Ticket
        </button>
        <button
          type="button"
          onClick={() => setTab('track')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            tab === 'track' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Track Status
        </button>
      </div>

      {tab === 'submit' && (
        <div className="glass-panel p-6 space-y-4">
          {submittedTicket ? (
            <div className="p-5 text-center space-y-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Ticket Submitted Successfully!</h3>
              <p className="text-xs text-slate-400">Save your unique tracking ID to monitor responses:</p>
              <div className="p-3 bg-slate-900 rounded-xl font-mono text-lg font-black text-teal-300 border border-teal-500/30 inline-block">
                {submittedTicket.tracking_id}
              </div>
              <div>
                <button
                  onClick={() => setSubmittedTicket(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-white mt-2"
                >
                  Submit Another Ticket
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@example.com"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Seat Number (Optional)</label>
                  <input
                    type="text"
                    value={seatNo}
                    onChange={(e) => setSeatNo(e.target.value)}
                    placeholder="e.g. 1042"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Subject / Query Topic</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Discrepancy in External Marks"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Detailed Explanation</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Explain your inquiry in detail..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-50"
              >
                {loading ? 'Submitting Ticket...' : 'Submit Support Query'}
              </button>
            </form>
          )}
        </div>
      )}

      {tab === 'track' && (
        <div className="glass-panel p-6 space-y-4">
          <form onSubmit={handleTrack} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Enter Tracking ID (e.g. TCK-123456)"
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl"
            >
              Track
            </button>
          </form>

          {trackError && <p className="text-xs text-rose-400">{trackError}</p>}

          {trackedTicket && (
            <div className="space-y-4 pt-3 border-t border-slate-800 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white text-sm">{trackedTicket.subject}</h4>
                  <p className="text-slate-400">By {trackedTicket.name} • Seat: {trackedTicket.seat_no || 'N/A'}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300">
                  {trackedTicket.status}
                </span>
              </div>

              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-slate-300">
                {trackedTicket.message}
              </div>

              {/* Conversation history */}
              {trackedTicket.replies?.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Responses</span>
                  {trackedTicket.replies.map((rep, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="font-bold text-teal-400 block">{rep.author}</span>
                      <p className="text-slate-300">{rep.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Box */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Type a follow-up reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none"
                />
                <button
                  onClick={handleSendReply}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
