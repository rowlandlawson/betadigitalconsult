'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { SVGProps } from 'react';
import { Button } from './ui/button';
import { X as XIcon } from 'lucide-react';

// Lightweight Download icon
const Download = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type OSType =
  | 'windows'
  | 'mac'
  | 'ios'
  | 'android'
  | 'chromeos'
  | 'linux'
  | 'unknown';

// Helper functions defined outside component
const detectOS = (): OSType => {
  if (typeof window === 'undefined') return 'unknown';
  const userAgent = window.navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (userAgent.includes('android')) return 'android';
  if (userAgent.includes('windows')) return 'windows';
  if (userAgent.includes('mac')) return 'mac';
  if (userAgent.includes('cros')) return 'chromeos';
  if (userAgent.includes('linux')) return 'linux';
  return 'unknown';
};

const checkIsStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
};

const getInstallInstructions = (os: OSType): string => {
  switch (os) {
    case 'ios':
      return 'Tap the Share button (□↑) in Safari, then tap "Add to Home Screen"';
    case 'android':
      return 'Tap the menu (⋮) then select "Add to Home Screen" or "Install App"';
    case 'windows':
    case 'mac':
    case 'linux':
      return 'Click the install icon (⊕) in the address bar, or go to Menu → Install Print Press';
    case 'chromeos':
      return 'Click the install icon in the address bar, or go to Menu → Install';
    default:
      return 'Look for "Add to Home Screen" or "Install" in your browser menu';
  }
};

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [currentOS, setCurrentOS] = useState<OSType>('unknown');
  const hasInitialized = useRef(false);

  // Initialize on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Check if already installed
    if (checkIsStandalone()) {
      console.log('✅ App already installed');
      return;
    }

    // Detect OS
    const os = detectOS();
    setCurrentOS(os);
    console.log(`🖥️ Detected OS: ${os}`);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('✅ Service Worker registered:', reg))
        .catch((err) => console.error('❌ SW registration failed:', err));
    }

    // For iOS, show banner after delay
    if (os === 'ios') {
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for beforeinstallprompt (separate effect)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (checkIsStandalone()) return;

    const handler = (e: Event) => {
      console.log('📲 beforeinstallprompt event received');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Fallback: show banner after delay if no prompt received
    const fallbackTimer = setTimeout(() => {
      setShowBanner((prev) => {
        if (!prev) {
          console.log('⏱️ Showing manual install banner');
          return true;
        }
        return prev;
      });
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      // Native install available
      setIsInstalling(true);
      try {
        await deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        console.log('Install result:', result.outcome);
        if (result.outcome === 'accepted') {
          setShowBanner(false);
          setDeferredPrompt(null);
        }
      } catch (error) {
        console.error('Install error:', error);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // Show manual instructions
      setShowInstructions(true);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    setShowInstructions(false);
  }, []);

  // Don't render if already installed or banner not shown
  if (checkIsStandalone() || !showBanner) {
    return null;
  }

  return (
    <>
      {/* Install Banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 animate-in slide-in-from-bottom-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
            <Download className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">
              Install Print Press
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              Install our app for quick access and offline support
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleInstall}
                disabled={isInstalling}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4"
              >
                {isInstalling ? 'Installing...' : 'Install'}
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
                className="text-xs text-gray-500"
              >
                Not now
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <XIcon className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Manual Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-4 text-white rounded-t-2xl">
              <h2 className="text-lg font-bold">How to Install</h2>
              <p className="text-sm opacity-90 mt-1">
                Follow these steps for {currentOS}
              </p>
            </div>
            <div className="p-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-emerald-800">
                  {getInstallInstructions(currentOS)}
                </p>
              </div>
              <div className="text-xs text-gray-500 mb-4">
                <p>After installing, look for &quot;Print Press&quot; in:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {currentOS === 'ios' && (
                    <>
                      <li>Your home screen</li>
                      <li>App Library (swipe left)</li>
                    </>
                  )}
                  {currentOS === 'android' && (
                    <>
                      <li>Home screen</li>
                      <li>App drawer</li>
                    </>
                  )}
                  {(currentOS === 'windows' ||
                    currentOS === 'mac' ||
                    currentOS === 'linux') && (
                    <>
                      <li>Start menu / Applications</li>
                      <li>Desktop shortcut</li>
                    </>
                  )}
                  {currentOS === 'chromeos' && (
                    <>
                      <li>Launcher</li>
                      <li>Shelf (if pinned)</li>
                    </>
                  )}
                  {currentOS === 'unknown' && (
                    <li>Your app list or home screen</li>
                  )}
                </ul>
              </div>
              <Button
                onClick={() => setShowInstructions(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Got it!
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
