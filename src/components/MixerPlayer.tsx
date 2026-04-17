import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, Crown, Pause, Play, Save, Square, Trash2, Volume2 } from 'lucide-react';
import { useMixerStore } from '../store/mixerStore';
import { createMix, deleteMix, isAuthenticated, updateMix } from '../services/api';
import { useAudioEngineContext } from './AudioEngineProvider';
import { toast } from './Toast';

export const MixerPlayer: React.FC = () => {
  const tracks = useMixerStore((state) => state.tracks);
  const isPlaying = useMixerStore((state) => state.isPlaying);
  const setPlaying = useMixerStore((state) => state.setPlaying);
  const playbackStartedAt = useMixerStore((state) => state.playbackStartedAt);
  const playbackAccumulatedMs = useMixerStore((state) => state.playbackAccumulatedMs);
  const startPlaybackClock = useMixerStore((state) => state.startPlaybackClock);
  const pausePlaybackClock = useMixerStore((state) => state.pausePlaybackClock);
  const resetPlaybackClock = useMixerStore((state) => state.resetPlaybackClock);
  const mixName = useMixerStore((state) => state.mixName);
  const mixDesc = useMixerStore((state) => state.mixDesc);
  const isPublic = useMixerStore((state) => state.isPublic);
  const activeMixId = useMixerStore((state) => state.activeMixId);
  const activeMixOwned = useMixerStore((state) => state.activeMixOwned);
  const setActiveMixContext = useMixerStore((state) => state.setActiveMixContext);
  const masterVolume = useMixerStore((state) => state.masterVolume);
  const setMasterVolume = useMixerStore((state) => state.setMasterVolume);
  const sleepMins = useMixerStore((state) => state.sleepMins);
  const setSleepMins = useMixerStore((state) => state.setSleepMins);
  const addSavedMix = useMixerStore((state) => state.addSavedMix);
  const upsertSavedMix = useMixerStore((state) => state.upsertSavedMix);
  const removeSavedMix = useMixerStore((state) => state.deleteSavedMix);
  const resetMix = useMixerStore((state) => state.resetMix);
  const selectedSilentFrequencies = useMixerStore((state) => state.selectedSilentFrequencies);
  const selectedFrequencyLayer = useMixerStore((state) => state.selectedFrequencyLayer);
  const premiumUnlocked = useMixerStore((state) => state.isPremiumUnlocked());

  const engine = useAudioEngineContext();
  const [elapsed, setElapsed] = useState(Math.floor(playbackAccumulatedMs / 1000));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [customTimerMins, setCustomTimerMins] = useState('5');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerBtnRef = useRef<HTMLButtonElement>(null);
  const timerDDRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef(Math.floor(playbackAccumulatedMs / 1000));

  const handlePause = useCallback(() => {
    engine.pauseAll();
    pausePlaybackClock();
    setPlaying(false);
    engine.setMediaSessionState('paused');
  }, [engine, pausePlaybackClock, setPlaying]);

  const handleStop = useCallback(() => {
    engine.stopAll();
    setPlaying(false);
    resetPlaybackClock();
    elapsedRef.current = 0;
    setElapsed(0);
    engine.setMediaSessionState('none');
  }, [engine, resetPlaybackClock, setPlaying]);

  useEffect(() => {
    const baseSeconds = Math.floor(playbackAccumulatedMs / 1000);
    elapsedRef.current = baseSeconds;
    setElapsed(baseSeconds);
  }, [playbackAccumulatedMs]);

  useEffect(() => {
    if (!sleepMins) {
      setRemainingSeconds(0);
      return;
    }

    const remaining = Math.max(0, sleepMins * 60 - elapsedRef.current);
    setRemainingSeconds(remaining);
  }, [sleepMins]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        const runningMs = playbackStartedAt === null
          ? playbackAccumulatedMs
          : playbackAccumulatedMs + Math.max(0, Date.now() - playbackStartedAt);
        const next = Math.floor(runningMs / 1000);
        elapsedRef.current = next;
        const nextRemaining = Math.max(0, sleepMins * 60 - next);

        if (sleepMins > 0) {
          setRemainingSeconds(nextRemaining);
        }

        if (sleepMins > 0 && next >= sleepMins * 60) {
          handleStop();
          setRemainingSeconds(0);
          toast('Sleep timer ended');
          return;
        }

        if (!premiumUnlocked && next >= 30 && tracks.some((track) => track.isPremium)) {
          handlePause();
          setElapsed(next);
          toast('Premium preview finished at 30 seconds');
          return;
        }

        setElapsed(next);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [handlePause, handleStop, isPlaying, playbackAccumulatedMs, playbackStartedAt, premiumUnlocked, sleepMins, tracks]);

  const fmt = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const fmtCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

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

  const handlePlay = useCallback(async () => {
    if (tracks.length === 0) {
      toast('Add sounds to your mix first');
      return;
    }

    try {
      await Promise.all(
        tracks
          .filter((track) => !track.muted)
          .map((track) => engine.play(track.soundId, track.url, track.volume, track.playback)),
      );

      startPlaybackClock();
      setPlaying(true);

      engine.syncMediaSession(
        {
          title: mixName || 'Untitled Mix',
          artist: tracks.map((track) => track.title).join(', '),
        },
        {
          onPlay: () => {
            engine.resumeAll();
            startPlaybackClock();
            setPlaying(true);
          },
          onPause: handlePause,
          onStop: handleStop,
        },
      );
    } catch (error) {
      engine.stopAll();
      resetPlaybackClock();
      setPlaying(false);
      toast(error instanceof Error ? error.message : 'Could not start protected audio');
    }
  }, [engine, handlePause, handleStop, mixName, resetPlaybackClock, setPlaying, startPlaybackClock, tracks]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      handlePause();
      return;
    }

    void handlePlay();
  };

  const handleMasterVol = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    setMasterVolume(value);
    engine.setMasterVolume(value);
  };

  const buildPayload = () => ({
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
      const payload = buildPayload();
      const mix = activeMixId && activeMixOwned
        ? await updateMix(activeMixId, payload)
        : await createMix(payload);

      const normalizedMix = {
        ...mix,
        icon: mix.icon || tracks[0].icon,
        tags: [...new Set(tracks.map((track) => track.cat.toLowerCase()))],
        isOwn: true,
      };

      if (activeMixId && activeMixOwned) {
        upsertSavedMix(normalizedMix);
        toast('Mix updated successfully');
      } else {
        addSavedMix(normalizedMix);
        toast(isPublic ? 'Mix saved to your library' : 'Private mix saved');
      }

      setActiveMixContext(normalizedMix._id, true);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save mix');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeMixId || !activeMixOwned) {
      setConfirmDeleteOpen(false);
      return;
    }

    setDeleting(true);

    try {
      await deleteMix(activeMixId);
      removeSavedMix(activeMixId);
      handleStop();
      resetMix();
      setConfirmDeleteOpen(false);
      toast('Mix deleted');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not delete mix');
    } finally {
      setDeleting(false);
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
  const saveLabel = activeMixId && activeMixOwned ? 'Update Mix' : 'Save Mix';
  const handleSetSleepTimer = (minutes: number) => {
    const normalized = Math.max(1, Math.floor(minutes));
    setSleepMins(normalized);
    setRemainingSeconds(Math.max(0, normalized * 60 - elapsedRef.current));
    setTimerOpen(false);
    toast(`Sleep timer: ${normalized} min`);
  };

  return (
    <>
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

            {sleepMins > 0 && (
              <div className="absolute top-full right-0 mt-1 text-[10px] text-[var(--gold)] tabular-nums whitespace-nowrap">
                Sleep in {fmtCountdown(remainingSeconds)}
              </div>
            )}

            {timerOpen && (
              <div
                ref={timerDDRef}
                className="absolute bottom-full right-0 mb-2 bg-[var(--ink3)] border border-[var(--line2)] rounded-xl p-2 shadow-[0_8px_32px_rgba(0,0,0,.5)] min-w-[190px] anim-fade z-50"
              >
                {timerOptions.map((minutes) => (
                  <button
                    key={minutes}
                    onClick={() => handleSetSleepTimer(minutes)}
                    className={`w-full text-left text-sm px-4 py-2.5 rounded-lg transition-colors ${sleepMins === minutes ? 'text-[var(--gold)]' : 'text-[var(--soft)] hover:bg-[var(--ink4)]'}`}
                  >
                    {minutes} minutes
                  </button>
                ))}
                <div className="border-t border-[var(--line)] mt-1 pt-2">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--mid)] px-2 pb-2">
                    Custom time
                  </div>
                  <div className="flex items-center gap-2 px-2 pb-1">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={customTimerMins}
                      onChange={(event) => setCustomTimerMins(event.target.value)}
                      className="w-full bg-[var(--ink4)] border border-[var(--line)] rounded-lg px-3 py-2 text-sm text-[var(--bright)] outline-none"
                      placeholder="5"
                    />
                    <button
                      onClick={() => {
                        const value = Number(customTimerMins);
                        if (!Number.isFinite(value) || value <= 0) {
                          toast('Enter a valid sleep time');
                          return;
                        }
                        handleSetSleepTimer(value);
                      }}
                      className="px-3 py-2 rounded-lg bg-[var(--sage2)] text-white text-sm"
                    >
                      Set
                    </button>
                  </div>
                </div>
                {sleepMins > 0 && (
                  <button
                    onClick={() => {
                      setSleepMins(0);
                      setRemainingSeconds(0);
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

          {activeMixId && activeMixOwned && (
            <button
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={saving || deleting}
              className="w-10 h-10 rounded-lg border border-[rgba(196,126,142,0.35)] text-[var(--blush)] hover:bg-[rgba(196,126,142,0.08)] transition-all flex items-center justify-center disabled:opacity-50"
              title="Delete mix"
            >
              <Trash2 size={15} />
            </button>
          )}

          <div className="flex flex-col items-end gap-0.5">
            <button
              onClick={() => void handleSave()}
              disabled={saving || deleting}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg text-white border-none transition-all duration-150 hover:opacity-85 disabled:opacity-50 ${isPublic ? 'bg-[var(--sage2)]' : 'bg-[#4c4580]'}`}
            >
              <Save size={14} />
              <span className="hidden sm:inline">{saving ? 'Saving...' : saveLabel}</span>
            </button>
            <span className="text-[10px] text-[var(--dim)] cursor-default hidden sm:block">
              {visibilityLabel}
              {selectedSilentFrequencies.length > 0 || selectedFrequencyLayer ? ' with layers' : ''}
            </span>
          </div>
        </div>
      </div>

      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-6">
          <div className="w-full max-w-sm rounded-3xl border border-[var(--line2)] bg-[var(--ink2)] p-6 shadow-[0_24px_64px_rgba(0,0,0,.55)]">
            <h3 className="font-['Instrument_Serif'] italic text-[26px] text-[var(--bright)] mb-2">
              Delete this mix?
            </h3>
            <p className="text-sm text-[var(--mid)] leading-relaxed mb-6">
              This will remove <span className="text-[var(--soft)]">{mixName || 'this mix'}</span> from your library. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl border border-[var(--line)] text-[var(--soft)] hover:bg-[var(--ink3)] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl bg-[var(--blush)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Mix'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
