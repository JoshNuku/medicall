'use client';

import React, { useState, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both your clinical email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        const returnUrl = searchParams.get('returnUrl') || '/dashboard';
        router.replace(returnUrl);
      } else {
        setError(res.error || 'Invalid credentials. Please verify and try again.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:flex-row">
      {/* LEFT SIDE: Visual Showcase Hero matching user reference */}
      <div className="hidden lg:flex lg:w-1/2 p-4 xl:p-6 select-none">
        <div className="relative w-full h-full min-h-[640px] rounded-[32px] overflow-hidden flex flex-col justify-between p-8 xl:p-12 shadow-md">
          {/* Background Photo with Ambient Atmosphere */}
          <Image
            src="/login-hero.jpg"
            alt="MediCall Clinical Workspace"
            fill
            priority
            className="object-cover object-center filter brightness-[0.88]"
          />

          {/* Deep Cinematic Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/25 z-10" />

          {/* Bottom Bold Headline & Text matching reference layout */}
          <div className="relative z-20 space-y-2 max-w-lg mt-auto">
            <h2 className="text-3xl xl:text-4xl font-semibold text-white tracking-tight leading-tight">
              Ensure Every Dose.
            </h2>
            <p className="text-xs xl:text-sm text-gray-300 font-normal leading-relaxed">
              Automated Asante Twi voice calls, direct keypad adherence tracking, and real-time clinical escalations for Ghana’s frontline pharmacists.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Clean Form Panel matching reference layout */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 md:p-12 xl:p-16">
        <div className="w-full max-w-[440px] space-y-6 sm:space-y-8">
          <div>
            <div className="mb-8">
              <Image
                src="/logo.jpg"
                alt="MediCall"
                width={160}
                height={52}
                className="h-10 w-auto object-contain"
                priority
              />
            </div>

            {/* Title & Description matching reference */}
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
              Welcome Back
            </h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Sign in to continue managing patient reminders, adherence tracking, and clinical escalations in one place.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-3 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative rounded-xl border border-gray-200/90 focus-within:border-[#70BF2B] focus-within:ring-2 focus-within:ring-[#70BF2B]/20 transition-all bg-white shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent rounded-xl"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative rounded-xl border border-gray-200/90 focus-within:border-[#70BF2B] focus-within:ring-2 focus-within:ring-[#70BF2B]/20 transition-all bg-white shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-3 pl-11 pr-11 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent font-mono rounded-xl tracking-wider"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Forgot password link matching reference */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {/* Submit Button matching green pill/button in reference */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-[#70BF2B] hover:bg-[#62A825] active:bg-[#55941E] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed mt-4"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Hint Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end justify-center z-50 animate-in fade-in md:items-center md:p-4">
          <div className="bg-white rounded-t-3xl md:max-w-sm w-full p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border border-gray-100 shadow-xl space-y-4 animate-slide-in-up md:rounded-2xl md:pb-6 md:animate-slide-in-right">
            <div className="mx-auto -mt-3 mb-4 h-1 w-10 rounded-full bg-[#D8D8D2] md:hidden" />
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#70BF2B] flex items-center justify-center border border-[#70BF2B]/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Hospital Staff Account Support</h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                MediCall accounts are managed by your healthcare facility administrator. For credential resets, contact:
              </p>
              <div className="mt-3 p-3 rounded-xl bg-gray-50 text-xs font-mono text-gray-800 border border-gray-200/70">
                admin@medicall.gh
              </div>
            </div>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F8F9FA]">
          <div className="w-6 h-6 border-2 border-[#70BF2B] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
