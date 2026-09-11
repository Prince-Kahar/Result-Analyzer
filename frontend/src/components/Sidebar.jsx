import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Upload,
  Search,
  Award,
  AlertTriangle,
  BookOpen,
  Building2,
  FileCheck2,
  Radar,
  HelpCircle,
  FileText,
  Settings,
  LogOut,
  ShieldCheck
} from 'lucide-react';

export const Sidebar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { section: 'Overview' },
    { path: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { path: '/upload', label: 'Upload VNSGU PDF', icon: Upload },

    { section: 'Analytics' },
    { path: '/lookup', label: 'Student Lookup', icon: Search },
    { path: '/toppers', label: 'Merit & Toppers', icon: Award },
    { path: '/failed', label: 'Backlogs & ATKT', icon: AlertTriangle },
    { path: '/subjects', label: 'Subject Diagnostics', icon: BookOpen },
    { path: '/colleges', label: 'College Ranks', icon: Building2 },

    { section: 'Credentials & Reports' },
    { path: '/certificates', label: 'Certificate Studio', icon: FileCheck2 },
    { path: '/risk-radar', label: 'Academic Risk Radar', icon: Radar },
    { path: '/reports', label: 'Reports Center', icon: FileText },
    { path: '/verify', label: 'Public Credential QR', icon: ShieldCheck },

    { section: 'Support & Config' },
    { path: '/helpdesk', label: 'Help Desk Tickets', icon: HelpCircle },
    { path: '/settings', label: 'Settings & Branding', icon: Settings },
  ];

  return (
    <aside className="sidebar-desktop p-4 flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 px-2 py-3 mb-4 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors"
          title="VNSGU Academic Intelligence"
        >
          <img src="/assets/logo.png" alt="SASCMA" className="w-9 h-9 rounded-lg object-contain shadow-md" />
          <div className="leading-tight">
            <h2 className="text-sm font-extrabold text-white tracking-wide">SASCMA STERS</h2>
            <p className="text-[11px] text-teal-400 font-semibold">Result Intelligence</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-190px)] pr-1">
          {navItems.map((item, idx) => {
            if (item.section) {
              return (
                <div key={idx} className="pt-3 pb-1 px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {item.section}
                </div>
              );
            }
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500/20 to-teal-500/5 text-teal-300 border border-teal-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-teal-400' : 'text-slate-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer / Logout */}
      {isAuthenticated && (
        <div className="pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-200 truncate">{user?.username}</p>
                <p className="text-[10px] text-teal-400 font-medium truncate">{user?.college_name || 'VNSGU Faculty'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
