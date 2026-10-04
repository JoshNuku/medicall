'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { MobileNav } from '@/components/layout/MobileNav';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isLoginPage) {
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/login?returnUrl=${returnUrl}`);
    } else if (isAuthenticated && isLoginPage) {
      let returnUrl = '/dashboard';
      if (typeof window !== 'undefined') {
        const search = new URLSearchParams(window.location.search);
        returnUrl = search.get('returnUrl') || '/dashboard';
      }
      router.replace(returnUrl);
    }
  }, [isAuthenticated, isLoading, isLoginPage, pathname, router]);

  // If loading authentication state, display a spinner
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F8F9FA]">
        <div className="w-8 h-8 border-2.5 border-gray-200 border-t-[#70BF2B] rounded-full animate-spin" />
      </div>
    );
  }

  // If on login page, render full screen without dashboard shell
  if (isLoginPage) {
    return <div className="min-h-screen w-full bg-[#F8F9FA]">{children}</div>;
  }

  // If not authenticated and not yet redirected, render nothing briefly
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated dashboard layout
  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen w-full overflow-x-clip">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8F9FA] w-full overflow-x-clip md:ml-64">
        <MobileNav />
        <TopHeader />
        <main className="flex-1 p-3.5 pb-24 sm:p-6 sm:pb-24 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
