'use client';

import { useEffect, useState } from 'react';
import type { SVGProps } from 'react';
import { Button } from './ui/button';
// Lightweight in-file SVG icon replacements for Download and X (avoid external dependency)
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

const X = (props: SVGProps<SVGSVGElement>) => (
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
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </svg>
);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };
    
    if (checkIOS()) {
      setIsIOS(true);
      // Check if already installed
      if ((window.navigator as any).standalone === false) {
        setCanInstall(true);
        setShowPrompt(true);
      }
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });
    }

    // Listen for beforeinstallprompt event (Android & Desktop)
    const handler = (e: Event) => {
      console.log('📲 beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
      setShowPrompt(true);
    };

    // Use 'beforeinstallprompt' with proper event listener
    window.addEventListener('beforeinstallprompt', handler);

    // Fallback: show install button after delay if no beforeinstallprompt
    const timer = setTimeout(() => {
      if (!deferredPrompt && !isIOS) {
        console.log('⏱️ No beforeinstallprompt detected, checking installation status');
        // Only show if not already installed
        if (window.matchMedia('(display-mode: standalone)').matches === false) {
          // Could optionally show a manual install option here
        }
      }
    }, 3000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [deferredPrompt, isIOS]);

  const handleInstall = async () => {
    if (isIOS) {
      // iOS installation instructions
      setShowPrompt(false);
      return;
    }

    if (!deferredPrompt) {
      console.warn('⚠️ No install prompt available');
      return;
    }

    try {
      console.log('📲 Prompting user to install...');
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('✅ User accepted the install prompt');
      } else {
        console.log('❌ User dismissed the install prompt');
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('❌ Installation error:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (deferredPrompt) {
      setDeferredPrompt(null);
    }
  };

  // Don't show if already installed as app
  if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
    return null;
  }

  if (!showPrompt || !canInstall) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 animate-in">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">Install App</h3>
          <p className="text-sm text-gray-600">
            {isIOS 
              ? 'Tap Share, then "Add to Home Screen"' 
              : 'Install this app on your device for a better experience'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="ml-2 h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <Button 
        onClick={handleInstall} 
        className="w-full mt-3"
        disabled={isIOS && !canInstall}
      >
        <Download className="h-4 w-4 mr-2" />
        {isIOS ? 'Install via Share' : 'Install Now'}
      </Button>
    </div>
  );
};

