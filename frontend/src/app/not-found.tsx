'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Activity, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center mb-6 shadow-xs">
        <Activity className="w-8 h-8 stroke-[2.2]" />
      </div>

      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 mb-3">
        404 &middot; Page Not Found
      </span>

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-950 tracking-tight mb-2">
        This page could not be found
      </h1>

      <p className="text-sm text-gray-500 max-w-md mb-8 leading-relaxed">
        The route you requested does not exist or may have been moved. Return to the main dashboard to continue reviewing medication adherence.
      </p>

      <Link href="/dashboard">
        <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />}>
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}
