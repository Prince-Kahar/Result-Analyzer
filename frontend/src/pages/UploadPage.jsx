import React, { useState, useEffect } from 'react';
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
  Check,
  RefreshCw,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copiedLiveUrl, setCopiedLiveUrl] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const { isAuthenticated, user } = useAuth();
  const { setActiveSessionId, refreshSessions } = useSession();
  const navigate = useNavigate();

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLiveCloud = currentHost === 'student-result-analyzer.antideploy.com';
  const isLocalOrLan = !isLiveCloud && (
    currentHost === 'localhost' ||
    currentHost === '127.0.0.1' ||
    currentHost.startsWith('192.') ||
    currentHost.startsWith('10.') ||
    currentHost.startsWith('172.')
  );

  const liveCloudUrl = 'https://student-result-analyzer.antideploy.com/upload';

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError('');
      setResult(null);
      setUploadProgress(0);

      // Verify file readability immediately on mobile
      try {
        if (selectedFile.size === 0) {
          setError('Selected file is 0 bytes. Please select a valid VNSGU result PDF from your device.');
          return;
        }
      } catch (err) {
        setError('Cannot read selected file: ' + err.message);
      }
    }
  };

  const copyLiveUrl = () => {
    navigator.clipboard.writeText(liveCloudUrl);
    setCopiedLiveUrl(true);
    setTimeout(() => setCopiedLiveUrl(false), 2000);
  };

  const clearCacheAndRefresh = () => {
    setIsClearingCache(true);
    setFile(null);
    setError('');
    setProgressText('');
    setUploading(false);
    // Safe, non-destructive reload that preserves browser network & upload pipeline
    setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return setError('Please select a VNSGU Result PDF file');

    setUploading(true);
    setUploadProgress(10);
    setProgressText('Preparing examination PDF...');
    setError('');

    try {
      // Pass file directly into 3-tier resilient upload pipeline
      const res = await api.uploadPdf(file, (percent, loaded, total) => {
        setUploadProgress(percent);
        if (percent < 100) {
          setProgressText(`Uploading: ${percent}% (${formatFileSize(loaded)} / ${formatFileSize(total)})`);
        } else {
          setProgressText('Parsing coordinates & student marks on server...');
        }
      });

      if (res.success) {
        setResult(res);
        setUploadProgress(100);
        setProgressText('Extraction complete! Loading analytics dashboard...');
        if (res.session_id) {
          setActiveSessionId(res.session_id);
          await refreshSessions();
        }
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      console.error('Upload Error:', err);
      setError(err.message || 'Failed to upload and parse PDF. Please check connection.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Mobile Cloud Notice (Displayed if user opened an IP or localhost link on phone) */}
      {isLocalOrLan && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-amber-300">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 flex-shrink-0">
              <Smartphone size={20} />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Opening on Mobile Phone?</p>
              <p className="text-xs text-amber-200/90 mt-0.5">
                You are currently browsing on local address (<span className="font-mono text-white">{currentHost}</span>). Please use the Live Cloud link for direct mobile uploads!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={copyLiveUrl}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition-colors"
            >
              {copiedLiveUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedLiveUrl ? 'Copied!' : 'Copy Link'}</span>
            </button>
            <a
              href={liveCloudUrl}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-md transition-colors"
            >
              <span>Open Live Cloud</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}

      {/* Main Upload Card */}
      <div className="card p-6 sm:p-8 space-y-6 border border-slate-800/80 shadow-2xl relative overflow-hidden bg-slate-900/60 backdrop-blur-xl rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>Upload Examination Gazette</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                v4.0 Ultra-Fast
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Supports official VNSGU tabulated PDF marksheets with instant dual-engine coordinate parsing
            </p>
          </div>

          <button
            type="button"
            onClick={clearCacheAndRefresh}
            disabled={isClearingCache}
            title="Reload newest app version and clear cached files"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors self-start sm:self-auto"
          >
            <RefreshCw size={13} className={isClearingCache ? 'animate-spin text-teal-400' : ''} />
            <span>{isClearingCache ? 'Updating...' : 'Reload App'}</span>
          </button>
        </div>

        {/* Guest vs Logged In Status Banner */}
        <div className="p-3 px-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <UserCheck size={15} className={isAuthenticated ? "text-emerald-400" : "text-teal-400"} />
            <span>
              Mode: <strong className="text-white">{isAuthenticated ? `Faculty (${user?.username || user?.email})` : 'Guest Mode (Instant Open Analytics)'}</strong>
            </span>
          </div>
          {!isAuthenticated && (
            <button
              type="button"
              onClick={() => navigate('/login?redirect=/upload')}
              className="flex items-center gap-1 text-teal-400 hover:text-teal-300 font-bold transition-colors"
            >
              <span>Sign In to save session</span>
              <LogIn size={13} />
            </button>
          )}
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          {/* Dropzone container */}
          <div className="border-2 border-dashed border-slate-700/80 hover:border-teal-500/60 rounded-2xl p-8 text-center transition-colors bg-slate-900/40 group">
            <input
              type="file"
              accept=".pdf,application/pdf"
              id="file-upload"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <UploadCloud size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  {file ? file.name : 'Tap here to choose VNSGU PDF'}
                </p>
                <p className="text-xs text-slate-400">
                  {file ? `File ready: ${formatFileSize(file.size)}` : 'Official VNSGU Gazette format (.pdf up to 100MB)'}
                </p>
              </div>
            </label>
          </div>

          {/* Real-time Progress Bar */}
          {uploading && (
            <div className="space-y-2.5 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-teal-300 flex items-center gap-1.5">
                  <RefreshCw size={13} className="animate-spin text-teal-400" />
                  <span>{progressText}</span>
                </span>
                <span className="font-mono text-slate-200 font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-400 h-3 rounded-full transition-all duration-200 shadow-lg"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Error Message with 1-Click Refresh Fix */}
          {error && (
            <div className="flex flex-col gap-2.5 p-4 text-xs bg-rose-500/15 border border-rose-500/40 text-rose-200 rounded-2xl">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="flex-shrink-0 text-rose-400 mt-0.5" />
                <div className="leading-relaxed flex-1">
                  <p className="font-bold text-white text-sm">Upload Notice</p>
                  <p className="mt-1 text-rose-200">{error}</p>
                </div>
              </div>
              <div className="pt-2.5 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-300">If using mobile, update to freshest version:</span>
                <button
                  type="button"
                  onClick={clearCacheAndRefresh}
                  className="flex items-center gap-1 px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800/80 text-rose-100 font-bold rounded-lg border border-rose-500/40 transition-colors"
                >
                  <RefreshCw size={12} />
                  <span>Clear Cache & Reload App</span>
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Extracting & Processing Marks...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Parse & Analyze Result</span>
              </>
            )}
          </button>
        </form>

        {/* Parsing Success Details */}
        {result && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-200">
              <CheckCircle2 size={16} />
              <span>Result Gazette Parsed Successfully!</span>
            </div>
            <p className="text-slate-300">
              Extracted <strong className="text-white">{result.details?.total_students}</strong> students for{' '}
              <strong className="text-white">{result.details?.course}</strong> ({result.details?.semester}).
            </p>
            <p className="text-[11px] text-emerald-400">
              Redirecting to Academic Analytics Dashboard...
            </p>
          </div>
        )}

        {/* Feature badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/30 border border-slate-800">
            <ShieldCheck size={16} className="text-teal-400" />
            <span>Dual Python/Node Engine</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/30 border border-slate-800">
            <Smartphone size={16} className="text-teal-400" />
            <span>Mobile & Desktop PWA</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/30 border border-slate-800">
            <Sparkles size={16} className="text-teal-400" />
            <span>Multi-Tier Upload Fallback</span>
          </div>
        </div>
      </div>
    </div>
  );
};
