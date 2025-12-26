import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true ||
                      document.referrer.includes('android-app://');
    
    console.log('PWA Debug:', { protocol: window.location.protocol, host: window.location.host, standalone, userAgent: navigator.userAgent });

    setIsStandalone(standalone);
    
    if (standalone) {
      console.log('PWA: App is already installed');
      return;
    }

    const handler = (e: Event) => {
      console.log('✅ PWA: beforeinstallprompt event fired!', e);
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => {
        console.log('PWA: Showing install prompt');
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    setTimeout(() => {
      if (!deferredPrompt && !standalone) {
        console.log('⚠️ PWA: beforeinstallprompt not fired, showing manual instructions');
        setShowPrompt(true);
      }
    }, 5000);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    } else {
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowInstructions(false);
  };

  if (isStandalone || !showPrompt) {
    return null;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-lg border border-slate-200 p-4 z-50 animate-slide-up">
      <button onClick={handleDismiss} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600" aria-label="Dismiss">
        <X size={20} />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">IO</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 mb-1">Install IRIS Agency OS</h3>
          
          {!showInstructions ? (
            <>
              <p className="text-sm text-slate-600 mb-3">Install our app for quick access and a better experience</p>
              <div className="flex gap-2">
                <button onClick={handleInstall} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium">
                  <Download size={16} />
                  Install
                </button>
                <button onClick={handleDismiss} className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">
                  Not now
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-2">Follow these steps to install:</p>
              <div className="text-xs text-slate-600 space-y-2 mb-3">
                {isIOS ? (
                  <>
                    <p>1. Tap the <strong>Share</strong> button (□↑)</p>
                    <p>2. Scroll down and tap <strong>"Add to Home Screen"</strong></p>
                    <p>3. Tap <strong>"Add"</strong> to confirm</p>
                  </>
                ) : isAndroid && isChrome ? (
                  <>
                    <p>1. Tap the <strong>menu</strong> (⋮) in the top right</p>
                    <p>2. Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></p>
                    <p>3. Tap <strong>"Install"</strong> to confirm</p>
                  </>
                ) : isChrome ? (
                  <>
                    <p>1. Click the <strong>install icon</strong> (⊕) in the address bar</p>
                    <p>2. Or click <strong>menu</strong> (⋮) → <strong>"Install IRIS Agency OS"</strong></p>
                  </>
                ) : (
                  <>
                    <p>1. Open this site in <strong>Chrome</strong> or <strong>Edge</strong></p>
                    <p>2. Look for the install option in the browser menu</p>
                  </>
                )}
              </div>
              <button onClick={handleDismiss} className="w-full px-4 py-2 text-indigo-600 hover:text-indigo-700 transition-colors text-sm font-medium">
                Got it
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
