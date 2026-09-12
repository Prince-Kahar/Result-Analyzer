import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UserCheck,
  LogIn,
  FileText,
  Smartphone,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

export const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copiedLiveUrl, setCopiedLiveUrl] = useState(false);

  const { isAuthenticated, user } = useAuth();
  const { setActiveSessionId, refreshSessions } = useSession();
  const navigate = useNavigate();

  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const liveCloudUrl = 'https://student-result-analyzer.antideploy.com/upload';

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError('');
      setResult(null);
      setUploadProgress(0);
    }
  };

  const copyLiveUrl = () => {
    navigator.clipboard.writeText(liveCloudUrl);
    setCopiedLiveUrl(true);
    setTimeout(() => setCopiedLiveUrl(false), 2000);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return setError('Please select a VNSGU Result PDF file');

    setUploading(true);
    setUploadProgress(0);
    setProgressText('Preparing examination PDF...');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.uploadPdf(formData, (percent, loaded, total) => {
        setUploadProgress(percent);
        if (percent < 100) {
          setProgressText(`Uploading: ${percent}% (${formatFileSize(loaded)} / ${formatFileSize(total)})`);
        } else {
          setProgressText('Processing marksheet coordinates & extracting students on server...');
        }
      });

      if (res.success) {
        setResult(res);
        if (res.session_id) {
          setActiveSessionId(res.session_id);
          await refreshSessions();
        }
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      console.error('Upload Error:', err);
      setError(err.message || 'Failed to upload and parse PDF. Please check network connection.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Mobile Cloud Notice (Only visible when user is testing on local machine) */}
      {isLocalhost && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-950/50 via-slate-900 to-slate-900 border border-teal-500/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-teal-300">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 flex-shrink-0">
              <Smartphone size={18} />
            </div>
            <div>
              <p className="font-bold text-white leading-tight">Using on your Mobile Phone?</p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                On your phone, open the live cloud website instead of localhost for 1-click uploads!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={copyLiveUrl}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg border border-slate-700 transition-colors"
            >
              {copiedLiveUrl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copiedLiveUrl ? 'Copied!' : 'Copy Link'}</span>
            </button>
            <a
              href={liveCloudUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg transition-colors"
            >
              <span>Live Cloud</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      )}

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
              accept=".pdf,application/pdf"
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
                  {file ? file.name : 'Tap to choose or drag & drop VNSGU PDF'}
                </p>
                <p className="text-xs text-slate-400">
                  {file ? `File selected: ${formatFileSize(file.size)}` : 'Supported format: .pdf (Official Gazette up to 50MB)'}
                </p>
              </div>
            </label>
          </div>

          {/* Real-time Progress Bar */}
          {uploading && (
            <div className="space-y-2 p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-teal-400">{progressText}</span>
                <span className="font-mono text-slate-300 font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-teal-500 to-emerald-400 h-2.5 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col gap-2 p-3.5 text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-bold">Upload Failed</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
              {isLocalhost && (
                <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between">
                  <span className="text-[11px] text-rose-200">Tip: If testing on mobile, use live cloud address:</span>
                  <a
                    href={liveCloudUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline text-white hover:text-teal-200"
                  >
                    Open Live Cloud Site
                  </a>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FileText size={16} />
            <span>{uploading ? 'Processing Marksheet...' : 'Parse & Analyze Result'}</span>
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
