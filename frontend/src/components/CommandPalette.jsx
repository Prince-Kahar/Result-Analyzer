import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, LayoutDashboard, Upload, Award, AlertTriangle, BookOpen, Building2, FileCheck2, Radar, HelpCircle, FileText, Settings, ShieldCheck } from 'lucide-react';

export const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const actions = [
    { label: 'Executive Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Upload VNSGU PDF Marks', path: '/upload', icon: Upload },
    { label: 'Student Lookup & Search', path: '/lookup', icon: Search },
    { label: 'Toppers & Merit Lists', path: '/toppers', icon: Award },
    { label: 'Backlogs & ATKT Students', path: '/failed', icon: AlertTriangle },
    { label: 'Subject Diagnostics & AI Difficulty', path: '/subjects', icon: BookOpen },
    { label: 'College Rank Comparison', path: '/colleges', icon: Building2 },
    { label: 'Certificate & Marksheet Studio', path: '/certificates', icon: FileCheck2 },
    { label: 'Academic Risk Radar', path: '/risk-radar', icon: Radar },
    { label: 'Reports Center (Excel / CSV)', path: '/reports', icon: FileText },
    { label: 'Public Credential Verification', path: '/verify', icon: ShieldCheck },
    { label: 'Help Desk & Support Tickets', path: '/helpdesk', icon: HelpCircle },
    { label: 'Settings & Branding Config', path: '/settings', icon: Settings },
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onClose ? onClose() : null;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const filtered = actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 border-b border-slate-800">
          <Search size={18} className="text-teal-400 mr-3" />
          <input
            type="text"
            placeholder="Search views, analytics, or actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full py-3.5 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.length > 0 ? (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors text-left"
                >
                  <Icon size={16} className="text-teal-400" />
                  <span>{item.label}</span>
                </button>
              );
            })
          ) : (
            <p className="text-center text-xs text-slate-400 py-6">No matching actions found</p>
          )}
        </div>
      </div>
    </div>
  );
};
