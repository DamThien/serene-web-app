import React from 'react';
import { Lock, Globe } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { TrackControl } from '../components/TrackControl';
import { MixerPlayer } from '../components/MixerPlayer';
import { useMixerStore } from '../store/mixerStore';

export const StudioPage: React.FC = () => {
  const { tracks, mixName, mixDesc, isPublic, setMixName, setMixDesc, setPublic } = useMixerStore();
  const hasSolo = tracks.some(t => t.solo);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Main content: sidebar + mixer */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <Sidebar />

        {/* ── Mixer timeline ── */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Mix metadata header */}
          <div className="px-5 pt-4 pb-3 border-b border-[var(--line)] flex-shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <input
                type="text"
                value={mixName}
                onChange={e => setMixName(e.target.value)}
                placeholder="Name your mix…"
                maxLength={60}
                className="flex-1 bg-transparent border-none outline-none text-[22px] text-[var(--bright)]
                  placeholder:text-[var(--dim)] font-['Instrument_Serif'] italic"
              />

              {/* Visibility toggle */}
              <div className="flex rounded-lg border border-[var(--line2)] overflow-hidden flex-shrink-0">
                <button
                  onClick={() => setPublic(false)}
                  className={`
                    flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 transition-all duration-150
                    ${!isPublic ? 'bg-[var(--ink4)] text-[var(--bright)]' : 'text-[var(--mid)] hover:text-[var(--soft)]'}
                  `}
                >
                  <Lock size={10} /> Private
                </button>
                <button
                  onClick={() => setPublic(true)}
                  className={`
                    flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 transition-all duration-150
                    ${isPublic ? 'bg-[var(--ink4)] text-[var(--bright)]' : 'text-[var(--mid)] hover:text-[var(--soft)]'}
                  `}
                >
                  <Globe size={10} /> Public
                </button>
              </div>
            </div>

            <input
              type="text"
              value={mixDesc}
              onChange={e => setMixDesc(e.target.value)}
              placeholder="Short description…"
              maxLength={140}
              className="w-full bg-transparent border-none outline-none text-[12px]
                text-[var(--muted)] placeholder:text-[var(--dim)]"
            />
          </div>

          {/* Track list */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
            {tracks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3
                border border-dashed border-[var(--line2)] rounded-xl min-h-[200px] text-center px-8">
                <span className="text-4xl opacity-30">🎚</span>
                <p className="text-[14px] font-medium text-[var(--mid)]">Your mixer is empty</p>
                <p className="text-[12px] text-[var(--dim)] leading-relaxed max-w-[220px]">
                  Click any sound from the library on the left to add it as a track. Up to 6 tracks.
                </p>
              </div>
            ) : (
              <React.Fragment key="tracks-list">
                {/* Track count badge */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--mid)]">
                    Tracks
                  </span>
                  <span className="text-[10px] text-[var(--dim)]">
                    {tracks.length} / 6
                  </span>
                </div>

                {tracks.map(t => (
                  <TrackControl key={t.soundId} track={t} hasSolo={hasSolo} />
                ))}
              </React.Fragment>
            )}
          </div>
        </div>
      </div>

      {/* Player bar */}
      <MixerPlayer />
    </div>
  );
};