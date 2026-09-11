import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { EmptyState } from '../components/EmptyState';
import { Building2, Award, Users, CheckCircle2 } from 'lucide-react';

export const CollegesPage = () => {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(false);

  const { activeSessionId, hasUploaded } = useSession();

  useEffect(() => {
    const fetchColleges = async () => {
      if (!hasUploaded && !activeSessionId) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeSessionId) params.append('session_id', activeSessionId);

        const res = await api.getCollegesStats(params.toString());
        if (res.success) {
          setColleges(res.college_stats || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchColleges();
  }, [activeSessionId]);

  if (!loading && (!hasUploaded || colleges.length === 0)) {
    return (
      <EmptyState
        icon={Building2}
        title="No College Data Found"
        description="College ranking and performance comparison are compiled exclusively from an uploaded VNSGU Result PDF gazette."
        actionLabel="Upload VNSGU Result PDF"
        actionPath="/upload"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 glass-panel flex items-center justify-between border-sky-500/20 bg-sky-500/5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Building2 size={26} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Multi-Institution College Comparison</h2>
            <p className="text-xs text-slate-400">Institutional performance benchmark across Veer Narmad South Gujarat University</p>
          </div>
        </div>
      </div>

      {/* College Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {colleges.map((col, idx) => (
          <div key={idx} className="glass-panel p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Institution #{idx + 1}</span>
                <span className="text-xs font-black text-amber-400">Avg SGPA: {col.avg_sgpa}</span>
              </div>
              <h3 className="text-sm font-extrabold text-white leading-snug">{col.college}</h3>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-800/40">
                <span className="text-[10px] text-slate-400 block">Total</span>
                <strong className="text-white font-bold">{col.total_students}</strong>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/40">
                <span className="text-[10px] text-slate-400 block">Passed</span>
                <strong className="text-emerald-400 font-bold">{col.passed}</strong>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/40">
                <span className="text-[10px] text-slate-400 block">Success %</span>
                <strong className="text-teal-400 font-bold">{col.pass_percentage}%</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
