import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  side?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  showCloseButton?: boolean;
}

const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  side = 'right',
  size = 'md',
  showCloseButton = true
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl'
  };

  const slideClasses = {
    left: {
      container: 'left-0',
      translate: isOpen ? 'translate-x-0' : '-translate-x-full'
    },
    right: {
      container: 'right-0',
      translate: isOpen ? 'translate-x-0' : 'translate-x-full'
    }
  };

  return (
    <>
      {/* Backdrop - Desktop only */}
      <div
        className={`hidden md:block fixed inset-0 bg-iris-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Mobile Full Screen Modal */}
      <div className={`md:hidden fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}>
        <div className="h-full w-full bg-iris-black flex flex-col">
          {/* Mobile Header */}
          {title && (
            <div className="flex items-center justify-between p-4 border-b border-iris-white/10 bg-iris-black/95 backdrop-blur-sm sticky top-0 z-10">
              <div className="text-lg font-bold text-iris-white">{title}</div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 text-iris-white/70 hover:text-iris-white transition-colors rounded-lg hover:bg-iris-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
          {/* Mobile Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>

      {/* Desktop Drawer */}
      <div
        className={`hidden md:block fixed top-0 ${slideClasses[side].container} h-full ${sizeClasses[size]} w-full bg-iris-black shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${slideClasses[side].translate}`}
      >
        <div className="h-full flex flex-col">
          {/* Desktop Header */}
          {title && (
            <div className="flex items-center justify-between p-6 border-b border-iris-white/10 bg-iris-black/95 backdrop-blur-sm">
              <div className="text-lg font-bold text-iris-white">{title}</div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 text-iris-white/70 hover:text-iris-white transition-colors rounded-lg hover:bg-iris-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
          {/* Desktop Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default Drawer;
