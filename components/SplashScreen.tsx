import React, { useEffect, useState, useRef } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  source?: string; // Path to file (mp4, gif, png, etc)
  minimumDisplayDuration?: number;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onFinish, 
  source = '/splash.gif', // Default changed to GIF as requested
  minimumDisplayDuration = 3000 // Increased slightly for GIFs to ensure visibility
}) => {
  const [loadError, setLoadError] = useState(false);
  const [startTime] = useState(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = source.toLowerCase().endsWith('.mp4') || source.toLowerCase().endsWith('.webm');

  const handleFinish = () => {
    if (!onFinish) return;

    const elapsed = Date.now() - startTime;
    const remaining = minimumDisplayDuration - elapsed;

    if (remaining > 0) {
      setTimeout(onFinish, remaining);
    } else {
      onFinish();
    }
  };

  useEffect(() => {
    // For videos, we try to play. For GIFs/Images, we just wait for the timer.
    if (isVideo && videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error("Splash screen video autoplay failed:", error);
        // If autoplay fails, we don't necessarily error out, we just let the timer handle it
        // unless we want to force fallback. But usually timer is fine.
      });
    }

    // Main timer: Acts as the duration for GIFs/Images, and a fallback/max-duration for videos
    // For GIFs, this IS the duration logic since they loop forever.
    const duration = isVideo ? Math.max(5000, minimumDisplayDuration + 1000) : minimumDisplayDuration;
    
    const timer = setTimeout(() => {
      handleFinish();
    }, duration); 

    return () => clearTimeout(timer);
  }, [onFinish, minimumDisplayDuration, isVideo]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      {!loadError ? (
        isVideo ? (
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-cover"
            onEnded={handleFinish}
            onError={(e) => {
              console.error("Video load error:", e);
              setLoadError(true);
            }}
          >
            <source src={source} type="video/mp4" />
          </video>
        ) : (
          <img 
            src={source} 
            alt="Splash" 
            className="w-full h-full object-cover"
            onError={() => setLoadError(true)}
          />
        )
      ) : (
        // Fallback if asset missing/error
        <div className="text-center">
           <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
           <p className="text-white font-medium">Loading IRIS OS...</p>
        </div>
      )}
    </div>
  );
};

export default SplashScreen;
