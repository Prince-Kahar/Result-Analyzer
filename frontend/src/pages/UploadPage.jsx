import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { UploadCloud, CheckCircle2, AlertCircle, ArrowRight, Lock, LogIn } from 'lucide-react';

export const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { isAuthenticated } = useAuth();
  const { setActiveSessionId, refreshSessions } = useSession();
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return setError('Please select a VNSGU Result PDF file');

    // Strict Authentication Check: Block upload if not signed in
    if (!isAuthenticated) {
      setError('Login Required: Please sign in to your account before parsing and analyzing examination results.');
      setShowAuthModal(true);
      return;
    }

    setUploading(true);
    setProgressText('Uploading and analyzing marksheet coordinates with Python parser...');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.uploadPdf(formData);
      if (res.success) {
        setResult(res);
        if (res.session_id) {
          setActiveSessionId(res.session_id);
          await refreshSessions();
        }
        // Auto-redirect to dashboard after brief celebration
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload and parse PDF');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-white">Upload VNSGU Examination PDF</h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Upload official multi-page university result gazette to extract students, internal/external marks, and SGPA.
        </p>
      </div>

      <div className="glass-panel p-6 sm:p-8 space-y-6">
        <form onSubmit={handleUpload} className="space-y-6">
          {/* Dropzone container */}
          <div className="border-2 border-dashed border-slate-700/80 hover:border-teal-500/60 rounded-2xl p-8 text-center transition-colors bg-slate-900/30">
            <input
              type="file"
              accept=".pdf"
              id="file-upload"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                <UploadCloud size={30} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  {file ? file.name : 'Click to select or drag & drop VNSGU PDF'}
                </p>
                <p className="text-xs text-slate-400">Supported format: .pdf (Official Gazette up to 50MB)</p>
              </div>
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isAuthenticated && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <Lock size={15} className="text-amber-400 flex-shrink-0" />
                <span>Authentication required: Please sign in to parse and analyze result gazettes.</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login?redirect=/upload')}
                className="font-bold underline text-amber-200 hover:text-white flex items-center gap-1"
              >
                <span>Sign In</span>
                <ArrowRight size={12} />
              </button>
            </div>
          )}

          {uploading && (
            <div className="space-y-2 p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-center">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-semibold text-teal-400">{progressText}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
          >
            {uploading ? 'Analyzing Marksheet...' : 'Parse & Analyze'}
          </button>
        </form>

        {/* Successful Summary Card */}
        {result && (
          <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-400">
              <CheckCircle2 size={22} />
              <h3 className="text-sm font-bold">Extraction & Database Sync Complete</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Course</span>
                <strong className="text-white">{result.details?.course}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Semester</span>
                <strong className="text-white">{result.details?.semester}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Total Extracted</span>
                <strong className="text-teal-300 text-sm">{result.details?.total_students} Students</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
            >
              <span>View in Dashboard</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Authentication Required Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel max-w-md w-full p-6 space-y-5 border border-slate-700 shadow-2xl relative">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Lock size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Login Required</h3>
                <p className="text-xs text-slate-400">Authentication required to process results</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You must be signed in to parse and analyze examination PDFs. Please log in with your staff or administrator account to proceed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => navigate('/login?redirect=/upload')}
                className="px-5 py-2 text-xs font-bold text-white rounded-xl bg-teal-600 hover:bg-teal-500 shadow-lg shadow-teal-500/20 transition-all flex items-center gap-1.5"
              >
                <span>Sign In to Continue</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
