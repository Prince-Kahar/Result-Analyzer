import React from 'react';
import { useSession } from '../context/SessionContext';
import { EmptyState } from '../components/EmptyState';
import { FileText, FileSpreadsheet, Download } from 'lucide-react';

export const ReportsPage = () => {
  const { activeSessionId, hasUploaded } = useSession();

  const handleDownloadExcel = () => {
    const url = activeSessionId ? `/api/export?format=xlsx&session_id=${activeSessionId}` : '/api/export?format=xlsx';
    window.location.href = url;
  };

  const handleDownloadCsv = () => {
    const url = activeSessionId ? `/api/export?format=csv&session_id=${activeSessionId}` : '/api/export?format=csv';
    window.location.href = url;
  };

  if (!hasUploaded) {
    return (
      <EmptyState
        icon={FileText}
        title="No Reports Available to Export"
        description="Master Excel gazettes and CSV reports are generated dynamically from an uploaded VNSGU Result PDF gazette."
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
            <FileText size={26} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Comprehensive Reports Center</h2>
            <p className="text-xs text-slate-400">Export formatted institutional grade sheets and executive summaries</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Excel Report */}
        <div className="glass-panel p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet size={26} />
            </div>
            <h3 className="text-base font-bold text-white">Master Result Gazette (Excel .xlsx)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete batch records with seat numbers, names, subject components (Internal/External), SGPA, and status with styled headers.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Download size={16} />
            <span>Download Formatted Excel (.xlsx)</span>
          </button>
        </div>

        {/* CSV Report */}
        <div className="glass-panel p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <FileText size={26} />
            </div>
            <h3 className="text-base font-bold text-white">Plain Text Dataset (CSV)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Lightweight standard comma-separated file format for direct import into university ERPs, student information systems, or R/Python.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition-all"
          >
            <Download size={16} />
            <span>Download Dataset (.csv)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
