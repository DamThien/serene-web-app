import React, { useCallback } from 'react';
import { X, Volume2, VolumeX } from 'lucide-react';
import type { Track } from '../types';
import { useMixerStore } from '../store/mixerStore';
import { useAudioEngineContext } from './AudioEngineProvider';

interface Props { track: Track; hasSolo: boolean; }

export const TrackControl: React.FC<Props> = ({ track, hasSolo }) => {
  const updateVolume = useMixerStore((state) => state.updateVolume);
  const toggleMute = useMixerStore((state) => state.toggleMute);
  const toggleSolo = useMixerStore((state) => state.toggleSolo);
  const removeTrack = useMixerStore((state) => state.removeTrack);
  const engine = useAudioEngineContext();

  const pct = Math.round(track.volume * 100);
  const dimmed = hasSolo && !track.solo;

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    updateVolume(track.soundId, v);
    if (!track.muted) engine.setVolume(track.soundId, v);
  }, [track.soundId, track.muted, updateVolume, engine]);

  const handleMute = useCallback(() => {
    toggleMute(track.soundId);
    engine.setMute(track.soundId, !track.muted);
  }, [track.soundId, track.muted, toggleMute, engine]);

  const handleSolo = useCallback(() => {
    toggleSolo(track.soundId);
  }, [track.soundId, toggleSolo]);

  const handleRemove = useCallback(() => {
    engine.stop(track.soundId);
    removeTrack(track.soundId);
  }, [track.soundId, engine, removeTrack]);

  return (
    <div
      className={`
        track-card soft-panel anim-slide
        transition-all duration-150
        ${track.solo  ? 'border-[var(--gold)]' : ''}
        ${dimmed      ? 'opacity-40' : ''}
        ${track.muted ? 'opacity-50' : ''}
      `}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[var(--card-shadow)]" style={{ background: 'var(--icon-shell)' }}>
          <img
            src={import.meta.env.BASE_URL + `sound_icons/${track.icon}.svg`}
            alt={track.icon}
            className="w-7 h-7"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--bright)] truncate">{track.title}</div>
          <div className="text-xs text-[var(--mid)] mt-0.5">{track.cat}</div>
        </div>
        <div className="flex gap-2">
          {/* Mute */}
          <button
            onClick={handleMute}
            title="Mute"
            className={`
              w-9 h-9 rounded-lg border text-xs font-semibold flex items-center justify-center
              transition-all duration-150
              ${track.muted
                ? 'bg-[var(--blush)] border-[var(--blush)] text-white'
                : 'border-[var(--line)] text-[var(--mid)] hover:border-[var(--line2)] hover:text-[var(--soft)]'
              }
            `}
          >
            M
          </button>
          {/* Solo */}
          <button
            onClick={handleSolo}
            title="Solo"
            className={`
              w-9 h-9 rounded-lg border text-xs font-semibold flex items-center justify-center
              transition-all duration-150
              ${track.solo
                ? 'bg-[var(--gold)] border-[var(--gold)] text-[#1a1400]'
                : 'border-[var(--line)] text-[var(--mid)] hover:border-[var(--line2)] hover:text-[var(--soft)]'
              }
            `}
          >
            S
          </button>
          {/* Remove */}
          <button
            onClick={handleRemove}
            title="Remove"
            className="w-9 h-9 rounded-lg border border-[var(--line)] text-[var(--mid)]
              flex items-center justify-center transition-all duration-150
              hover:border-[rgba(196,126,142,0.4)] hover:text-[var(--blush)]"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Volume row */}
      <div className="flex items-center gap-3">
        {track.muted
          ? <VolumeX size={14} className="text-[var(--mid)] flex-shrink-0" />
          : <Volume2 size={14} className="text-[var(--mid)] flex-shrink-0" />
        }
        <input
          type="range"
          className="vol-slider flex-1"
          min={0} max={1} step={0.01}
          value={track.volume}
          onChange={handleVolume}
          style={{ background: `linear-gradient(to right, var(--sage) ${pct}%, var(--ink4) ${pct}%)` }}
        />
        <span className="text-xs text-[var(--mid)] min-w-[34px] text-right tabular-nums">
          {pct}%
        </span>
      </div>
    </div>
  );
};
