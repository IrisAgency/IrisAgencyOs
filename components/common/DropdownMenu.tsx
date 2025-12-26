import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, items, align = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && !(event.target as Element).closest('[data-dropdown-menu]')) {
        setIsOpen(false);
        setPosition(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleTriggerClick = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    
    if (isOpen) {
      setIsOpen(false);
      setPosition(null);
    } else {
      setIsOpen(true);
      const menuWidth = 192; // w-48
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: align === 'right' 
          ? rect.right + window.scrollX - menuWidth
          : rect.left + window.scrollX
      });
    }
  };

  return (
    <>
      <div ref={triggerRef} onClick={handleTriggerClick} data-dropdown-menu>
        {trigger}
      </div>
      {isOpen && position && createPortal(
        <div
          data-dropdown-menu
          className="fixed w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-[9999]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`
          }}
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  setIsOpen(false);
                  setPosition(null);
                }
              }}
              disabled={item.disabled}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                item.danger
                  ? 'text-red-600 hover:bg-red-50 disabled:text-red-300'
                  : 'text-slate-700 hover:bg-slate-50 disabled:text-slate-300'
              } disabled:cursor-not-allowed`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};

export default DropdownMenu;
