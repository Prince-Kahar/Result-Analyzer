import { cleanStudentName } from '../utils/studentUtils';
import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { EmptyState } from '../components/EmptyState';
import { Award, Trophy, Medal } from 'lucide-react';
import confetti from 'canvas-confetti';

export const ToppersPage = () => {
  const [toppers, setToppers] = useState([]);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);

  const { activeSessionId, hasUploaded } = useSession();

  const fetchToppers = async () => {
    if (!hasUploaded && !activeSessionId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeSessionId) params.append('session_id', activeSessionId);
      params.append('n', limit);

      const res = await api.getToppers(params.toString());
      if (res.success) {
        setToppers(res.toppers || []);
        if (res.toppers && res.toppers.length > 0) {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToppers();
  }, [activeSessionId, limit]);

  const getRankBadge = (rank) => {
    if (rank === 1) return <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40"><Trophy size={18} /></span>;
    if (rank === 2) return <span className="p-2 rounded-xl bg-slate-300/20 text-slate-200 border border-slate-300/40"><Medal size={18} /></span>;
    if (rank === 3) return <span className="p-2 rounded-xl bg-amber-700/20 text-amber-500 border border-amber-700/40"><Medal size={18} /></span>;
    return <span className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs">#{rank}</span>;
  };

  if (!loading && (!hasUploaded || toppers.length === 0)) {
    return (
      <EmptyState
        icon={Trophy}
        title="No Toppers / Merit List Available"
        description="Merit rankings and topper leaderboards are compiled exclusively from uploaded VNSGU Result PDF gazettes. Please upload a PDF first."
        actionLabel="Upload VNSGU Result PDF"
        actionPath="/upload"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 glass-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-transparent border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Trophy size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">University Merit & Topper Leaderboard</h2>
            <p className="text-xs text-slate-400">Veer Narmad South Gujarat University Examination Ranks</p>
          </div>
        </div>

        {/* Top N Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Show Top:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
          >
            <option value="10">Top 10</option>
            <option value="25">Top 25</option>
            <option value="50">Top 50</option>
          </select>
        </div>
      </div>

      {/* Topper Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {toppers.slice(0, 3).map((top) => (
          <div
            key={top.id}
            className="glass-panel p-5 relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-slate-900/40 to-slate-900/80 flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Rank #{top.rank}</span>
                <h3 className="text-base font-extrabold text-white">{cleanStudentName(top.name)}</h3>
                <p className="text-xs text-slate-400 font-mono">Seat: {top.seat_no}</p>
              </div>
              {getRankBadge(top.rank)}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-center">
              <div className="p-2 rounded-lg bg-slate-800/40">
                <span className="text-[10px] text-slate-400 block">Percentage</span>
                <strong className="text-base font-black text-amber-300">{top.percentage}%</strong>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/40">
                <span className="text-[10px] text-slate-400 block">SGPA</span>
                <strong className="text-base font-black text-sky-400">{top.sgpa}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full Leaderboard Table */}
      <div className="glass-panel overflow-hidden">
        <div className="responsive-table-wrapper">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3 text-center">Rank</th>
                <th className="p-3">Seat No</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">College</th>
                <th className="p-3 text-center">Marks</th>
                <th className="p-3 text-center">Percentage</th>
                <th className="p-3 text-center">SGPA</th>
                <th className="p-3 text-center">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {toppers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/30">
                  <td className="p-3 text-center">{getRankBadge(t.rank)}</td>
                  <td className="p-3 font-mono font-bold text-white">{t.seat_no}</td>
                  <td className="p-3 text-slate-200 font-bold">{cleanStudentName(t.name)}</td>
                  <td className="p-3 text-slate-400">{t.college}</td>
                  <td className="p-3 text-center font-bold text-white">{t.total_marks}</td>
                  <td className="p-3 text-center font-black text-amber-400">{t.percentage}%</td>
                  <td className="p-3 text-center font-black text-sky-400">{t.sgpa}</td>
                  <td className="p-3 text-center font-bold text-teal-400">{t.overall_grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
