import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, Search, Menu, LogIn } from 'lucide-react';

export const Navbar = ({ onOpenMenu, onOpenSearch }) => {
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const titleMap = {
    '/dashboard': 'Executive Dashboard',
    '/upload': 'Upload VNSGU Examination PDF',
    '/lookup': 'Student Lookup & Search',
    '/toppers': 'Merit & Toppers Leaderboard',
    '/failed': 'Backlogs & ATKT Analysis',
    '/subjects': 'Subject Diagnostics & AI Matrix',
    '/colleges': 'College Rank Benchmarking',
    '/certificates': 'Certificate & Marksheet Studio',
    '/risk-radar': 'Academic Risk Radar',
    '/reports': 'Reports Center (Excel / CSV)',
    '/verify': 'Public Credential QR Verification',
    '/helpdesk': 'Help Desk & Support Tickets',
    '/settings': 'Institutional Configuration',
    '/login': 'Authentication Portal'
  };

  const currentTitle = titleMap[location.pathname] || 'Result Intelligence';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl transition-all duration-200">
      {/* Left: Mobile Toggle & Brand/View title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          className="md:hidden hamburger-btn p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          title="Open Menu"
        >
          <Menu size={22} />
        </button>

        <div className="flex items-center gap-2.5">
          <img src="/assets/logo.png" alt="SASCMA Logo" className="w-8 h-8 rounded-lg object-contain drop-shadow" />
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-tight">
              {currentTitle}
            </h1>
            <p className="text-[11px] text-teal-400 font-semibold tracking-wider uppercase hidden sm:block">
              Veer Narmad South Gujarat University
            </p>
          </div>
        </div>
      </div>

      {/* Right: Search, Theme, Auth */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Search Ctrl+K trigger */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 rounded-lg transition-colors"
        >
          <Search size={14} className="text-teal-400" />
          <span className="hidden md:inline">Quick Search</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-700/50 text-slate-300 rounded border border-slate-600/50">
            Ctrl K
          </kbd>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg transition-colors"
          title="Toggle Light/Dark Theme"
        >
          {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-teal-400" />}
        </button>

        {/* Auth status chip */}
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 pl-2 pr-3 py-1 text-xs font-semibold bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center text-white text-[11px] font-bold">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="max-w-[90px] truncate hidden sm:inline">{user?.username}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded-lg shadow-sm shadow-teal-500/20 transition-all"
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
