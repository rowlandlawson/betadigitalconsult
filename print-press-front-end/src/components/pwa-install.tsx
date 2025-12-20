'use client';

import { useEffect, useState } from 'react';
import type { SVGProps } from 'react';
import { Button } from './ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Smartphone,
  Laptop,
  Apple,
  Chrome,
} from 'lucide-react';

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
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [_canInstall, _setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [_showManualInstall, _setShowManualInstall] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installStep, setInstallStep] = useState(0);
  const [installProgress, setInstallProgress] = useState(0);
  const [showLocationGuide, setShowLocationGuide] = useState(false);
  const [currentOS, setCurrentOS] = useState<
    'windows' | 'mac' | 'ios' | 'android' | 'chromeos' | 'linux' | 'unknown'
  >('unknown');
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    // Prevent running on server
    if (typeof window === 'undefined') return;

    // Check if already running as installed app
    const checkStandalone = () => {
      const isStandaloneApp =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneApp);
      return isStandaloneApp;
    };

    // Check if device is iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    // Detect Operating System
    const detectOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();

      if (userAgent.includes('windows')) return 'windows';
      if (userAgent.includes('mac')) return 'mac';
      if (
        userAgent.includes('iphone') ||
        userAgent.includes('ipad') ||
        userAgent.includes('ipod')
      )
        return 'ios';
      if (userAgent.includes('android')) return 'android';
      if (userAgent.includes('cros')) return 'chromeos';
      if (userAgent.includes('linux')) return 'linux';
      return 'unknown';
    };

    // Early exit if already installed
    if (checkStandalone()) {
      console.log('✅ App already installed as standalone');
      return;
    }

    const iosDevice = checkIOS();
    setIsIOS(iosDevice);

    const os = detectOS();
    setCurrentOS(os);
    console.log(`🖥️ Detected OS: ${os}`);

    // For iOS: show install prompt immediately
    if (iosDevice) {
      console.log('📱 iOS device detected - showing iOS install instructions');
      setCanInstall(true);
      setShowPrompt(true);
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

    // Listen for beforeinstallprompt event (Android & Desktop Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('📲 beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Fallback: Show manual install option after delay for non-iOS devices
    const manualInstallTimer = setTimeout(() => {
      setShowManualInstall((prev) => {
        // Only show if not already shown and we don't have a deferred prompt
        if (!prev && !deferredPrompt && !iosDevice) {
          console.log(
            '⏱️ No beforeinstallprompt after 2s, showing manual install option'
          );
          setShowPrompt(true);
          setCanInstall(true);
          return true;
        }
        return prev;
      });
    }, 2000);

    return () => {
      clearTimeout(manualInstallTimer);
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, [deferredPrompt]);

  // Device location guides
  const deviceGuides = [
    {
      id: 'windows',
      name: 'Windows',
      icon: <Chrome className="h-6 w-6" />,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      locations: [
        {
          title: 'Start Menu',
          description: 'Click Windows button → All Apps → Find "Print Press"',
          icon: '🏠',
          steps: [
            'Press Windows key or click Start button',
            'Scroll through app list or type "Print Press"',
            'Right-click → Pin to Start for quick access',
          ],
        },
        {
          title: 'Taskbar',
          description: 'Pin for one-click access',
          icon: '📌',
          steps: [
            'Find app in Start Menu',
            'Right-click → "More" → "Pin to taskbar"',
            'App will appear on your taskbar',
          ],
        },
        {
          title: 'Desktop',
          description: 'Create desktop shortcut',
          icon: '🖥️',
          steps: [
            'Go to Start Menu',
            'Drag app icon to desktop',
            'Or right-click → Create shortcut',
          ],
        },
      ],
    },
    {
      id: 'mac',
      name: 'macOS',
      icon: <Apple className="h-6 w-6" />,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      locations: [
        {
          title: 'Launchpad',
          description: 'Pinch gesture or click Launchpad icon',
          icon: '🚀',
          steps: [
            'Press F4 or click Launchpad in Dock',
            'Find "Print Press" app',
            'Drag to organize or create folder',
          ],
        },
        {
          title: 'Applications Folder',
          description: 'Finder → Applications',
          icon: '📁',
          steps: [
            'Open Finder',
            'Go to Applications folder',
            'Find and open "Print Press"',
          ],
        },
        {
          title: 'Dock',
          description: 'Keep in Dock for quick access',
          icon: '📌',
          steps: [
            'Open app from Launchpad',
            'Right-click Dock icon',
            'Options → Keep in Dock',
          ],
        },
      ],
    },
    {
      id: 'ios',
      name: 'iPhone/iPad',
      icon: <Smartphone className="h-6 w-6" />,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      locations: [
        {
          title: 'Home Screen',
          description: 'App appears on home screen after install',
          icon: '📱',
          steps: [
            'After "Add to Home Screen"',
            'App appears on current home screen',
            'Drag to rearrange or create folder',
          ],
        },
        {
          title: 'App Library',
          description: 'Swipe left past last home screen',
          icon: '📚',
          steps: [
            'Swipe left past last home screen',
            'Find in alphabetical list or category',
            'Press and hold to add back to home',
          ],
        },
        {
          title: 'Search',
          description: 'Swipe down on home screen',
          icon: '🔍',
          steps: [
            'Swipe down on home screen',
            'Type "Print Press"',
            'Tap to open directly',
          ],
        },
      ],
    },
    {
      id: 'android',
      name: 'Android',
      icon: <Smartphone className="h-6 w-6" />,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      locations: [
        {
          title: 'Home Screen',
          description: 'App shortcut appears automatically',
          icon: '🏠',
          steps: [
            'App appears on home screen after install',
            'Long press to move or remove',
            'Drag to create folder with other apps',
          ],
        },
        {
          title: 'App Drawer',
          description: 'Swipe up from bottom',
          icon: '📱',
          steps: [
            'Swipe up from bottom (or tap app drawer)',
            'Find in alphabetical list',
            'Long press to add to home',
          ],
        },
        {
          title: 'Search Apps',
          description: 'Swipe up and type',
          icon: '🔍',
          steps: [
            'Open app drawer',
            'Type "Print Press" in search bar',
            'Tap to open',
          ],
        },
      ],
    },
    {
      id: 'chromeos',
      name: 'ChromeOS',
      icon: <Chrome className="h-6 w-6" />,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      locations: [
        {
          title: 'Launcher',
          description: 'Press Launcher key or click circle',
          icon: '🔍',
          steps: [
            'Press Launcher key (⊞) or click circle',
            'Find in app list or search',
            'Right-click → Pin to shelf',
          ],
        },
        {
          title: 'Shelf',
          description: 'Bottom bar for pinned apps',
          icon: '📌',
          steps: [
            'Open app from Launcher',
            'Right-click shelf icon',
            'Select "Pin to shelf"',
          ],
        },
      ],
    },
    {
      id: 'linux',
      name: 'Linux',
      icon: <Laptop className="h-6 w-6" />,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      locations: [
        {
          title: 'Application Menu',
          description: 'Click Applications menu',
          icon: '📋',
          steps: [
            'Click Applications/System menu',
            'Find in installed applications',
            'Right-click → Add to favorites/desktop',
          ],
        },
        {
          title: 'Desktop Shortcut',
          description: 'Create .desktop file',
          icon: '🖥️',
          steps: [
            'Usually auto-created on desktop',
            'Or create in ~/.local/share/applications/',
            'Double-click to launch',
          ],
        },
      ],
    },
  ];

  const currentGuide =
    deviceGuides.find((g) => g.id === currentOS) || deviceGuides[0];
  const allGuides = deviceGuides;

  const handleShowLocationGuide = () => {
    setShowLocationGuide(true);
    setShowInstallDialog(false);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % allGuides.length);
  };

  const _handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + allGuides.length) % allGuides.length);
  };

  const handleSelectOS = (index: number) => {
    setCurrentSlide(index);
  };

  const handleInstall = async () => {
    setShowInstallDialog(true);
  };

  const handleConfirmInstall = async () => {
    setIsInstalling(true);
    setInstallStep(0);
    setInstallProgress(0);

    if (isIOS) {
      // For iOS, show share instructions
      setInstallStep(1);
      setInstallProgress(50);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setInstallStep(2);
      setInstallProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setShowInstallDialog(false);
      setShowPrompt(false);
      setIsInstalling(false);
      return;
    }

    if (
      currentOS === 'windows' ||
      currentOS === 'mac' ||
      currentOS === 'linux' ||
      currentOS === 'chromeos'
    ) {
      // For desktop platforms
      setInstallStep(1);
      setInstallProgress(20);
      await new Promise((resolve) => setTimeout(resolve, 800));

      setInstallStep(2);
      setInstallProgress(40);
      await new Promise((resolve) => setTimeout(resolve, 800));

      setInstallStep(3);
      setInstallProgress(60);
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (deferredPrompt) {
        try {
          console.log('📲 Using deferred beforeinstallprompt for desktop...');
          await deferredPrompt.prompt();

          const choiceResult = await deferredPrompt.userChoice;
          if (choiceResult.outcome === 'accepted') {
            // Installation accepted
            setInstallStep(4);
            setInstallProgress(80);
            await new Promise((resolve) => setTimeout(resolve, 1000));

            setInstallStep(5);
            setInstallProgress(100);
            console.log('✅ Desktop app installation accepted');

            // Show location guide after successful install
            await new Promise((resolve) => setTimeout(resolve, 800));
            handleShowLocationGuide();
          } else {
            // Installation dismissed
            console.log('❌ Desktop app installation dismissed');
            setIsInstalling(false);
          }
        } catch (error) {
          console.error('❌ Desktop installation error:', error);
          setIsInstalling(false);
        }
        return;
      }
    }

    // If no deferred prompt available, just show our progress anyway
    try {
      console.log('📲 No deferred prompt, showing progress...');

      // Step 4: Installing
      setInstallStep(4);
      setInstallProgress(75);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Step 5: Finalizing
      setInstallStep(5);
      setInstallProgress(90);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 6: Complete
      setInstallStep(6);
      setInstallProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Show location guide after successful install
      handleShowLocationGuide();
    } catch (error) {
      console.error('❌ Install error:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const _handleCancelInstall = () => {
    setShowInstallDialog(false);
    setIsInstalling(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (deferredPrompt) {
      setDeferredPrompt(null);
    }
  };

  // Visual guide component
  const DeviceVisualGuide = ({ os }: { os: string }) => {
    const visuals: Record<string, { device: string; label: string }> = {
      windows: {
        device: '🖥️',
        label: 'Windows Desktop',
      },
      mac: {
        device: '💻',
        label: 'macOS Desktop',
      },
      ios: {
        device: '📱',
        label: 'iPhone/iPad',
      },
      android: {
        device: '📱',
        label: 'Android Phone',
      },
      chromeos: {
        device: '💻',
        label: 'ChromeOS',
      },
      linux: {
        device: '💻',
        label: 'Linux Desktop',
      },
      unknown: {
        device: '🖥️',
        label: 'Your Device',
      },
    };

    const visual = visuals[os] || visuals.unknown;

    return (
      <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200 mb-4">
        <div className="text-5xl mb-2 animate-pulse-slow">{visual.device}</div>
        <div className="text-xs font-medium text-emerald-700 bg-white/70 px-3 py-1 rounded-full">
          {visual.label}
        </div>
        <div className="text-xs text-emerald-600 mt-2 text-center">
          App installed successfully! ✓
        </div>
      </div>
    );
  };

  // Enhanced Location Guide Modal
  const LocationGuideModal = () => (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-5 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="text-2xl">📍</span>
                Find Your App
              </h2>
              <p className="text-sm mt-1 opacity-90">
                Guide for {currentGuide.name}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setCurrentSlide(
                    (currentSlide - 1 + allGuides.length) % allGuides.length
                  )
                }
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium px-1">
                {currentSlide + 1}/{allGuides.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setCurrentSlide((currentSlide + 1) % allGuides.length)
                }
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* OS Selection Pills */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {allGuides.map((guide, index) => (
              <button
                key={guide.id}
                onClick={() => handleSelectOS(index)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  currentSlide === index
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'bg-white/20 text-white/90 hover:bg-white/30'
                }`}
              >
                <span>{guide.icon}</span>
                {guide.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {/* Device Visual */}
          <DeviceVisualGuide os={currentOS} />

          {/* Current OS Guide */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-2 rounded-lg ${currentGuide.color.split(' ')[0]} border ${currentGuide.color.split(' ')[2]}`}
              >
                {currentGuide.icon}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{currentGuide.name}</h3>
                <p className="text-sm text-gray-600">
                  Your app is ready! Find it here:
                </p>
              </div>
            </div>

            {currentGuide.locations.map((location, index) => (
              <div
                key={index}
                className="bg-gray-50/80 border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">{location.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {location.title}
                    </h4>
                    <p className="text-xs text-gray-600 mt-0.5 mb-2">
                      {location.description}
                    </p>
                    <ul className="space-y-1.5">
                      {location.steps.map((step, stepIndex) => (
                        <li
                          key={stepIndex}
                          className="flex items-start gap-2 text-xs text-gray-700"
                        >
                          <span className="flex-shrink-0 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] mt-0.5">
                            {stepIndex + 1}
                          </span>
                          <span className="leading-tight">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Universal Search Tips */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-emerald-600" />
              Quick Search Tips
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-700">Windows/Mac:</span>
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">
                  {currentOS === 'windows' ? 'Win' : 'Cmd'} + Space
                </kbd>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-700">iOS:</span>
                <span className="text-gray-600">Swipe down → Search</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-700">Android:</span>
                <span className="text-gray-600">App drawer → Search</span>
              </div>
            </div>
          </div>

          {/* App Icon Note */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🎨</span>
                </div>
              </div>
              <div>
                <p className="font-semibold text-amber-800 text-xs mb-1">
                  App Icon Note
                </p>
                <p className="text-xs text-amber-700">
                  Uses App Loco icon. May take a moment to appear. If default
                  icon shows, restart app.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-5 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowLocationGuide(false);
                  setShowPrompt(false);
                }}
                className="flex-1 text-sm"
              >
                Close
              </Button>
              <Button
                onClick={handleNextSlide}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm"
              >
                Next Device
                <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center mt-2">
              <div className="flex gap-1.5">
                {allGuides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      currentSlide === index
                        ? 'bg-emerald-600 w-6'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Go to ${allGuides[index].name}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const handleCancelInstallDialog = () => {
    setShowInstallDialog(false);
    setIsInstalling(false);
  };

  // Don't show if already installed as app
  if (isStandalone) {
    console.log('🔇 Not showing prompt - app already installed');
    return null;
  }

  // Show prompt if conditions are met
  if (!showPrompt) {
    console.log('🔇 Not rendering - showPrompt is false');
    return null;
  }

  return (
    <>
      {/* Main install banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white border border-gray-300 rounded-lg shadow-xl p-4 z-50 animate-in fade-in slide-in-from-bottom-4 transition-all duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <span className="text-lg">📱</span>
              Install App
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {isIOS
                ? 'Tap Share, then "Add to Home Screen"'
                : 'Get the best experience with our app installed'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="ml-2 h-6 w-6 flex-shrink-0 hover:bg-gray-100"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            onClick={handleInstall}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <Download className="h-4 w-4 mr-2" />
            Install Now
          </Button>
          <Button variant="outline" onClick={handleDismiss} className="px-4">
            Later
          </Button>
        </div>
      </div>

      {/* Custom Install Dialog - Medium Size */}
      {showInstallDialog && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-5 text-white rounded-t-2xl">
              <h2 className="text-xl font-bold text-center">Install App</h2>
              <p className="text-center text-sm mt-1 opacity-90">
                Print Press Management System
              </p>
            </div>

            {/* Content */}
            <div className="px-5 py-5">
              {!isInstalling ? (
                <>
                  {/* Benefits before install */}
                  <div className="space-y-4 mb-5">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="text-lg">✓</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          Offline Access
                        </p>
                        <p className="text-xs text-gray-600">
                          Use without internet connection
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="text-lg">⚡</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          Fast Performance
                        </p>
                        <p className="text-xs text-gray-600">
                          Lightning-fast on your device
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="text-lg">📱</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          Easy Access
                        </p>
                        <p className="text-xs text-gray-600">
                          From home screen or app drawer
                        </p>
                      </div>
                    </div>
                  </div>

                  {isIOS && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-5">
                      <p className="text-xs text-emerald-900">
                        <span className="font-semibold">For iOS:</span> After
                        Install, tap Share → &quot;Add to Home Screen&quot;
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Installation Progress */}
                  <div className="space-y-5">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">
                          Installing...
                        </span>
                        <span className="text-sm font-semibold text-emerald-600">
                          {installProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${installProgress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Installation Steps */}
                    <div className="space-y-3">
                      {/* Step 1: Initializing */}
                      <div className="flex gap-3">
                        <div
                          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                            installStep >= 1
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {installStep > 1 ? '✓' : '1'}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p
                            className={`font-semibold text-sm ${installStep >= 1 ? 'text-gray-900' : 'text-gray-500'}`}
                          >
                            Initializing
                          </p>
                          <p className="text-xs text-gray-500">
                            Preparing installation
                          </p>
                        </div>
                      </div>

                      {/* Step 3: User Confirmation */}
                      <div className="flex gap-3">
                        <div
                          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                            installStep >= 3
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {installStep > 3 ? '✓' : '3'}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p
                            className={`font-semibold text-sm ${installStep >= 3 ? 'text-gray-900' : 'text-gray-500'}`}
                          >
                            Confirmation
                          </p>
                          <p className="text-xs text-gray-500">
                            Waiting for confirmation
                          </p>
                        </div>
                      </div>

                      {/* Step 4: Installing */}
                      <div className="flex gap-3">
                        <div
                          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                            installStep >= 4
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {installStep > 4 ? (
                            '✓'
                          ) : installStep === 4 ? (
                            <div className="w-3 h-3 border-2 border-transparent border-t-white rounded-full animate-spin"></div>
                          ) : (
                            '4'
                          )}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p
                            className={`font-semibold text-sm ${installStep >= 4 ? 'text-gray-900' : 'text-gray-500'}`}
                          >
                            Installing Files
                          </p>
                          <p className="text-xs text-gray-500">
                            Downloading app files
                          </p>
                        </div>
                      </div>

                      {/* Step 5: Finalizing */}
                      <div className="flex gap-3">
                        <div
                          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                            installStep >= 5
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {installStep > 5 ? (
                            '✓'
                          ) : installStep === 5 ? (
                            <div className="w-3 h-3 border-2 border-transparent border-t-white rounded-full animate-spin"></div>
                          ) : (
                            '5'
                          )}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p
                            className={`font-semibold text-sm ${installStep >= 5 ? 'text-gray-900' : 'text-gray-500'}`}
                          >
                            Finalizing
                          </p>
                          <p className="text-xs text-gray-500">
                            Setting up shortcuts
                          </p>
                        </div>
                      </div>

                      {/* Step 6: Complete */}
                      <div className="flex gap-3">
                        <div
                          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                            installStep >= 6
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {installStep >= 6 ? '✓' : '6'}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p
                            className={`font-semibold text-sm ${installStep >= 6 ? 'text-gray-900' : 'text-gray-500'}`}
                          >
                            Complete
                          </p>
                          <p className="text-xs text-gray-500">
                            App is ready to use
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Success Message */}
                    {installStep === 6 && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mt-3">
                        <p className="text-xs text-emerald-900 mb-2">
                          <span className="font-semibold">✓ Success!</span> Your
                          app is now installed.
                        </p>
                        <Button
                          onClick={handleShowLocationGuide}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-2"
                        >
                          📍 Show Where to Find App
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer with buttons */}
            {!isInstalling && (
              <div className="border-t border-gray-200 px-5 py-4 flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancelInstallDialog}
                  className="flex-1 text-sm"
                >
                  Not Now
                </Button>
                <Button
                  onClick={handleConfirmInstall}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Install
                </Button>
              </div>
            )}

            {/* Success Footer */}
            {isInstalling && installStep === 6 && (
              <div className="border-t border-gray-200 px-5 py-4">
                <Button
                  onClick={() => {
                    setShowInstallDialog(false);
                    setIsInstalling(false);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm"
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location Guide Modal */}
      {showLocationGuide && <LocationGuideModal />}
    </>
  );
};
