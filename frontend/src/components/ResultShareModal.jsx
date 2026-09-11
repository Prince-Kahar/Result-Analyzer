import React, { useState } from 'react';
import { X, Share2, Copy, Check, MessageSquare } from 'lucide-react';

export const ResultShareModal = ({ isOpen, onClose, stats, session, college }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !stats) return null;

  const collegeName = college && college !== 'ALL' ? college : (session?.college_name || 'SASCMA STERS');
  const courseName = session?.course || 'Bachelor of Science';
  const semName = session?.semester || 'Semester 1';
  const yearName = session?.academic_year || '2025-2026';

  const reportText = 
`🎓 *VNSGU EXAMINATION RESULT INTELLIGENCE REPORT*
🏛 *College:* ${collegeName}
📘 *Course:* ${courseName}
📅 *Semester:* ${semName} (${yearName})
━━━━━━━━━━━━━━━━━━━━
📊 *Total Appeared:* ${stats.appeared || stats.total || 0}
✅ *Passed:* ${stats.passed || 0} (${stats.pass_percentage || 0}%)
⚠️ *ATKT / Backlogs:* ${stats.atkt || 0}
❌ *Failed:* ${stats.failed || 0}
⭐ *Average SGPA:* ${stats.avg_sgpa || 0}
━━━━━━━━━━━━━━━━━━━━
🔗 *View Detailed Analytics:* ${window.location.origin}/dashboard
🏛 *SASCMA STERS Academic Intelligence*`;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(reportText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/90 border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Faculty WhatsApp Result Summary</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-300">
            Formatted summary ready to announce on faculty WhatsApp groups, student broadcast channels, or college memos:
          </p>

          {/* Formatted Report Card Preview */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
            {reportText}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleWhatsApp}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all"
            >
              <Share2 size={16} />
              <span>Share on WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              {copied ? <Check size={16} className="text-teal-400" /> : <Copy size={16} />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
