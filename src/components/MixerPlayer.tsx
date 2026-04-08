import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Square, Volume2, Clock, Save } from 'lucide-react';
import { useMixerStore } from '../store/mixerStore';
import { useAudioEngineContext } from './AudioEngineProvider';
import { WaveformViz } from './WaveformViz';
import { toast } from './Toast';
import { createMix } from '../services/api';

export const MixerPlayer: React.FC = () => {
  const {
    tracks, isPlaying, setPlaying,
    mixName, mixDesc, isPublic,
    masterVolume, setMasterVolume,
    sleepMins, setSleepMins,
    addSavedMix,
  } = useMixerStore();

  const engine = useAudioEngineContext();
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerBtnRef = useRef<HTMLButtonElement>(null);
  const timerDDRef = useRef<HTMLDivElement>(null);

  // ── Elapsed clock ─────────────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setElapsed(e => {
          const next = e + 1;
          if (sleepMins > 0 && next >= sleepMins * 60) {
            handleStop();
            toast('Sleep timer ended — sweet dreams 🌙');
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, sleepMins]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '00')}`;

  // ── Solo routing ──────────────────────────────────────
  useEffect(() => {
    const hasSolo = tracks.some(t => t.solo);
    tracks.forEach(t => {
      if (hasSolo) { engine.setMute(t.soundId, !t.solo); }
      else         { engine.setMute(t.soundId, t.muted); }
    });
  }, [tracks]);

  // ── Controls ──────────────────────────────────────────
  const handlePlay = useCallback(() => {
    if (tracks.length === 0) { toast('Add sounds to your mix first'); return; }
    tracks.forEach(t => { if (!t.muted) engine.play(t.soundId, t.url, t.volume); });
    setPlaying(true);

    // Sync OS media controls (headphones, lock screen, keyboard)
    engine.syncMediaSession(
      {
        title:  mixName || 'Untitled Mix',
        artist: tracks.map(t => t.title).join(', '),
      },
      {
        onPlay:  handlePlay,
        onPause: handlePause,
        onStop:  handleStop,
      },
    );
  }, [tracks, engine, setPlaying, mixName]);

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

  const handleTogglePlay = () => isPlaying ? handlePause() : handlePlay();

  const handleMasterVol = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setMasterVolume(v);
    engine.setMasterVolume(v);
  };

  // ── Save ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!mixName.trim()) { toast('Name your mix first'); return; }
    if (tracks.length === 0) { toast('Add at least one sound'); return; }
    setSaving(true);
    try {
      const mix = await createMix({
        name: mixName,
        description: mixDesc,
        tracks: tracks.map(t => ({ soundId: t.soundId, volume: t.volume })),
        isPublic,
      });
      mix.icon = tracks[0].icon;
      mix.tags = [...new Set(tracks.map(t => t.cat.toLowerCase()))];
      mix.isOwn = true;
      addSavedMix(mix);
      toast(isPublic ? '✓ Saved & shared to Community' : '✓ Mix saved privately');
    } finally {
      setSaving(false);
    }
  };

  // ── Timer dropdown ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        timerDDRef.current && !timerDDRef.current.contains(e.target as Node) &&
        timerBtnRef.current && !timerBtnRef.current.contains(e.target as Node)
      ) setTimerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const TIMER_OPTS = [15, 30, 45, 60, 90];
  const nowIcon = tracks[0]?.icon ?? 'melody';
  const nowName = mixName || (tracks.length ? 'Untitled Mix' : 'No mix loaded');
  const nowSub  = tracks.length ? tracks.map(t => t.title).join(' · ') : 'Add sounds to begin';
  const masterPct = Math.round(masterVolume * 100);
  const visibilityLabel = isPublic ? '🌐 Public' : '🔒 Private';
  const visibilityTip   = isPublic ? 'Will be shared to Community feed' : 'Only visible to you';

  return (
    <div className="player-bar flex items-center px-5 gap-4 border-t border-[var(--line)] bg-[var(--ink2)] flex-shrink-0 relative z-10">

      {/* LEFT — now playing */}
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

      {/* CENTER — waveform + transport */}
      <div className="flex items-center gap-4">
        <WaveformViz playing={isPlaying} barCount={14} />

        <button
          onClick={handleTogglePlay}
          className="play-btn rounded-full bg-[var(--sage2)] flex items-center justify-center
            text-white transition-all duration-150 hover:bg-[var(--sage)] hover:scale-105 active:scale-95"
        >
          {isPlaying
            ? <Pause size={22} fill="white" />
            : <Play  size={22} fill="white" className="translate-x-0.5" />
          }
        </button>

        <button
          onClick={handleStop}
          title="Stop"
          className="stop-btn rounded-lg border border-[var(--line2)] text-[var(--mid)]
            flex items-center justify-center transition-all duration-150
            hover:bg-[var(--ink3)] hover:text-[var(--soft)]"
        >
          <Square size={15} fill="currentColor" />
        </button>

        <span className="text-sm text-[var(--mid)] tabular-nums w-12 hidden sm:block">{fmt(elapsed)}</span>
      </div>

      {/* RIGHT — master vol + timer + save */}
      <div className="flex items-center gap-3 flex-1 justify-end">
        {/* Master volume */}
        <div className="hidden md:flex items-center gap-2">
          <Volume2 size={15} className="text-[var(--mid)]" />
          <input
            type="range"
            min={0} max={1} step={0.01}
            value={masterVolume}
            onChange={handleMasterVol}
            className="w-24"
            style={{ background: `linear-gradient(to right, var(--soft) ${masterPct}%, var(--ink4) ${masterPct}%)` }}
          />
        </div>

        {/* Sleep Timer */}
        <div className="relative">
          <button
            ref={timerBtnRef}
            onClick={() => setTimerOpen(v => !v)}
            className={`
              flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg
              border transition-all duration-150
              ${sleepMins > 0
                ? 'border-[var(--gold)] text-[var(--gold)]'
                : 'border-[var(--line)] text-[var(--mid)] hover:border-[var(--line2)] hover:text-[var(--soft)]'
              }
            `}
          >
            <Clock size={13} />
            <span className="hidden sm:inline">{sleepMins > 0 ? `${sleepMins}m` : 'Timer'}</span>
          </button>

          {timerOpen && (
            <div
              ref={timerDDRef}
              className="absolute bottom-full right-0 mb-2 bg-[var(--ink3)] border border-[var(--line2)]
                rounded-xl p-2 shadow-[0_8px_32px_rgba(0,0,0,.5)] min-w-[150px] anim-fade z-50"
            >
              {TIMER_OPTS.map(m => (
                <button
                  key={m}
                  onClick={() => { setSleepMins(m); setTimerOpen(false); toast(`Sleep timer: ${m} min`); }}
                  className={`
                    w-full text-left text-sm px-4 py-2.5 rounded-lg transition-colors
                    ${sleepMins === m ? 'text-[var(--gold)]' : 'text-[var(--soft)] hover:bg-[var(--ink4)]'}
                  `}
                >
                  {m} minutes
                </button>
              ))}
              {sleepMins > 0 && (
                <button
                  onClick={() => { setSleepMins(0); setTimerOpen(false); toast('Timer cancelled'); }}
                  className="w-full text-left text-sm px-4 py-2.5 rounded-lg text-[var(--blush)] hover:bg-[var(--ink4)] transition-colors border-t border-[var(--line)] mt-1 pt-2.5"
                >
                  Cancel timer
                </button>
              )}
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex flex-col items-end gap-0.5">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`
              flex items-center gap-2 text-sm font-medium px-4 py-2.5
              rounded-lg text-white border-none
              transition-all duration-150 hover:opacity-85 disabled:opacity-50
              ${isPublic ? 'bg-[var(--sage2)]' : 'bg-[#4c4580]'}
            `}
          >
            <Save size={14} />
            <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save Mix'}</span>
          </button>
          <span className="text-[10px] text-[var(--dim)] cursor-default hidden sm:block" title={visibilityTip}>
            {visibilityLabel}
          </span>
        </div>
      </div>
    </div>
  );
};
