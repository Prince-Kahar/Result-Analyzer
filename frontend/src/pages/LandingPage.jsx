import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Rocket,
  ShieldCheck,
  Zap,
  BarChart3,
  Award,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  Headphones,
  ArrowRight,
  UploadCloud,
  QrCode,
  FileText
} from 'lucide-react';

export const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-16 py-8 px-4 sm:px-8 max-w-6xl mx-auto">
      {/* Hero Section */}
      <section className="text-center py-12 sm:py-20 space-y-6 relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold tracking-wide animate-pulse">
          <Zap size={14} />
          <span>Next-Generation VNSGU Academic Intelligence</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
          Transform Raw PDF Marksheets Into{' '}
          <span className="bg-gradient-to-r from-teal-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
            Instant Insights
          </span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto font-medium">
          The ultimate examination analysis engine built specifically for Veer Narmad South Gujarat University.
          Extract marks, compute merit ranks, diagnose ATKT backlogs, and verify credentials in seconds.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
          <button
            type="button"
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
            className="flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-500/25 transition-all transform hover:-translate-y-0.5"
          >
            <Rocket size={18} />
            <span>{isAuthenticated ? 'Open Executive Dashboard' : 'Get Started & Sign In'}</span>
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/upload')}
            className="flex items-center gap-2 px-7 py-3.5 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm rounded-xl transition-all"
          >
            <UploadCloud size={18} className="text-teal-400" />
            <span>Upload VNSGU Marksheet</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Live Metrics Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-8 max-w-3xl mx-auto text-left">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-2xl sm:text-3xl font-black text-teal-400">100%</span>
            <p className="text-xs text-slate-400 font-medium mt-1">Live Dynamic Data</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-2xl sm:text-3xl font-black text-sky-400">&lt; 1s</span>
            <p className="text-xs text-slate-400 font-medium mt-1">Merit Computation</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-2xl sm:text-3xl font-black text-indigo-400">7+</span>
            <p className="text-xs text-slate-400 font-medium mt-1">VNSGU Colleges</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">Cloud</span>
            <p className="text-xs text-slate-400 font-medium mt-1">Supabase DB</p>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Full-Spectrum Academic Operations</h2>
          <p className="text-xs sm:text-sm text-slate-400">Everything departmental heads, professors, and administrative officers need.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass-panel p-6 space-y-3 border-teal-500/20">
            <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <BarChart3 size={22} />
            </div>
            <h3 className="text-base font-bold text-white">Automated PDF Parsing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Python coordinate parser analyzes multi-page VNSGU gazettes and extracts every student, seat number, subject mark, and SGPA directly into Supabase.
            </p>
          </div>

          <div className="glass-panel p-6 space-y-3 border-sky-500/20">
            <div className="w-11 h-11 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Award size={22} />
            </div>
            <h3 className="text-base font-bold text-white">Merit Leaderboard & Backlogs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant university-wide rank list computation, Gold Medalist identification, and granular ATKT backlog tracking across all enrolled colleges.
            </p>
          </div>

          <div className="glass-panel p-6 space-y-3 border-indigo-500/20">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <ShieldCheck size={22} />
            </div>
            <h3 className="text-base font-bold text-white">Public QR Verification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cryptographically verified marksheet transcripts with scannable QR codes for employers, university bodies, and accreditation inspection.
            </p>
          </div>
        </div>
      </section>

      {/* Workflow Process Banner */}
      <section className="p-8 glass-panel border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/60 to-slate-950 space-y-6">
        <div className="text-center space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400">Streamlined Workflow</span>
          <h3 className="text-xl font-bold text-white">From Marksheet PDF to Intelligence in 3 Steps</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-full bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center mx-auto text-sm">1</div>
            <h4 className="text-sm font-bold text-white">Sign In & Access</h4>
            <p className="text-xs text-slate-400">Authenticate securely via your institutional account or authorized credentials.</p>
          </div>
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center mx-auto text-sm">2</div>
            <h4 className="text-sm font-bold text-white">Upload VNSGU PDF</h4>
            <p className="text-xs text-slate-400">Upload your examination gazette. The Python worker extracts records into Supabase in seconds.</p>
          </div>
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center mx-auto text-sm">3</div>
            <h4 className="text-sm font-bold text-white">Instant Dashboard</h4>
            <p className="text-xs text-slate-400">Explore interactive KPIs, grade distribution, subject diagnostics, and merit ranks.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
