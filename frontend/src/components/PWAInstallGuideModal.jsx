import React, { useState } from 'react';
import { usePWA } from '../context/PWAContext';
import {
  Monitor,
  Smartphone,
  Apple,
  Download,
  CheckCircle2,
  X,
  ExternalLink,
  Laptop,
  Zap,
  ShieldCheck,
  HardDrive
} from 'lucide-react';

export const PWAInstallGuideModal = () => {
  const { showGuideModal, setShowGuideModal, platform } = usePWA();
  const [activeTab, setActiveTab] = useState(
    platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : 'desktop'
  );

  if (!showGuideModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <Download size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Install VNSGU Result Analyzer
              </h3>
              <p className="text-xs text-teal-400 font-medium">
                Install as a native desktop & mobile app
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowGuideModal(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Benefits bar */}
        <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5 font-medium">
            <Zap size={13} className="text-amber-400 flex-shrink-0" />
            <span>Instant launch</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <HardDrive size={13} className="text-teal-400 flex-shrink-0" />
            <span>Offline caching</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck size={13} className="text-emerald-400 flex-shrink-0" />
            <span>Secure & fast</span>
          </div>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'desktop'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Monitor size={15} />
            <span>Windows / Mac (PC)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'android'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Smartphone size={15} />
            <span>Android</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'ios'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Apple size={15} />
            <span>iPhone / iPad</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 space-y-4">
          {activeTab === 'desktop' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white">Look at your Browser Address Bar</p>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      In Google Chrome, Microsoft Edge, or Brave on Windows or Mac, click the{' '}
                      <strong className="text-teal-300">Install icon</strong> (computer monitor with down arrow) located in the right side of the URL bar.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white">Alternatively, use the Browser Menu</p>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      Click the three dots <strong className="text-slate-100">⋮</strong> at top-right &gt; select{' '}
                      <strong className="text-teal-300">"Save and share"</strong> (or "Apps") &gt; click{' '}
                      <strong className="text-teal-300">"Install SASCMA STERS"</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-950/30 border border-teal-500/30 text-teal-200 text-[11px] flex items-center gap-2">
                <CheckCircle2 size={16} className="text-teal-400 flex-shrink-0" />
                <span>Installed app runs in its own window with desktop shortcut & taskbar pin!</span>
              </div>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white">Open Browser Options</p>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      In Chrome on Android, tap the three dots <strong className="text-white">⋮</strong> in the top-right corner.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white">Select "Install App" or "Add to Home screen"</p>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      Tap <strong className="text-teal-300">"Install app"</strong> or <strong className="text-teal-300">"Add to Home Screen"</strong> and confirm.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-950/30 border border-teal-500/30 text-teal-200 text-[11px] flex items-center gap-2">
                <CheckCircle2 size={16} className="text-teal-400 flex-shrink-0" />
                <span>The app will appear in your phone's app drawer just like an APK!</span>
              </div>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white">Tap the Share Button</p>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      In Safari at the bottom toolbar, tap the <strong className="text-teal-300">Share button (square with arrow pointing up)</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white">Tap "Add to Home Screen"</p>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      Scroll down and tap <strong className="text-teal-300">"Add to Home Screen"</strong>, then tap <strong className="text-teal-300">"Add"</strong> at the top right.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-950/30 border border-teal-500/30 text-teal-200 text-[11px] flex items-center gap-2">
                <CheckCircle2 size={16} className="text-teal-400 flex-shrink-0" />
                <span>Launches full-screen from your iPhone/iPad home screen with native gestures!</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setShowGuideModal(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};
