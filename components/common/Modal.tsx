import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 200); // Wait for animation
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        full: 'max-w-4xl'
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`} style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={`bg-iris-black border border-iris-white/10 rounded-xl shadow-2xl w-full ${sizeClasses[size]} overflow-hidden relative transform transition-all duration-200 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`} style={{ maxWidth: 'calc(100vw - 2rem)' }}>
                <div className="p-6 border-b border-iris-white/10 flex justify-between items-center">
                    <div className="text-lg font-bold text-iris-white">{title}</div>
                    {showCloseButton && (
                        <button
                            onClick={onClose}
                            className="text-iris-white/70 hover:text-iris-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
                <div className="max-h-[80vh] overflow-y-auto" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
