'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface AudioPlayerProps {
  title?: string;
  language?: 'twi' | 'english';
  durationSeconds?: number;
  audioUrl?: string;
  compact?: boolean;
  spokenText?: string;
  appendKeypressTrailer?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  title = 'Medication Instruction',
  language = 'twi',
  durationSeconds = 18,
  audioUrl,
  compact = false,
  spokenText,
  appendKeypressTrailer = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(durationSeconds);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.85);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const realAudioRef = useRef<HTMLAudioElement | null>(null);

  // Remap audio URL if pharmacist chose English but legacy/default audio was Twi
  const effectiveAudioUrl = React.useMemo(() => {
    if (language === 'english') {
      if (!audioUrl || audioUrl.includes('twi') || audioUrl.includes('default-reminder.mp3')) {
        return '/audio/default-reminder-en.mp3';
      }
    }
    return audioUrl || (language === 'english' ? '/audio/default-reminder-en.mp3' : '/audio/default-reminder.mp3');
  }, [audioUrl, language]);

  const playKeypressTrailer = useCallback(() => {
    setIsPlayingTrailer(true);
    const trailerMsg = language === 'english'
      ? 'Press 9 to hear this instruction again, or Press 0 to speak with your pharmacist.'
      : 'Mia nkron sɛ wopɛ sɛ wotie bio, anaa mia hwee ma wo duruyɛfoɔ.';

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(trailerMsg);
      utterance.lang = language === 'english' ? 'en-US' : 'en-GB';
      utterance.rate = playbackSpeed;
      utterance.onend = () => {
        setIsPlaying(false);
        setIsPlayingTrailer(false);
        setCurrentTime(0);
      };
      utterance.onerror = () => {
        setIsPlaying(false);
        setIsPlayingTrailer(false);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        setIsPlaying(false);
        setIsPlayingTrailer(false);
        setCurrentTime(0);
      }, 3500);
    }
  }, [language, playbackSpeed]);

  useEffect(() => {
    if (!effectiveAudioUrl) return;

    const audio = new Audio(effectiveAudioUrl);
    realAudioRef.current = audio;
    audio.muted = isMuted;
    audio.playbackRate = playbackSpeed;
    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration || durationSeconds);
      setCurrentTime(0);
    };
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };
    audio.onended = () => {
      if (appendKeypressTrailer) {
        playKeypressTrailer();
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    return () => {
      audio.pause();
      audio.src = '';
      realAudioRef.current = null;
    };
  }, [effectiveAudioUrl, durationSeconds, isMuted, playbackSpeed, appendKeypressTrailer, playKeypressTrailer]);

  const startSyntheticAudio = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Gentle warm resonant tone sequence
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      // Gentle modulation
      gain.gain.setValueAtTime(isMuted ? 0 : 0.08, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscRef.current = osc;
      gainRef.current = gain;
    } catch {
      // Audio context may not be allowed prior to user interaction
    }
  }, [isMuted]);

  const stopSyntheticAudio = useCallback(() => {
    try {
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current.disconnect();
        oscRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } catch {
      // ignore cleanup errors
    }
  }, []);

  const isSpeechSynthesis = language === 'english' && Boolean(spokenText) && typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Ensure HTML5 audio is NEVER played if speech synthesis is active
  useEffect(() => {
    if (isSpeechSynthesis) {
      if (realAudioRef.current) {
        realAudioRef.current.pause();
        realAudioRef.current.currentTime = 0;
      }
      return;
    }

    if (effectiveAudioUrl && realAudioRef.current) {
      if (isPlaying) {
        // Ensure speech synthesis is cancelled when real audio plays
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        realAudioRef.current.play().catch(() => {
          setIsPlaying(false);
        });
      } else {
        realAudioRef.current.pause();
      }
      return;
    }

    let interval: NodeJS.Timeout;
    if (isPlaying) {
      startSyntheticAudio();
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= durationSeconds) {
            setIsPlaying(false);
            stopSyntheticAudio();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      stopSyntheticAudio();
    }

    return () => {
      clearInterval(interval);
      stopSyntheticAudio();
    };
  }, [isSpeechSynthesis, effectiveAudioUrl, durationSeconds, isPlaying, startSyntheticAudio, stopSyntheticAudio]);

  useEffect(() => {
    if (isSpeechSynthesis && isPlaying) {
      const interval = setInterval(() => {
        setCurrentTime((t) => t + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isSpeechSynthesis, isPlaying]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const playerIdRef = useRef<string>(Math.random().toString(36).substring(7));

  useEffect(() => {
    const handleOtherPlay = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail?.id !== playerIdRef.current) {
        setIsPlaying(false);
        if (realAudioRef.current) {
          realAudioRef.current.pause();
        }
      }
    };
    window.addEventListener('medicall-audio-play', handleOtherPlay);
    return () => window.removeEventListener('medicall-audio-play', handleOtherPlay);
  }, []);

  const togglePlay = () => {
    if (isSpeechSynthesis) {
      if (isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
      } else {
        // Halt any other playing audio on the page
        window.dispatchEvent(new CustomEvent('medicall-audio-play', { detail: { id: playerIdRef.current } }));
        window.speechSynthesis.cancel();
        if (realAudioRef.current) {
          realAudioRef.current.pause();
          realAudioRef.current.currentTime = 0;
        }

        const utterance = new SpeechSynthesisUtterance(spokenText!);
        utterance.lang = 'en-US';
        utterance.rate = playbackSpeed;
        utterance.onend = () => {
          setIsPlaying(false);
          setCurrentTime(0);
        };
        utterance.onerror = () => {
          setIsPlaying(false);
        };
        const estDuration = Math.max(6, Math.ceil(spokenText!.split(' ').length / 2.5));
        setAudioDuration(estDuration);
        setIsPlaying(true);
        window.speechSynthesis.speak(utterance);
      }
      return;
    }

    if (effectiveAudioUrl && realAudioRef.current) {
      const nextState = !isPlaying;
      if (nextState) {
        // Halt any other playing audio on the page
        window.dispatchEvent(new CustomEvent('medicall-audio-play', { detail: { id: playerIdRef.current } }));
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        realAudioRef.current.currentTime = currentTime > 0 ? currentTime : 0;
        realAudioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        realAudioRef.current.pause();
      }
      setIsPlaying(nextState);
      return;
    }

    if (currentTime >= durationSeconds) {
      setCurrentTime(0);
    }
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    if (isSpeechSynthesis) {
      window.dispatchEvent(new CustomEvent('medicall-audio-play', { detail: { id: playerIdRef.current } }));
      window.speechSynthesis.cancel();
      if (realAudioRef.current) {
        realAudioRef.current.pause();
        realAudioRef.current.currentTime = 0;
      }
      setCurrentTime(0);
      const utterance = new SpeechSynthesisUtterance(spokenText!);
      utterance.lang = 'en-US';
      utterance.rate = playbackSpeed;
      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
      return;
    }

    if (effectiveAudioUrl && realAudioRef.current) {
      window.dispatchEvent(new CustomEvent('medicall-audio-play', { detail: { id: playerIdRef.current } }));
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      realAudioRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(true);
      realAudioRef.current.play().catch(() => setIsPlaying(false));
      return;
    }

    setCurrentTime(0);
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (audioUrl && realAudioRef.current) {
      realAudioRef.current.muted = nextMute;
      return;
    }
    if (gainRef.current && audioContextRef.current) {
      gainRef.current.gain.setValueAtTime(nextMute ? 0 : 0.08, audioContextRef.current.currentTime);
    }
  };

  const toggleSpeed = () => {
    const nextSpeed = playbackSpeed === 0.85 ? 1.0 : (playbackSpeed === 1.0 ? 0.75 : 0.85);
    setPlaybackSpeed(nextSpeed);
    if (realAudioRef.current) {
      realAudioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // 18 waveform bar heights representing speech envelope
  const barHeights = [28, 45, 65, 85, 95, 75, 55, 35, 60, 90, 100, 80, 60, 40, 70, 85, 50, 30];

  const displayDuration = audioUrl ? audioDuration : durationSeconds;
  const progressPercent = (currentTime / Math.max(displayDuration, 1)) * 100;

  if (compact) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl">
        <button
          onClick={togglePlay}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-transform active:scale-95 shadow-xs shrink-0 cursor-pointer"
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
        </button>

        <div className="flex items-center gap-1 h-5 flex-1">
          {barHeights.slice(0, 12).map((height, i) => {
            const isPassed = (i / 12) * 100 <= progressPercent;
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-200 ${
                  isPassed ? 'bg-emerald-600' : 'bg-gray-200'
                } ${isPlaying ? 'animate-wave-bar' : ''}`}
                style={{
                  height: `${height}%`,
                  animationDelay: `${(i % 5) * 0.15}s`,
                }}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={toggleSpeed}
          className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          title="Toggle speed"
        >
          {playbackSpeed}x
        </button>

        <span className="text-xs text-gray-500 font-mono shrink-0">
          {formatTime(currentTime)}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF9F6] border border-[#E8E6E0] rounded-2xl p-4 transition-all hover:border-gray-300">
      {/* Top row: Language badge + title */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 truncate">
          <Badge variant="language" language={language} />
          <span className="text-xs font-semibold text-gray-800 truncate tracking-tight">{title}</span>
          {isPlayingTrailer ? (
            <span className="text-[10px] text-emerald-700 bg-emerald-100 font-semibold px-2 py-0.5 rounded-md animate-pulse shrink-0">
              Playing Keypress Menu...
            </span>
          ) : appendKeypressTrailer ? (
            <span className="text-[10px] text-gray-500 bg-gray-100 font-mono px-1.5 py-0.5 rounded border border-gray-200 shrink-0">
              Keypad trailer attached
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSpeed}
            className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded-md bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors shadow-2xs cursor-pointer"
            title="Adjust playback speed for patient clarity"
          >
            {playbackSpeed}x pace
          </button>
          <span className="text-xs text-gray-400 font-mono shrink-0">
            {formatTime(currentTime)} / {formatTime(displayDuration)}
          </span>
        </div>
      </div>

      {/* Main player controls + waveform */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer"
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Custom Animated Waveform */}
        <div
          className="flex-1 flex items-center gap-1.5 h-10 px-3 bg-white border border-gray-200/80 rounded-xl cursor-pointer select-none"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const pct = Math.max(0, Math.min(1, clickX / rect.width));
            setCurrentTime(Math.floor(pct * displayDuration));
          }}
          title="Click to seek"
        >
          {barHeights.map((height, idx) => {
            const barPct = (idx / barHeights.length) * 100;
            const isPlayed = barPct <= progressPercent;

            return (
              <div
                key={idx}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isPlayed ? 'bg-emerald-600' : 'bg-gray-200 hover:bg-gray-300'
                } ${isPlaying && isPlayed ? 'animate-wave-bar' : ''}`}
                style={{
                  height: `${Math.max(20, height)}%`,
                  animationDelay: `${(idx % 6) * 0.12}s`,
                }}
              />
            );
          })}
        </div>

        {/* Secondary controls: restart & mute */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={restart}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Restart audio"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={toggleMute}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
