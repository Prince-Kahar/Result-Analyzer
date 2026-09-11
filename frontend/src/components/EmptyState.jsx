import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = UploadCloud,
  title = "No Examination Result Uploaded Yet",
  description = "Please upload an official VNSGU Result PDF gazette to unlock live student analytics, merit ranks, and diagnostics.",
  actionLabel = "Upload VNSGU Result PDF",
  actionPath = "/upload"
}) => {
  const navigate = useNavigate();

  return (
    <div className="py-12 px-4 max-w-xl mx-auto text-center space-y-6">
      <div className="glass-panel p-8 sm:p-10 space-y-5 border-teal-500/20">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto shadow-inner">
          <Icon size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-white">{title}</h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(actionPath)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all transform hover:-translate-y-0.5"
        >
          <UploadCloud size={16} />
          <span>{actionLabel}</span>
        </button>
      </div>
    </div>
  );
};
