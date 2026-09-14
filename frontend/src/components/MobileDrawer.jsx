import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  X,
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
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

export const MobileDrawer = ({ isOpen, onClose }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.username === 'sascma_admin';
  const location = useLocation();
  const navigate = useNavigate();

  if (!isOpen) return null;

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

    ...(isAdmin ? [
      { section: 'Administration' },
      { path: '/admin', label: 'Admin Console', icon: ShieldAlert },
    ] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in select-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Drawer panel */}
      <div className="relative w-72 max-w-[85vw] bg-slate-900/95 border-r border-slate-800 p-4 flex flex-col justify-between h-full z-10 shadow-2xl backdrop-blur-xl">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80">
            <div 
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => {
                navigate('/dashboard');
                onClose();
              }}
            >
              <img src="/assets/logo.png" alt="SASCMA" className="w-8 h-8 rounded-lg object-contain shadow" />
              <div>
                <h3 className="text-sm font-extrabold text-white leading-tight">SASCMA STERS</h3>
                <span className="text-[10px] text-teal-400 font-semibold">Result Intelligence</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
              title="Close Menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Nav items list */}
          <nav className="space-y-1 overflow-y-auto flex-1 pr-1 py-1">
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
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-500/20 to-teal-500/5 text-teal-300 border border-teal-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-teal-400' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        {isAuthenticated && (
          <div className="pt-3 border-t border-slate-800/80 mt-2">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors"
            >
              <LogOut size={16} />
              <span>Logout ({user?.username})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
