'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Side Pane Sheet Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 z-10">
        <div
          className={`w-screen ${maxWidthClasses} bg-white shadow-2xl border-l border-[#EAEAEA] flex flex-col h-full transform transition ease-in-out duration-300 animate-in slide-in-from-right`}
          role="dialog"
          aria-modal="true"
        >
          {/* Side Pane Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between bg-white shrink-0">
            <div className="pr-4">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
              {description && (
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors shrink-0 -mr-1"
              aria-label="Close pane"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Side Pane Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
