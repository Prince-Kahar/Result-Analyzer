import React, { createContext, useContext, useState, useEffect } from 'react';

const PWAContext = createContext(null);

export const PWAProvider = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [platform, setPlatform] = useState('desktop');

  useEffect(() => {
    // 1. Standalone check across Desktop & Mobile
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);
    };

    checkStandalone();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', checkStandalone);
    }

    // 2. Platform identification
    const ua = (window.navigator.userAgent || '').toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform('ios');
    } else if (/android/.test(ua)) {
      setPlatform('android');
    } else if (/win/.test(ua)) {
      setPlatform('windows');
    } else if (/mac/.test(ua)) {
      setPlatform('mac');
    } else {
      setPlatform('desktop');
    }

    // 3. Listen for native browser prompt trigger (Desktop Chrome/Edge/Brave & Mobile Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('PWA beforeinstallprompt captured on', platform);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. App installed callback
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('PWA installed successfully');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', checkStandalone);
      }
    };
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setIsInstallable(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Install prompt error:', err);
        setShowGuideModal(true);
      }
    } else {
      // If browser doesn't expose beforeinstallprompt (Safari, Firefox, already prompted, etc.)
      setShowGuideModal(true);
    }
  };

  return (
    <PWAContext.Provider
      value={{
        isInstalled,
        isInstallable,
        platform,
        promptInstall,
        showGuideModal,
        setShowGuideModal,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};
