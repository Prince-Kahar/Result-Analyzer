import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { UploadCloud, CheckCircle2, AlertCircle, ArrowRight, UserCheck, LogIn, FileText } from 'lucide-react';

export const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const { isAuthenticated, user } = useAuth();
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

    setUploading(true);
    setProgressText('Uploading and analyzing marksheet coordinates with dual-engine parser...');
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
        {/* User context badge */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <UserCheck size={16} className="text-teal-400" />
            <span className="text-slate-300 font-medium">
              Uploading as:{' '}
              <strong className="text-white">
                {isAuthenticated ? user?.username : 'Faculty Guest'}
              </strong>
            </span>
          </div>
          {!isAuthenticated && (
            <button
              type="button"
              onClick={() => navigate('/login?redirect=/upload')}
              className="flex items-center gap-1 text-teal-400 hover:text-teal-300 font-bold transition-colors"
            >
              <span>Sign In to save to account</span>
              <LogIn size={13} />
            </button>
          )}
        </div>

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

          {uploading && (
            <div className="space-y-2 p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-center">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-semibold text-teal-400">{progressText}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FileText size={16} />
            <span>{uploading ? 'Analyzing Marksheet...' : 'Parse & Analyze Result'}</span>
          </button>
        </form>

        {/* Successful Summary Card */}
        {result && (
          <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-4 animate-fadeIn">
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
    </div>
  );
};
