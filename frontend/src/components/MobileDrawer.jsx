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
  ShieldCheck
} from 'lucide-react';

export const MobileDrawer = ({ isOpen, onClose }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const navItems = [
    { path: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { path: '/upload', label: 'Upload VNSGU PDF', icon: Upload },
    { path: '/lookup', label: 'Student Lookup', icon: Search },
    { path: '/toppers', label: 'Merit & Toppers', icon: Award },
    { path: '/failed', label: 'Backlogs & ATKT', icon: AlertTriangle },
    { path: '/subjects', label: 'Subject Diagnostics', icon: BookOpen },
    { path: '/colleges', label: 'College Ranks', icon: Building2 },
    { path: '/certificates', label: 'Certificate Studio', icon: FileCheck2 },
    { path: '/risk-radar', label: 'Academic Risk Radar', icon: Radar },
    { path: '/reports', label: 'Reports Center', icon: FileText },
    { path: '/verify', label: 'Public Credential QR', icon: ShieldCheck },
    { path: '/helpdesk', label: 'Help Desk Tickets', icon: HelpCircle },
    { path: '/settings', label: 'Settings & Branding', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>

      {/* Drawer panel */}
      <div className="relative w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <img src="/assets/logo.png" alt="SASCMA" className="w-8 h-8 rounded-lg" />
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">SASCMA STERS</h3>
                <span className="text-[10px] text-teal-400 font-semibold">Result Analyzer</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>

          {/* Nav items */}
          <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                    isActive
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-teal-400' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        {isAuthenticated && (
          <div className="pt-3 border-t border-slate-800">
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
