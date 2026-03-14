'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
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

// Extend Window interface for global prompt storage
declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
    __pwaPromptHandled?: boolean;
  }
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
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
    true
  );
};

const getInstallInstructions = (os: OSType): string => {
  switch (os) {
    case 'ios':
      return 'Tap the Share button (□↑) in Safari, then tap "Add to Home Screen"';
    default:
      return 'Look for "Add to Home Screen" or "Install" in your browser menu';
  }
};

// Check if user dismissed the banner this session
const isDismissedThisSession = (): boolean => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('pwa_install_dismissed') === 'true';
};

// Set dismissed flag for this session
const setDismissedThisSession = (): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('pwa_install_dismissed', 'true');
};

// Check if browser supports native PWA install
const supportsNativeInstall = (): boolean => {
  if (typeof window === 'undefined') return false;
  // iOS Safari doesn't support beforeinstallprompt
  const os = detectOS();
  if (os === 'ios') return false;
  // Check if the event is potentially available (Chrome, Edge, Samsung Internet, etc.)
  return (
    'BeforeInstallPromptEvent' in window ||
    /chrome|edge|samsung/i.test(navigator.userAgent)
  );
};

type PWAInstallPromptProps = {
  staffOnly?: boolean;
};

const hasStaffInstallAccess = (): boolean => {
  if (typeof window === 'undefined') return false;
  // Check either the explicit flag OR if user is authenticated (has auth token)
  return (
    localStorage.getItem('staff_device_eligible') === 'true' ||
    !!localStorage.getItem('auth_token')
  );
};

export const PWAInstallPrompt = ({ staffOnly = false }: PWAInstallPromptProps) => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [currentOS, setCurrentOS] = useState<OSType>('unknown');
  const [promptReady, setPromptReady] = useState(false);
  const hasInitialized = useRef(false);

  // Initialize on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (staffOnly && !hasStaffInstallAccess()) {
      return;
    }

    // Check if already installed
    if (checkIsStandalone()) {
      console.log('✅ App already installed');
      return;
    }

    // Check if user dismissed the banner this session
    if (isDismissedThisSession()) {
      console.log('⏸️ User dismissed install banner this session');
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

    // Check if we already captured the prompt globally (before React mounted)
    if (window.__pwaInstallPrompt) {
      console.log('📲 Using globally captured beforeinstallprompt');
      setDeferredPrompt(window.__pwaInstallPrompt);
      setPromptReady(true);
      setShowBanner(true);
      return;
    }

    // For iOS, show banner with instructions after delay
    if (os === 'ios') {
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }

    // For non-iOS (Chrome, Edge etc.), show banner after a short delay
    // even if beforeinstallprompt hasn't fired (it may not fire in dev/HTTP)
    if (supportsNativeInstall()) {
      const fallbackTimer = setTimeout(() => {
        if (!isDismissedThisSession() && !checkIsStandalone()) {
          setShowBanner(true);
        }
      }, 3000);
      return () => clearTimeout(fallbackTimer);
    }
  }, []);

  // Listen for beforeinstallprompt (separate effect)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (staffOnly && !hasStaffInstallAccess()) return;
    if (checkIsStandalone()) return;
    if (isDismissedThisSession()) return;

    const handler = (e: Event) => {
      console.log('📲 beforeinstallprompt event received');
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      // Store globally in case component remounts
      window.__pwaInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      setPromptReady(true);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful installation
    const installedHandler = () => {
      console.log('✅ App was installed');
      setShowBanner(false);
      setDeferredPrompt(null);
      window.__pwaInstallPrompt = null;
    };
    window.addEventListener('appinstalled', installedHandler);

    // For non-iOS devices that support native install, wait longer for the prompt
    // Only show fallback banner for iOS devices
    const os = detectOS();
    if (os === 'ios') {
      const fallbackTimer = setTimeout(() => {
        if (!isDismissedThisSession()) {
          setShowBanner(true);
        }
      }, 1500);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        window.removeEventListener('appinstalled', installedHandler);
        clearTimeout(fallbackTimer);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [staffOnly]);

  const handleInstall = useCallback(async () => {
    // Try to use the stored prompt
    const prompt = deferredPrompt || window.__pwaInstallPrompt;

    if (prompt) {
      // Native install available
      setIsInstalling(true);
      try {
        console.log('📲 Triggering native install prompt...');
        await prompt.prompt();
        const result = await prompt.userChoice;
        console.log('Install result:', result.outcome);
        if (result.outcome === 'accepted') {
          setShowBanner(false);
          setDeferredPrompt(null);
          window.__pwaInstallPrompt = null;
        }
      } catch (error) {
        console.error('Install error:', error);
        // If native prompt fails, show instructions only for iOS
        if (currentOS === 'ios') {
          setShowInstructions(true);
        }
      } finally {
        setIsInstalling(false);
      }
    } else if (currentOS === 'ios') {
      // iOS doesn't support beforeinstallprompt, show manual instructions
      setShowInstructions(true);
    } else {
      // The beforeinstallprompt event hasn't fired yet.
      // Wait briefly in case it's just delayed (common after fresh SW install)
      setIsInstalling(true);
      const waitForPrompt = new Promise<BeforeInstallPromptEvent | null>((resolve) => {
        const handler = (e: Event) => {
          e.preventDefault();
          window.removeEventListener('beforeinstallprompt', handler);
          resolve(e as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handler);
        setTimeout(() => {
          window.removeEventListener('beforeinstallprompt', handler);
          resolve(null);
        }, 3000);
      });

      const delayedPrompt = await waitForPrompt;
      setIsInstalling(false);

      if (delayedPrompt) {
        setDeferredPrompt(delayedPrompt);
        window.__pwaInstallPrompt = delayedPrompt;
        await delayedPrompt.prompt();
        const result = await delayedPrompt.userChoice;
        if (result.outcome === 'accepted') {
          setShowBanner(false);
          setDeferredPrompt(null);
          window.__pwaInstallPrompt = null;
        }
      } else {
        // Prompt still not available — show helpful instructions
        setShowInstructions(true);
      }
    }
  }, [deferredPrompt, currentOS]);

  const handleDismiss = useCallback(() => {
    // Store dismissal in sessionStorage (resets on logout/new session)
    setDismissedThisSession();
    setShowBanner(false);
    setShowInstructions(false);
  }, []);

  // Don't render if already installed, dismissed this session, or banner not shown
  if (checkIsStandalone() || !showBanner) {
    return null;
  }

  // For non-iOS platforms, only show banner if we have the native prompt ready
  // OR if we're waiting for it (to avoid showing instructions modal inappropriately)
  const isIOS = currentOS === 'ios';
  const hasNativePrompt = promptReady || !!window.__pwaInstallPrompt;

  // Don't show banner on non-iOS if no prompt and browser doesn't support install at all
  if (!isIOS && !hasNativePrompt && !supportsNativeInstall()) {
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
              {isIOS
                ? 'Add to your home screen for quick access'
                : 'Install our app for quick access and offline support'}
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
                Later
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
                {isIOS ? 'Follow these steps for iOS' : 'Follow these steps to install'}
              </p>
            </div>
            <div className="p-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-emerald-800">
                  {isIOS
                    ? getInstallInstructions('ios')
                    : 'Tap the three-dot menu (⋮) in your browser, then tap "Install app" or "Add to Home Screen"'}
                </p>
              </div>
              <div className="text-xs text-gray-500 mb-4">
                <p>After installing, look for &quot;{isIOS ? 'Print Press' : 'Beta Digital Consult'}&quot; in:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Your home screen</li>
                  {isIOS && <li>App Library (swipe left)</li>}
                  {!isIOS && <li>Your app drawer or desktop</li>}
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
