'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

let modalLockCount = 0;
let restorePageScroll: (() => void) | null = null;

const lockPageScroll = () => {
  if (modalLockCount === 0) {
    const scrollY = window.scrollY;
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
    };

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';

    restorePageScroll = () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyStyles.overflow;
      document.body.style.position = bodyStyles.position;
      document.body.style.top = bodyStyles.top;
      document.body.style.left = bodyStyles.left;
      document.body.style.right = bodyStyles.right;
      document.body.style.width = bodyStyles.width;
      window.scrollTo(0, scrollY);
    };
  }

  modalLockCount += 1;
  return () => {
    modalLockCount -= 1;
    if (modalLockCount === 0) {
      restorePageScroll?.();
      restorePageScroll = null;
    }
  };
};

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
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    const unlockPageScroll = lockPageScroll();
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      unlockPageScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const maxWidthClasses = {
    sm: 'md:max-w-md',
    md: 'md:max-w-lg',
    lg: 'md:max-w-xl',
    xl: 'md:max-w-2xl',
  }[maxWidth];

  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      <div className="pointer-events-none fixed inset-0 z-10 flex items-end justify-center md:justify-end">
        <div
          className={`pointer-events-auto flex h-dvh w-full flex-col overflow-hidden rounded-t-3xl border border-[#EAEAEA] bg-white shadow-2xl animate-slide-in-up ${maxWidthClasses} md:h-full md:max-h-full md:rounded-none md:border-y-0 md:border-r-0 md:animate-slide-in-right`}
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[#D8D8D2] md:hidden" />
          {/* Side Pane Header */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex items-start justify-between bg-white shrink-0">
            <div className="pr-4">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
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
          <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
