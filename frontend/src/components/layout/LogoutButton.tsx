'use client';

import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface LogoutButtonProps {
  className: string;
  iconClassName?: string;
  label?: string;
  onLogout?: () => void;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  className,
  iconClassName,
  label = 'Logout',
  onLogout,
}) => {
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const { logout } = useAuth();
  const dialogId = useId();

  useEffect(() => {
    if (!isConfirmationOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsConfirmationOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConfirmationOpen]);

  const confirmLogout = () => {
    setIsConfirmationOpen(false);
    onLogout?.();
    logout();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfirmationOpen(true)}
        className={className}
      >
        <LogOut className={iconClassName ?? 'h-4 w-4 text-rose-500'} />
        <span>{label}</span>
      </button>

      {isConfirmationOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 px-0 backdrop-blur-[2px] md:items-center md:px-4"
            onClick={() => setIsConfirmationOpen(false)}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={`${dialogId}-title`}
              aria-describedby={`${dialogId}-description`}
              className="w-full rounded-t-3xl border border-gray-100 bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-in-up md:max-w-sm md:rounded-2xl md:pb-5 md:animate-slide-in-right"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D8D8D2] md:hidden" />
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <LogOut className="h-5 w-5" />
              </div>
              <h2 id={`${dialogId}-title`} className="mt-4 text-base font-semibold text-gray-900">
                Log out?
              </h2>
              <p id={`${dialogId}-description`} className="mt-1 text-sm text-gray-600">
                Are you sure you want to log out of your account?
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmationOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmLogout}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
