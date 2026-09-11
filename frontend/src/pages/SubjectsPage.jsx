import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { EmptyState } from '../components/EmptyState';
import { BookOpen, Activity, AlertCircle, CheckCircle2, Flame } from 'lucide-react';

export const SubjectsPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const { activeSessionId, hasUploaded } = useSession();

  useEffect(() => {
    const fetchSubs = async () => {
      if (!hasUploaded && !activeSessionId) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeSessionId) params.append('session_id', activeSessionId);

        const res = await api.getSubjects(params.toString());
        if (res.success) {
          setSubjects(res.subjects || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubs();
  }, [activeSessionId]);

  if (!loading && (!hasUploaded || subjects.length === 0)) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No Subject Diagnostics Found"
        description="Subject failure indices, grade curves, and difficulty ratings are compiled exclusively from an uploaded VNSGU Result PDF gazette."
        actionLabel="Upload VNSGU Result PDF"
        actionPath="/upload"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 glass-panel flex items-center justify-between border-teal-500/20 bg-teal-500/5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
            <BookOpen size={26} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Subject-Wise Diagnostic Matrix</h2>
            <p className="text-xs text-slate-400">Institutional pass percentages, grade curves, and syllabus difficulty metrics</p>
          </div>
        </div>
      </div>

      {/* Grid of Subject Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((sub, idx) => (
          <div key={idx} className="glass-panel p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Subject #{sub.subject_index + 1}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                  sub.difficulty_rating > 6
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  <Flame size={12} />
                  <span>Difficulty: {sub.difficulty_rating}/10</span>
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-white mt-1 leading-snug">{sub.subject_name}</h3>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Pass Percentage</span>
                <span className={sub.pass_percentage >= 70 ? 'text-emerald-400' : 'text-amber-400'}>
                  {sub.pass_percentage}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${sub.pass_percentage >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, sub.pass_percentage)}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-800/40">
                <span className="text-[10px] text-slate-400 block">Avg Marks</span>
                <strong className="text-white font-bold">{sub.avg_mark}</strong>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/40">
                <span className="text-[10px] text-slate-400 block">Highest</span>
                <strong className="text-teal-400 font-bold">{sub.highest_mark}</strong>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/40">
                <span className="text-[10px] text-slate-400 block">Failed</span>
                <strong className="text-rose-400 font-bold">{sub.failed}</strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic bg-slate-900/50 p-2 rounded-lg border border-slate-800">
              💡 {sub.recommendation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
