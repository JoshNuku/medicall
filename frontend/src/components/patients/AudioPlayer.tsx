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
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  title = 'Medication Instruction',
  language = 'twi',
  durationSeconds = 18,
  audioUrl,
  compact = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(durationSeconds);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.85);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const realAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
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
      setIsPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
      audio.src = '';
      realAudioRef.current = null;
    };
  }, [audioUrl, durationSeconds, isMuted, playbackSpeed]);

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

  useEffect(() => {
    if (audioUrl && realAudioRef.current) {
      if (isPlaying) {
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
  }, [audioUrl, durationSeconds, isPlaying, startSyntheticAudio, stopSyntheticAudio]);

  const togglePlay = () => {
    if (audioUrl && realAudioRef.current) {
      const nextState = !isPlaying;
      setIsPlaying(nextState);
      if (nextState) {
        realAudioRef.current.currentTime = currentTime > 0 ? currentTime : 0;
        realAudioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        realAudioRef.current.pause();
      }
      return;
    }

    if (currentTime >= durationSeconds) {
      setCurrentTime(0);
    }
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    if (audioUrl && realAudioRef.current) {
      realAudioRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(true);
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
