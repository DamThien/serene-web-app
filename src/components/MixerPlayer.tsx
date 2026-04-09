import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, Crown, Pause, Play, Save, Square, Volume2 } from 'lucide-react';
import { useMixerStore } from '../store/mixerStore';
import { createMix, isAuthenticated } from '../services/api';
import { useAudioEngineContext } from './AudioEngineProvider';
import { WaveformViz } from './WaveformViz';
import { toast } from './Toast';

export const MixerPlayer: React.FC = () => {
  const tracks = useMixerStore((state) => state.tracks);
  const isPlaying = useMixerStore((state) => state.isPlaying);
  const setPlaying = useMixerStore((state) => state.setPlaying);
  const mixName = useMixerStore((state) => state.mixName);
  const mixDesc = useMixerStore((state) => state.mixDesc);
  const isPublic = useMixerStore((state) => state.isPublic);
  const masterVolume = useMixerStore((state) => state.masterVolume);
  const setMasterVolume = useMixerStore((state) => state.setMasterVolume);
  const sleepMins = useMixerStore((state) => state.sleepMins);
  const setSleepMins = useMixerStore((state) => state.setSleepMins);
  const addSavedMix = useMixerStore((state) => state.addSavedMix);
  const selectedSilentFrequencies = useMixerStore((state) => state.selectedSilentFrequencies);
  const selectedFrequencyLayer = useMixerStore((state) => state.selectedFrequencyLayer);
  const premiumUnlocked = useMixerStore((state) => state.isPremiumUnlocked());

  const engine = useAudioEngineContext();
  const analyser = engine.getAnalyser();
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerBtnRef = useRef<HTMLButtonElement>(null);
  const timerDDRef = useRef<HTMLDivElement>(null);

  const handlePause = useCallback(() => {
    engine.pauseAll();
    setPlaying(false);
    engine.setMediaSessionState('paused');
  }, [engine, setPlaying]);

  const handleStop = useCallback(() => {
    engine.stopAll();
    setPlaying(false);
    setElapsed(0);
    engine.setMediaSessionState('none');
  }, [engine, setPlaying]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setElapsed((value) => {
          const next = value + 1;

          if (sleepMins > 0 && next >= sleepMins * 60) {
            handleStop();
            toast('Sleep timer ended');
          }

          if (!premiumUnlocked && next >= 30 && tracks.some((track) => track.isPremium)) {
            handlePause();
            toast('Premium preview finished at 30 seconds');
          }

          return next;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [handlePause, handleStop, isPlaying, premiumUnlocked, sleepMins, tracks]);

  const fmt = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  useEffect(() => {
    const hasSolo = tracks.some((track) => track.solo);
    tracks.forEach((track) => {
      if (hasSolo) {
        engine.setMute(track.soundId, !track.solo);
      } else {
        engine.setMute(track.soundId, track.muted);
      }
    });
  }, [engine, tracks]);

  const handlePlay = useCallback(() => {
    if (tracks.length === 0) {
      toast('Add sounds to your mix first');
      return;
    }

    tracks.forEach((track) => {
      if (!track.muted) {
        engine.play(track.soundId, track.url, track.volume);
      }
    });

    setPlaying(true);

    engine.syncMediaSession(
      {
        title: mixName || 'Untitled Mix',
        artist: tracks.map((track) => track.title).join(', '),
      },
      {
        onPlay: handlePlay,
        onPause: handlePause,
        onStop: handleStop,
      },
    );
  }, [engine, handlePause, handleStop, mixName, setPlaying, tracks]);

  const handleTogglePlay = () => (isPlaying ? handlePause() : handlePlay());

  const handleMasterVol = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    setMasterVolume(value);
    engine.setMasterVolume(value);
  };

  const handleSave = async () => {
    if (!isAuthenticated()) {
      toast('Sign in before saving a mix');
      return;
    }

    if (!mixName.trim()) {
      toast('Name your mix first');
      return;
    }

    if (tracks.length === 0) {
      toast('Add at least one sound');
      return;
    }

    setSaving(true);

    try {
      const mix = await createMix({
        name: mixName,
        description: mixDesc,
        icon: tracks[0]?.icon,
        sounds: tracks.map((track) => ({
          soundId: track.soundId,
          volume: Math.round(track.volume * 100),
        })),
        silentFrequencies: selectedSilentFrequencies.map((item) => ({
          silentFrequencyId: item.id,
        })),
        frequencyLayer: selectedFrequencyLayer ? { hz: selectedFrequencyLayer.hz } : null,
        isPublic,
      });

      addSavedMix({
        ...mix,
        icon: mix.icon || tracks[0].icon,
        tags: [...new Set(tracks.map((track) => track.cat.toLowerCase()))],
        isOwn: true,
      });

      toast(isPublic ? 'Mix saved and marked public' : 'Mix saved privately');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save mix');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        timerDDRef.current
        && !timerDDRef.current.contains(event.target as Node)
        && timerBtnRef.current
        && !timerBtnRef.current.contains(event.target as Node)
      ) {
        setTimerOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const timerOptions = [15, 30, 45, 60, 90];
  const nowIcon = tracks[0]?.icon ?? 'melody';
  const nowName = mixName || (tracks.length ? 'Untitled Mix' : 'No mix loaded');
  const nowSub = tracks.length ? tracks.map((track) => track.title).join(' · ') : 'Add sounds to begin';
  const masterPct = Math.round(masterVolume * 100);
  const visibilityLabel = isPublic ? 'Public' : 'Private';

  return (
    <div className="player-bar flex items-center px-5 gap-4 border-t border-[var(--line)] bg-[var(--ink2)] flex-shrink-0 relative z-10">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="player-icon rounded-xl bg-white flex items-center justify-center flex-shrink-0">
          <img
            src={import.meta.env.BASE_URL + `sound_icons/${nowIcon}.svg`}
            alt={nowIcon}
            className="w-8 h-8"
          />
        </div>
        <div className="min-w-0 hidden sm:block">
          <div className="text-sm font-medium text-[var(--bright)] truncate max-w-[200px]">{nowName}</div>
          <div className="text-xs text-[var(--mid)] truncate max-w-[240px] mt-0.5">{nowSub}</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <WaveformViz analyser={analyser} playing={isPlaying} barCount={18} />

        <button
          onClick={handleTogglePlay}
          className="play-btn rounded-full bg-[var(--sage2)] flex items-center justify-center text-white transition-all duration-150 hover:bg-[var(--sage)] hover:scale-105 active:scale-95"
        >
          {isPlaying
            ? <Pause size={22} fill="white" />
            : <Play size={22} fill="white" className="translate-x-0.5" />
          }
        </button>

        <button
          onClick={handleStop}
          title="Stop"
          className="stop-btn rounded-lg border border-[var(--line2)] text-[var(--mid)] flex items-center justify-center transition-all duration-150 hover:bg-[var(--ink3)] hover:text-[var(--soft)]"
        >
          <Square size={15} fill="currentColor" />
        </button>

        <span className="text-sm text-[var(--mid)] tabular-nums w-12 hidden sm:block">{fmt(elapsed)}</span>
      </div>

      <div className="flex items-center gap-3 flex-1 justify-end">
        <div className="hidden md:flex items-center gap-2">
          <Volume2 size={15} className="text-[var(--mid)]" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            onChange={handleMasterVol}
            className="w-24"
            style={{ background: `linear-gradient(to right, var(--soft) ${masterPct}%, var(--ink4) ${masterPct}%)` }}
          />
        </div>

        <div className="relative">
          <button
            ref={timerBtnRef}
            onClick={() => setTimerOpen((value) => !value)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all duration-150 ${sleepMins > 0 ? 'border-[var(--gold)] text-[var(--gold)]' : 'border-[var(--line)] text-[var(--mid)] hover:border-[var(--line2)] hover:text-[var(--soft)]'}`}
          >
            <Clock size={13} />
            <span className="hidden sm:inline">{sleepMins > 0 ? `${sleepMins}m` : 'Timer'}</span>
          </button>

          {timerOpen && (
            <div
              ref={timerDDRef}
              className="absolute bottom-full right-0 mb-2 bg-[var(--ink3)] border border-[var(--line2)] rounded-xl p-2 shadow-[0_8px_32px_rgba(0,0,0,.5)] min-w-[150px] anim-fade z-50"
            >
              {timerOptions.map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => {
                    setSleepMins(minutes);
                    setTimerOpen(false);
                    toast(`Sleep timer: ${minutes} min`);
                  }}
                  className={`w-full text-left text-sm px-4 py-2.5 rounded-lg transition-colors ${sleepMins === minutes ? 'text-[var(--gold)]' : 'text-[var(--soft)] hover:bg-[var(--ink4)]'}`}
                >
                  {minutes} minutes
                </button>
              ))}
              {sleepMins > 0 && (
                <button
                  onClick={() => {
                    setSleepMins(0);
                    setTimerOpen(false);
                    toast('Timer cancelled');
                  }}
                  className="w-full text-left text-sm px-4 py-2.5 rounded-lg text-[var(--blush)] hover:bg-[var(--ink4)] transition-colors border-t border-[var(--line)] mt-1 pt-2.5"
                >
                  Cancel timer
                </button>
              )}
            </div>
          )}
        </div>

        {!premiumUnlocked && tracks.some((track) => track.isPremium) && (
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-[var(--gold)] border border-[rgba(214,178,74,0.25)] rounded-full px-3 py-1.5">
            <Crown size={12} />
            Trial locks after 30s
          </div>
        )}

        <div className="flex flex-col items-end gap-0.5">
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg text-white border-none transition-all duration-150 hover:opacity-85 disabled:opacity-50 ${isPublic ? 'bg-[var(--sage2)]' : 'bg-[#4c4580]'}`}
          >
            <Save size={14} />
            <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save Mix'}</span>
          </button>
          <span className="text-[10px] text-[var(--dim)] cursor-default hidden sm:block">
            {visibilityLabel}
            {selectedSilentFrequencies.length > 0 || selectedFrequencyLayer ? ' with layers' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};
