import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SessionProvider } from './context/SessionContext';
import { PWAProvider, usePWA } from './context/PWAContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileDrawer } from './components/MobileDrawer';
import { CommandPalette } from './components/CommandPalette';
import { PWAInstallGuideModal } from './components/PWAInstallGuideModal';
import { Download, Monitor, Smartphone } from 'lucide-react';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { LookupPage } from './pages/LookupPage';
import { ToppersPage } from './pages/ToppersPage';
import { FailedPage } from './pages/FailedPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { CollegesPage } from './pages/CollegesPage';
import { CertificatesPage } from './pages/CertificatesPage';
import { RiskRadarPage } from './pages/RiskRadarPage';
import { ReportsPage } from './pages/ReportsPage';
import { VerifyPage } from './pages/VerifyPage';
import { HelpDeskPage } from './pages/HelpDeskPage';
import { SettingsPage } from './pages/SettingsPage';

function AppLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isInstalled, promptInstall, platform } = usePWA();

  // Landing Page: Full-screen presentation mode without inner app sidebar
  if (location.pathname === '/') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-x-hidden">
        <div className="ambient-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>
        
        {/* Landing Top Navigation Bar */}
        <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/70 border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/assets/logo.png" alt="SASCMA" className="w-9 h-9 rounded-xl object-contain shadow-md" />
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-wide leading-tight">SASCMA STERS</h1>
              <p className="text-[10px] text-teal-400 font-semibold tracking-wider">VNSGU Result Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {!isInstalled && (
              <button
                onClick={promptInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-xl transition-all"
              >
                {platform === 'ios' || platform === 'android' ? (
                  <Smartphone size={14} className="text-teal-400" />
                ) : (
                  <Monitor size={14} className="text-teal-400" />
                )}
                <span>{platform === 'ios' || platform === 'android' ? 'Install App' : 'Install Desktop App'}</span>
              </button>
            )}

            <button
              onClick={() => navigate('/verify')}
              className="hidden sm:inline-flex text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              Verify QR
            </button>
            <button
              onClick={() => navigate('/helpdesk')}
              className="hidden sm:inline-flex text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              Help Desk
            </button>
            <button
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-500/20 transition-all transform hover:-translate-y-0.5"
            >
              {isAuthenticated ? 'Open Dashboard' : 'Sign In / Register'}
            </button>
          </div>
        </header>

        <main className="flex-1">
          <LandingPage />
        </main>

        <footer className="py-6 px-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} SASCMA STERS Academic Intelligence. Veer Narmad South Gujarat University.</p>
        </footer>

        {/* Global PWA Install Guide Modal */}
        <PWAInstallGuideModal />
      </div>
    );
  }

  // Internal App Workspace Layout
  return (
    <div className="app-container">
      {/* Background Animated Blobs */}
      <div className="ambient-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Desktop Sidebar (hidden on mobile/tablet) */}
      <Sidebar />

      {/* Mobile Drawer (visible on small screens) */}
      <MobileDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />

      {/* Command Palette (Ctrl + K) */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar
          onOpenMenu={() => setIsMenuOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/lookup" element={<LookupPage />} />
            <Route path="/toppers" element={<ToppersPage />} />
            <Route path="/failed" element={<FailedPage />} />
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/colleges" element={<CollegesPage />} />
            <Route path="/certificates" element={<CertificatesPage />} />
            <Route path="/risk-radar" element={<RiskRadarPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/helpdesk" element={<HelpDeskPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global PWA Install Guide Modal */}
      <PWAInstallGuideModal />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SessionProvider>
            <PWAProvider>
              <AppLayout />
            </PWAProvider>
          </SessionProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
