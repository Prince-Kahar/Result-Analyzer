import { cleanStudentName } from '../utils/studentUtils';
import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { EmptyState } from '../components/EmptyState';
import { Radar, AlertOctagon, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const RiskRadarPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const { activeSessionId, hasUploaded } = useSession();

  useEffect(() => {
    const fetchRadar = async () => {
      if (!hasUploaded && !activeSessionId) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeSessionId) params.append('session_id', activeSessionId);

        const res = await api.getRiskRadar(params.toString());
        if (res.success) {
          setData(res);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRadar();
  }, [activeSessionId]);

  const summary = data?.summary || { total_assessed: 0, critical_count: 0, moderate_count: 0, safe_count: 0 };
  const critical = data?.critical_students || [];

  if (!loading && (!hasUploaded || summary.total_assessed === 0)) {
    return (
      <EmptyState
        icon={Radar}
        title="No Academic Risk Analysis Available"
        description="Candidate risk evaluations and early warning matrices are compiled exclusively from an uploaded VNSGU Result PDF gazette."
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
            <Radar size={26} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Academic Risk Radar & Early Warning Matrix</h2>
            <p className="text-xs text-slate-400">Automated candidate risk profiling based on backlogs and critical subject scores</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 space-y-2 border-rose-500/30 bg-rose-500/10">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Critical Risk Level</span>
          <h3 className="text-2xl font-black text-white">{summary.critical_count} Candidates</h3>
          <p className="text-xs text-slate-400">ATKT count ≥ 3 or overall failure status</p>
        </div>

        <div className="glass-panel p-5 space-y-2 border-amber-500/30 bg-amber-500/10">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Moderate Warning</span>
          <h3 className="text-2xl font-black text-white">{summary.moderate_count} Candidates</h3>
          <p className="text-xs text-slate-400">1 to 2 backlogs or SGPA &lt; 5.5</p>
        </div>

        <div className="glass-panel p-5 space-y-2 border-emerald-500/30 bg-emerald-500/10">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Safe Academic Zone</span>
          <h3 className="text-2xl font-black text-white">{summary.safe_count} Candidates</h3>
          <p className="text-xs text-slate-400">Clear record with zero examination ATKTs</p>
        </div>
      </div>

      {/* Critical Students Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertOctagon size={16} className="text-rose-400" /> Critical Risk Attention List
          </h3>
          <span className="text-xs text-slate-400 font-mono">Assessed: {summary.total_assessed}</span>
        </div>

        <div className="responsive-table-wrapper">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Seat No</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">College</th>
                <th className="p-3 text-center">Backlogs</th>
                <th className="p-3 text-center">SGPA</th>
                <th className="p-3 text-center">Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {critical.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-white">{s.seat_no}</td>
                  <td className="p-3 text-slate-200 font-bold">{s.name}</td>
                  <td className="p-3 text-slate-400 max-w-[200px] truncate">{s.college}</td>
                  <td className="p-3 text-center font-bold text-rose-400">{s.atkt_count || 1} ATKTs</td>
                  <td className="p-3 text-center font-bold text-white">{s.sgpa}</td>
                  <td className="p-3 text-center font-black text-rose-400">{s.risk_score} / 100</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
