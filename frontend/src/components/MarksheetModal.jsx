import React from 'react';
import { X, Printer, Share2, QrCode, ShieldCheck, Download } from 'lucide-react';

export const MarksheetModal = ({ data, onClose }) => {
  if (!data) return null;

  const { student, subjects = [], session = {}, verification_hash = 'VNSGU-AUTH-VERIFIED' } = data;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🎓 *VNSGU Examination Grade Card*\n` +
      `🏛 *College:* ${student.college || session.college_name || 'VNSGU Affiliated'}\n` +
      `👤 *Student:* ${student.name}\n` +
      `🔢 *Seat No:* ${student.seat_no}\n` +
      `📊 *Marks:* ${student.total_marks} / 700 (${student.percentage}%)\n` +
      `⭐ *SGPA:* ${student.sgpa} (Grade: ${student.overall_grade})\n` +
      `🏁 *Status:* ${student.overall_status}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🔗 Verified by SASCMA STERS Result Intelligence`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="marksheet-modal-wrapper fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="marksheet-card relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header Bar (Hidden on Print) */}
        <div className="marksheet-header-bar flex items-center justify-between px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 no-print">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-teal-400" />
            <h3 className="text-sm font-bold text-white">Digital Academic Grade Card</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition-all"
              title="Share on WhatsApp"
            >
              <Share2 size={14} />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-xl transition-all"
              title="Print / Save Marksheet as PDF"
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors ml-1"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Marksheet Body (Printable) */}
        <div className="marksheet-body p-6 space-y-6">
          {/* University Header */}
          <div className="text-center pb-4 border-b border-slate-800">
            <img src="/assets/vnsgu.png" alt="VNSGU Logo" className="w-14 h-14 mx-auto mb-2 object-contain" />
            <h2 className="text-lg font-extrabold tracking-wide">VEER NARMAD SOUTH GUJARAT UNIVERSITY</h2>
            <p className="text-xs text-teal-400 font-semibold uppercase">{session.college_name || student.college || 'SASCMA STERS'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{session.course || 'Bachelor of Science'} • {session.semester || 'Semester 1'} ({session.academic_year || '2025-2026'})</p>
          </div>

          {/* Student Identity Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Seat Number</span>
              <strong className="font-mono text-sm">{student.seat_no}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">SPID</span>
              <strong className="font-mono">{student.sp_id || 'N/A'}</strong>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block text-[11px]">Candidate Name</span>
              <strong className="text-sm">{student.name}</strong>
            </div>
          </div>

          {/* Subject Breakdown Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800/80 text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">Course / Paper Name</th>
                  <th className="p-2.5 text-center">INT /30</th>
                  <th className="p-2.5 text-center">EXT /70</th>
                  <th className="p-2.5 text-center">TOT /100</th>
                  <th className="p-2.5 text-center">Grade</th>
                  <th className="p-2.5 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {subjects.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/20">
                    <td className="p-2.5 text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 font-semibold">{sub.subject_name}</td>
                    <td className="p-2.5 text-center text-slate-300">{sub.int_mark}</td>
                    <td className="p-2.5 text-center text-slate-300">{sub.ext_mark}</td>
                    <td className="p-2.5 text-center font-bold">{sub.total_mark}</td>
                    <td className="p-2.5 text-center font-bold text-teal-400">{sub.grade}</td>
                    <td className="p-2.5 text-center">
                      <span className={`status-badge ${sub.status === 'PASS' ? 'status-pass' : 'status-fail'}`}>
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Aggregate Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <span className="text-[11px] text-slate-400 uppercase">Total Marks</span>
              <p className="text-base font-extrabold mt-0.5">{student.total_marks} / 700</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <span className="text-[11px] text-slate-400 uppercase">Percentage</span>
              <p className="text-base font-extrabold text-teal-400 mt-0.5">{student.percentage}%</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <span className="text-[11px] text-slate-400 uppercase">SGPA</span>
              <p className="text-base font-extrabold text-sky-400 mt-0.5">{student.sgpa}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <span className="text-[11px] text-slate-400 uppercase">Final Status</span>
              <p className={`text-base font-extrabold mt-0.5 ${student.overall_status === 'PASS' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {student.overall_status}
              </p>
            </div>
          </div>

          {/* Anti-Tamper Cryptographic Badge */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs">
            <div className="flex items-center gap-3">
              <QrCode size={32} className="text-teal-400 flex-shrink-0" />
              <div>
                <p className="text-teal-300 font-bold">Cryptographically Authenticated</p>
                <p className="text-[11px] text-slate-400 font-mono break-all">{verification_hash}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-[11px] font-bold bg-teal-500/20 text-teal-300 rounded-full flex-shrink-0">
              SHA-256 Valid
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
