'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { LayoutDashboard, SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-subtle-border bg-white px-6 py-10 text-center shadow-xs sm:px-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-kaime-blue-border bg-kaime-blue-light text-kaime-blue">
          <SearchX className="h-8 w-8 stroke-[1.8]" aria-hidden="true" />
        </div>

        <span className="mb-3 inline-flex rounded-full border border-kaime-blue/30 bg-kaime-blue-light px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-kaime-blue">
          404 · Page not found
        </span>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
          We couldn’t find that page
        </h1>

        <p className="mx-auto mb-7 max-w-md text-sm leading-relaxed text-gray-500">
          The page may have moved or the address may be incorrect. Head back to your dashboard to continue.
        </p>

        <Link href="/dashboard">
          <Button variant="primary" icon={<LayoutDashboard className="h-4 w-4" />}>
            Return to Dashboard
          </Button>
        </Link>
      </section>
    </div>
  );
}
