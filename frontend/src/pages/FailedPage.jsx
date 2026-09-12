import { cleanStudentName } from '../utils/studentUtils';
import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { EmptyState } from '../components/EmptyState';
import { AlertTriangle, Mail, Send, CheckCircle2 } from 'lucide-react';

export const FailedPage = () => {
  const [failedStudents, setFailedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState({});

  const { activeSessionId, hasUploaded } = useSession();

  const fetchFailed = async () => {
    if (!hasUploaded && !activeSessionId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeSessionId) params.append('session_id', activeSessionId);

      const res = await api.getFailedStudents(params.toString());
      if (res.success) {
        setFailedStudents(res.failed_students || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFailed();
  }, [activeSessionId]);

  const handleSendWarning = async (student) => {
    const parentEmail = prompt(`Enter Guardian Email for ${cleanStudentName(student.name)} (Seat ${student.seat_no}):`);
    if (!parentEmail) return;

    setDispatchStatus(prev => ({ ...prev, [student.id]: 'sending' }));
    try {
      const res = await api.sendWarning({ email: parentEmail, student });
      if (res.success) {
        setDispatchStatus(prev => ({ ...prev, [student.id]: 'sent' }));
        alert(`Official warning notification dispatched to ${parentEmail}`);
      }
    } catch (err) {
      setDispatchStatus(prev => ({ ...prev, [student.id]: 'failed' }));
      alert(err.message || 'Notification dispatch failed');
    }
  };

  if (!loading && (!hasUploaded || failedStudents.length === 0)) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No Academic Backlogs Detected"
        description="All candidates in the uploaded gazette have passed successfully, or no VNSGU examination result PDF has been imported yet."
        actionLabel="Upload VNSGU Result PDF"
        actionPath="/upload"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 glass-panel flex items-center justify-between border-rose-500/20 bg-rose-500/5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <AlertTriangle size={26} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Backlog, ATKT & Remedial Candidate Directory</h2>
            <p className="text-xs text-slate-400">Automated candidate tracking, re-exam eligibility, and guardian communication</p>
          </div>
        </div>
      </div>

      {/* Backlog Table */}
      <div className="glass-panel overflow-hidden">
        <div className="responsive-table-wrapper">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Seat No</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">College</th>
                <th className="p-3 text-center">Marks</th>
                <th className="p-3 text-center">Backlogs (ATKT)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Parent Alert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {failedStudents.map((std) => (
                <tr key={std.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-white">{std.seat_no}</td>
                  <td className="p-3 text-slate-200 font-bold">{cleanStudentName(std.name)}</td>
                  <td className="p-3 text-slate-400 max-w-[200px] truncate">{std.college}</td>
                  <td className="p-3 text-center font-bold text-white">{std.total_marks}</td>
                  <td className="p-3 text-center font-black text-rose-400">
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30">
                      {std.atkt_count || 1} Subject(s)
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold text-rose-300">{std.overall_status}</td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      disabled={dispatchStatus[std.id] === 'sending' || dispatchStatus[std.id] === 'sent'}
                      onClick={() => handleSendWarning(std)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                        dispatchStatus[std.id] === 'sent'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-500/20'
                      }`}
                    >
                      {dispatchStatus[std.id] === 'sent' ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span>Dispatched</span>
                        </>
                      ) : (
                        <>
                          <Send size={13} />
                          <span>Send Notice</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
