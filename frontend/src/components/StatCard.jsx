import React from 'react';

export const StatCard = ({ title, value, subtext, icon: Icon, color = 'teal', trend }) => {
  const colorMap = {
    teal: { bg: 'from-teal-500/15 to-teal-500/5', border: 'border-teal-500/25', icon: 'text-teal-400', badge: 'bg-teal-500/10 text-teal-300' },
    blue: { bg: 'from-sky-500/15 to-sky-500/5', border: 'border-sky-500/25', icon: 'text-sky-400', badge: 'bg-sky-500/10 text-sky-300' },
    emerald: { bg: 'from-emerald-500/15 to-emerald-500/5', border: 'border-emerald-500/25', icon: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-300' },
    amber: { bg: 'from-amber-500/15 to-amber-500/5', border: 'border-amber-500/25', icon: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-300' },
    rose: { bg: 'from-rose-500/15 to-rose-500/5', border: 'border-rose-500/25', icon: 'text-rose-400', badge: 'bg-rose-500/10 text-rose-300' },
  };

  const scheme = colorMap[color] || colorMap.teal;

  return (
    <div className={`glass-panel p-4 sm:p-5 relative overflow-hidden bg-gradient-to-br ${scheme.bg} ${scheme.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-none">{value}</h3>
          {subtext && <p className="text-xs text-slate-400 mt-1.5 font-medium">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-slate-900/50 border border-slate-700/50 ${scheme.icon}`}>
          {Icon && <Icon size={22} />}
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};
