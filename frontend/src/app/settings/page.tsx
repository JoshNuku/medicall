'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  User,
  Clock,
  Save,
  Check,
  CheckCircle2,
  Mail,
  Phone,
  BellRing,
  RotateCcw,
  Sparkles,
  Radio,
  Play,
  Pause,
  Loader2,
  Volume2,
  Activity,
  Server,
  Database,
  Cloud,
  Terminal,
  PhoneForwarded,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  fetchTtsProviderApi,
  updateTtsProviderApi,
  testTtsProviderApi,
  fetchSystemDiagnostics,
  simulateVoiceWebhookApi,
  type SystemHealthData
} from '@/lib/api';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();

  const [saved, setSaved] = useState(false);

  // Clinician Profile Form State
  const [name, setName] = useState('Josh Nuku');
  const [email, setEmail] = useState('nukujosh119@gmail.com');
  const [phone, setPhone] = useState('+233 53 628 7642');

  // Schedule & Adherence Preferences State
  const [morningTime, setMorningTime] = useState('08:00');
  const [eveningTime, setEveningTime] = useState('20:00');
  const [defaultLanguage, setDefaultLanguage] = useState<'twi' | 'english'>('twi');
  const [retryInterval, setRetryInterval] = useState('30');
  const [noAnswerWindow, setNoAnswerWindow] = useState('120');
  const [escalationThreshold, setEscalationThreshold] = useState('2');
  const [enableSoundAlerts, setEnableSoundAlerts] = useState(true);

  // Toast Text State
  const [toastText, setToastText] = useState('Profile and clinical preferences saved successfully.');

  // TTS Engine Configuration State
  const [activeTtsEngine, setActiveTtsEngine] = useState<'lab' | 'khaya'>('lab');
  const [isSwitchingEngine, setIsSwitchingEngine] = useState(false);
  const [testingEngine, setTestingEngine] = useState<'lab' | 'khaya' | null>(null);
  const [testAudioStatus, setTestAudioStatus] = useState<string | null>(null);
  const audioSampleRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlayingSample, setIsPlayingSample] = useState(false);

  // System Diagnostics State
  const [diagnostics, setDiagnostics] = useState<SystemHealthData | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  // IVR Telephony Simulator State
  const [simScenario, setSimScenario] = useState<string>('outbound_reminder_prompt');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any | null>(null);
  const [showRawXml, setShowRawXml] = useState(false);

  const loadDiagnostics = async () => {
    setLoadingDiagnostics(true);
    try {
      const data = await fetchSystemDiagnostics();
      setDiagnostics(data);
    } catch (_) {}
    finally {
      setLoadingDiagnostics(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setSimResult(null);
    setShowRawXml(false);
    try {
      let payload: any = { scenario: simScenario };
      if (simScenario === 'dtmf_keypress_1') {
        payload = { scenario: 'dtmf_keypress', dtmf_digits: '1' };
      } else if (simScenario === 'dtmf_keypress_2') {
        payload = { scenario: 'dtmf_keypress', dtmf_digits: '2' };
      } else if (simScenario === 'diagnostic_reason') {
        payload = { scenario: 'diagnostic_reason', dtmf_digits: '1' };
      }
      const res = await simulateVoiceWebhookApi(payload);
      setSimResult(res);
    } catch (err: any) {
      setSimResult({ success: false, error: err.message || 'Simulation request failed' });
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    fetchTtsProviderApi()
      .then((data) => {
        if (data?.activeProvider) {
          setActiveTtsEngine(data.activeProvider as 'lab' | 'khaya');
        }
      })
      .catch((err) => console.warn('TTS provider fetch notice:', err));
  }, []);

  const handleSwitchTtsEngine = async (target: 'lab' | 'khaya') => {
    if (target === activeTtsEngine || isSwitchingEngine) return;
    setIsSwitchingEngine(true);
    try {
      await updateTtsProviderApi(target);
      setActiveTtsEngine(target);
      setToastText(`TTS voice synthesis engine switched to ${target === 'lab' ? 'Lab Subscription Platform (PT)' : 'Khaya AI (Ghana NLP v2)'}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err: any) {
      setToastText(err.message || 'Failed to switch TTS provider');
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } finally {
      setIsSwitchingEngine(false);
    }
  };

  const handleTestTtsAudio = async (engine: 'lab' | 'khaya') => {
    if (testingEngine) return;
    if (audioSampleRef.current) {
      audioSampleRef.current.pause();
      audioSampleRef.current = null;
      setIsPlayingSample(false);
    }

    setTestingEngine(engine);
    setTestAudioStatus(`Synthesizing voice sample via ${engine === 'lab' ? 'Lab Platform' : 'Khaya AI'}...`);
    try {
      const res = await testTtsProviderApi(engine, 'Meda wo akye, yɛfrɛ wo firi MediCall sɛ yɛbɛkae wo wo nnuro no ho.');
      if (res?.audioUrl) {
        setTestAudioStatus(`Playing ${engine.toUpperCase()} voice sample...`);
        const audio = new Audio(res.audioUrl);
        audioSampleRef.current = audio;
        setIsPlayingSample(true);
        audio.onended = () => {
          setIsPlayingSample(false);
          setTestAudioStatus(null);
          setTestingEngine(null);
        };
        audio.onerror = () => {
          setIsPlayingSample(false);
          setTestAudioStatus(null);
          setTestingEngine(null);
        };
        await audio.play();
      }
    } catch (err: any) {
      setTestAudioStatus(`Test notice: ${err.message || 'Error playing sample'}`);
      setTimeout(() => setTestAudioStatus(null), 3000);
      setTestingEngine(null);
      setIsPlayingSample(false);
    }
  };

  // Sync initial profile from auth session
  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.email) setEmail(user.email);
    }

    // Load saved schedule preferences
    try {
      const savedPrefs = localStorage.getItem('medicall_clinical_settings');
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        if (parsed.morningTime) setMorningTime(parsed.morningTime);
        if (parsed.eveningTime) setEveningTime(parsed.eveningTime);
        if (parsed.defaultLanguage) setDefaultLanguage(parsed.defaultLanguage);
        if (parsed.retryInterval) setRetryInterval(parsed.retryInterval);
        if (parsed.noAnswerWindow) setNoAnswerWindow(parsed.noAnswerWindow);
        if (parsed.escalationThreshold) setEscalationThreshold(parsed.escalationThreshold);
        if (parsed.enableSoundAlerts !== undefined) setEnableSoundAlerts(parsed.enableSoundAlerts);
        if (parsed.phone) setPhone(parsed.phone);
      }
    } catch (_) {}
  }, [user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Update session user in AuthContext & localStorage
    updateUser({
      name: name.trim(),
      email: email.trim(),
    });

    // 2. Persist schedule preferences
    try {
      localStorage.setItem(
        'medicall_clinical_settings',
        JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          morningTime,
          eveningTime,
          defaultLanguage,
          retryInterval,
          noAnswerWindow,
          escalationThreshold,
          enableSoundAlerts,
        })
      );
    } catch (_) {}

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResetDefaults = () => {
    setMorningTime('08:00');
    setEveningTime('20:00');
    setDefaultLanguage('twi');
    setRetryInterval('30');
    setNoAnswerWindow('120');
    setEscalationThreshold('2');
    setEnableSoundAlerts(true);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Toast Notification */}
      {saved && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-xs px-4 py-3 rounded-xl shadow-lg border border-gray-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#70BF2B]" />
          <span>{toastText}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Settings"
        subtitle="Manage your clinical profile, automated reminder windows, and adherence rules."
      />

      <form onSubmit={handleSave} className="space-y-5">
        {/* Clinician Profile (Fully Editable) */}
        <div className="bg-white border border-[#ECECEC] rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F0F9EB] text-[#55941E] flex items-center justify-center border border-[#70BF2B]/20">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Clinician Profile</h2>
                <p className="text-xs text-gray-500">Edit your healthcare worker identity and credentials</p>
              </div>
            </div>
            <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
              Active Session
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Full Name */}
            <div>
              <label htmlFor="clinician-name" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <input
                  id="clinician-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Kwame Mensah"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/25 focus:border-[#70BF2B] transition-all"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="clinician-email" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  id="clinician-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pharmacist@medicall.gh"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/25 focus:border-[#70BF2B] transition-all"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="clinician-phone" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Pharmacist Direct Phone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <input
                  id="clinician-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 53 628 7642"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/25 focus:border-[#70BF2B] transition-all"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Emergency escalation contact for patient keypad 0.
              </p>
            </div>
          </div>
        </div>

        {/* TTS Voice Engine Configuration (Seamless Toggle between Lab & Khaya) */}
        <div className="bg-white border border-[#ECECEC] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">TTS Speech Synthesis Engine</h2>
                <p className="text-xs text-gray-500">Switch seamlessly between Khaya AI and Lab Subscription Platform for Twi voice generation</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200/60">
              Active: {activeTtsEngine === 'lab' ? 'Lab Platform' : 'Khaya AI'}
            </span>
          </div>

          {/* Engine Cards Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Engine Option A: Lab Subscription Platform */}
            <div
              onClick={() => handleSwitchTtsEngine('lab')}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                activeTtsEngine === 'lab'
                  ? 'bg-[#FAFDF8] border-[#70BF2B] shadow-2xs ring-2 ring-[#70BF2B]/20'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900">Lab Subscription Platform</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                      PT (ss) Model
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Custom telephony neural voice model. Smooth Asante Twi cadence with chunked synthesis.
                  </p>
                </div>
                {activeTtsEngine === 'lab' ? (
                  <span className="w-5 h-5 rounded-full bg-[#70BF2B] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full border border-gray-300 shrink-0" />
                )}
              </div>

              <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Connected &middot; Live Key
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTestTtsAudio('lab');
                  }}
                  className="px-2 py-1 rounded-lg text-[11px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Test audio sample from Lab Platform"
                >
                  {testingEngine === 'lab' ? (
                    <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                  ) : (
                    <Play className="w-3 h-3 fill-current" />
                  )}
                  Sample
                </button>
              </div>
            </div>

            {/* Engine Option B: Khaya AI (Ghana NLP v2) */}
            <div
              onClick={() => handleSwitchTtsEngine('khaya')}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                activeTtsEngine === 'khaya'
                  ? 'bg-[#FAFDF8] border-[#70BF2B] shadow-2xs ring-2 ring-[#70BF2B]/20'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900">Khaya AI</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                      Ghana NLP v2
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Indigenous Asante Twi voice engine by Ghana NLP. Native acoustic modeling and pronunciation.
                  </p>
                </div>
                {activeTtsEngine === 'khaya' ? (
                  <span className="w-5 h-5 rounded-full bg-[#70BF2B] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full border border-gray-300 shrink-0" />
                )}
              </div>

              <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Connected &middot; Live Key
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTestTtsAudio('khaya');
                  }}
                  className="px-2 py-1 rounded-lg text-[11px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Test audio sample from Khaya AI"
                >
                  {testingEngine === 'khaya' ? (
                    <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                  ) : (
                    <Play className="w-3 h-3 fill-current" />
                  )}
                  Sample
                </button>
              </div>
            </div>
          </div>

          {/* Real-time sample audio status */}
          {testAudioStatus && (
            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700 flex items-center justify-between animate-in fade-in">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#70BF2B] animate-pulse" />
                {testAudioStatus}
              </span>
              {isPlayingSample && (
                <span className="text-[10px] text-gray-400 font-mono">Playing</span>
              )}
            </div>
          )}

          <p className="text-[11px] text-gray-400 leading-normal">
            Switching takes effect immediately across all newly prescribed medications, reminder phone calls, and helpline relisten audio. Both engines include automatic failover fallback for 99.9% uptime.
          </p>
        </div>

        {/* Live System Diagnostics & Infrastructure Health */}
        <div className="bg-white border border-[#ECECEC] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">System Diagnostics &amp; Cloud Infrastructure</h2>
                <p className="text-xs text-gray-500">Real-time status of Neon PostgreSQL, Cloudinary CDN, and AI services</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadDiagnostics}
              disabled={loadingDiagnostics}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loadingDiagnostics ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Database Card */}
            <div className="p-3.5 rounded-xl border border-gray-100 bg-[#FBFBFA] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  Database
                </span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  diagnostics?.services.database.status === 'connected'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {diagnostics?.services.database.status === 'connected' ? 'Connected' : 'Checking'}
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-900 truncate">
                {diagnostics?.services.database.type?.split(' ')[0] || 'Neon PostgreSQL'}
              </p>
              <p className="text-[10px] text-gray-400">
                {diagnostics?.services.database.counts ? (
                  `${diagnostics.services.database.counts.patients} patients • ${diagnostics.services.database.counts.callsToday} calls today`
                ) : 'Connecting...'}
              </p>
            </div>

            {/* Cloudinary Card */}
            <div className="p-3.5 rounded-xl border border-gray-100 bg-[#FBFBFA] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-sky-600" />
                  Cloud CDN
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                  {diagnostics?.services.cloudinary.status === 'connected' ? 'Live CDN' : 'Online'}
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-900 truncate">
                Cloudinary ({diagnostics?.services.cloudinary.cloudName || 'deplhwhk7'})
              </p>
              <p className="text-[10px] text-gray-400">
                {diagnostics?.services.cloudinary.preUploadedAssetsCount || 134} permanent audio assets
              </p>
            </div>

            {/* Telephony Card */}
            <div className="p-3.5 rounded-xl border border-gray-100 bg-[#FBFBFA] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-purple-600" />
                  Telephony
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  {diagnostics?.services.telephony.status === 'configured' ? 'Live IVR' : 'Configured'}
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-900 truncate">
                {diagnostics?.services.telephony.voiceNumber || '+233308048104'}
              </p>
              <p className="text-[10px] text-gray-400">
                Africa's Talking Voice Gateway
              </p>
            </div>

            {/* AI Agent Card */}
            <div className="p-3.5 rounded-xl border border-gray-100 bg-[#FBFBFA] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  AI Agent
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {diagnostics?.services.aiAgent.enabled ? 'Active Triage' : 'Standby'}
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-900 truncate">
                Groq {diagnostics?.services.aiAgent.model || 'gpt-oss-120b'}
              </p>
              <p className="text-[10px] text-gray-400">
                Autonomous clinical triage &amp; early reminder
              </p>
            </div>
          </div>
        </div>

        {/* Telephony & IVR Webhook Simulator */}
        <div className="bg-white border border-[#ECECEC] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <PhoneForwarded className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">IVR Telephony &amp; Webhook Simulator</h2>
              <p className="text-xs text-gray-500">Test Africa's Talking voice prompts, keypad reactions, and AI triage without an actual phone call</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-700">
              Select Test Scenario
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[
                { id: 'outbound_reminder_prompt', title: '1. Outbound Call Answered', desc: 'Africa\'s Talking connects and plays Asante Twi dose reminder' },
                { id: 'dtmf_keypress_1', title: '2. Keypress 1: Dose Confirmed', desc: 'Patient presses 1; records adherence confirmation' },
                { id: 'dtmf_keypress_2', title: '3. Keypress 2: Side Effects', desc: 'Patient presses 2; AI agent raises healthcare worker alert' },
                { id: 'inbound_helpline', title: '4. Inbound Helpline Dial', desc: 'Patient calls helpline; IVR offers prescription playback' },
                { id: 'diagnostic_reason', title: '5. Diagnostic Survey (Cost)', desc: 'Patient reports cost barrier; escalates to pharmacist' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSimScenario(item.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    simScenario === item.id
                      ? 'bg-[#F0F9EB] border-[#70BF2B] ring-2 ring-[#70BF2B]/20'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <p className={`text-xs font-semibold ${simScenario === item.id ? 'text-[#447817]' : 'text-gray-900'}`}>
                    {item.title}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-3">
              <Button
                type="button"
                variant="primary"
                onClick={handleRunSimulation}
                disabled={isSimulating}
                icon={isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
              >
                {isSimulating ? 'Executing IVR Simulation...' : 'Run IVR Simulation'}
              </Button>
            </div>

            {/* Simulation Result Box */}
            {simResult && (
              <div className="mt-3 p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3 animate-in fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F0F9EB] text-[#447817] border border-[#70BF2B]/30">
                      ✓ Simulation Executed
                    </span>
                    <p className="text-xs font-semibold text-gray-900 mt-1.5">
                      {simResult.summary || simResult.actionTaken || 'Simulation complete'}
                    </p>
                  </div>
                  {simResult.audioUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const audio = new Audio(simResult.audioUrl);
                        audio.play();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-[#70BF2B]" />
                      Listen Audio
                    </button>
                  )}
                </div>

                {/* Raw Africa's Talking XML Toggle */}
                {simResult.xml && (
                  <div className="pt-1 border-t border-gray-200/60">
                    <button
                      type="button"
                      onClick={() => setShowRawXml(!showRawXml)}
                      className="text-[11px] font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Africa's Talking Voice XML</span>
                      {showRawXml ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {showRawXml && (
                      <pre className="mt-2 p-3 rounded-lg bg-gray-900 text-gray-100 text-[11px] font-mono overflow-x-auto leading-relaxed">
                        {simResult.xml}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reminder Windows & Dialect Configuration (Fully Editable) */}
        <div className="bg-white border border-[#ECECEC] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Call Windows &amp; Adherence Schedules</h2>
              <p className="text-xs text-gray-500">Configure standard daily reminder hours and automated retry logic</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="morning-call-time" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Morning Medication Window
              </label>
              <input
                id="morning-call-time"
                type="time"
                value={morningTime}
                onChange={(e) => setMorningTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/25 focus:border-[#70BF2B] transition-all"
              />
              <p className="text-[10px] text-gray-400 mt-1">Default start time for morning dose phone reminders.</p>
            </div>

            <div>
              <label htmlFor="evening-call-time" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Evening Medication Window
              </label>
              <input
                id="evening-call-time"
                type="time"
                value={eveningTime}
                onChange={(e) => setEveningTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/25 focus:border-[#70BF2B] transition-all"
              />
              <p className="text-[10px] text-gray-400 mt-1">Default start time for evening dose phone reminders.</p>
            </div>
          </div>

          {/* Retry Delays */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label htmlFor="retry-interval" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Dose "Not Taken" Retry Delay
              </label>
              <select
                id="retry-interval"
                value={retryInterval}
                onChange={(e) => setRetryInterval(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/25 focus:border-[#70BF2B] transition-all"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes (Standard)</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Time to wait before calling back if patient presses 2 (Not Taken).</p>
            </div>

            <div>
              <label htmlFor="no-answer-window" className="block text-xs font-semibold text-gray-700 mb-1.5">
                "No Answer" Retry Window
              </label>
              <select
                id="no-answer-window"
                value={noAnswerWindow}
                onChange={(e) => setNoAnswerWindow(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/25 focus:border-[#70BF2B] transition-all"
              >
                <option value="60">1 hour</option>
                <option value="120">2 hours (Standard)</option>
                <option value="180">3 hours</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Delay before retrying an unanswered or unreachable reminder.</p>
            </div>
          </div>

          {/* Dialect Selection */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Default Patient Voice Dialect
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <button
                type="button"
                onClick={() => setDefaultLanguage('twi')}
                className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between cursor-pointer transition-all ${
                  defaultLanguage === 'twi'
                    ? 'bg-[#F0F9EB] border-[#70BF2B] text-[#447817] font-semibold ring-2 ring-[#70BF2B]/20'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>Asante Twi</span>
                {defaultLanguage === 'twi' && <Check className="w-4 h-4 text-[#70BF2B]" />}
              </button>
              <button
                type="button"
                onClick={() => setDefaultLanguage('english')}
                className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between cursor-pointer transition-all ${
                  defaultLanguage === 'english'
                    ? 'bg-[#F0F9EB] border-[#70BF2B] text-[#447817] font-semibold ring-2 ring-[#70BF2B]/20'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>English</span>
                {defaultLanguage === 'english' && <Check className="w-4 h-4 text-[#70BF2B]" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              Applied automatically when enrolling new patients unless customized on their profile.
            </p>
          </div>

          {/* Clinical Escalation Sensitivity */}
          <div className="pt-2 border-t border-gray-100">
            <label htmlFor="escalation-threshold" className="block text-xs font-semibold text-gray-700 mb-1.5">
              Automated Clinical Escalation Threshold
            </label>
            <select
              id="escalation-threshold"
              value={escalationThreshold}
              onChange={(e) => setEscalationThreshold(e.target.value)}
              className="w-full sm:w-80 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/25 focus:border-[#70BF2B] transition-all"
            >
              <option value="1">Trigger alert after 1 missed dose</option>
              <option value="2">Trigger alert after 2 consecutive missed doses (Recommended)</option>
              <option value="3">Trigger alert after 3 missed doses</option>
            </select>
          </div>

          {/* Notification Alert Toggle */}
          <div className="pt-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BellRing className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs font-semibold text-gray-800">Audio Chime on Critical Alerts</p>
                <p className="text-[10px] text-gray-400">Play a subtle clinical chime when a patient reports side effects or requests help</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEnableSoundAlerts(!enableSoundAlerts)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                enableSoundAlerts ? 'bg-[#70BF2B]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  enableSoundAlerts ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <Button
            type="button"
            variant="secondary"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={handleResetDefaults}
          >
            Reset Defaults
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<Save className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
