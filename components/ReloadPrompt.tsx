import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { X, RefreshCw } from 'lucide-react';

const ReloadPrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[10000] p-4 bg-slate-800 text-white rounded-lg shadow-lg border border-slate-700 max-w-sm animate-in slide-in-from-bottom-5">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {offlineReady ? (
            <p className="text-sm font-medium">App ready to work offline</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">New content available, click on reload button to update.</p>
              <button
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-xs font-medium transition-colors"
                onClick={() => updateServiceWorker(true)}
              >
                <RefreshCw className="w-3 h-3" />
                Reload
              </button>
            </div>
          )}
        </div>
        <button
          className="text-slate-400 hover:text-white transition-colors"
          onClick={close}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ReloadPrompt;
