import React, { useState } from 'react';
import { Lock, Globe, PanelLeft } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { TrackControl } from '../components/TrackControl';
import { MixerPlayer } from '../components/MixerPlayer';
import { useMixerStore } from '../store/mixerStore';

export const StudioPage: React.FC = () => {
  const { tracks, mixName, mixDesc, isPublic, setMixName, setMixDesc, setPublic } = useMixerStore();
  const hasSolo = tracks.some(t => t.solo);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Main content */}
      <div className="studio-layout">

        {/* ── Sidebar ── */}
        <Sidebar
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        {/* ── Mixer ── */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Mix metadata header */}
          <div className="px-6 pt-5 pb-4 border-b border-[var(--line)] flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">

              {/* Mobile: sidebar toggle */}
              <button
                className="sidebar-toggle"
                onClick={() => setSidebarOpen(true)}
              >
                <PanelLeft size={15} />
                Sounds
              </button>

              <input
                type="text"
                value={mixName}
                onChange={e => setMixName(e.target.value)}
                placeholder="Name your mix…"
                maxLength={60}
                className="flex-1 bg-transparent border-none outline-none text-2xl text-[var(--bright)]
                  placeholder:text-[var(--dim)] font-['Instrument_Serif'] italic min-w-0"
              />

              {/* Visibility toggle */}
              <div className="flex rounded-xl border border-[var(--line2)] overflow-hidden flex-shrink-0">
                <button
                  onClick={() => setPublic(false)}
                  className={`
                    flex items-center gap-1.5 text-xs font-medium px-3.5 py-2.5 transition-all duration-150
                    ${!isPublic ? 'bg-[var(--ink4)] text-[var(--bright)]' : 'text-[var(--mid)] hover:text-[var(--soft)]'}
                  `}
                >
                  <Lock size={11} /> <span className="hidden sm:inline">Private</span>
                </button>
                <button
                  onClick={() => setPublic(true)}
                  className={`
                    flex items-center gap-1.5 text-xs font-medium px-3.5 py-2.5 transition-all duration-150
                    ${isPublic ? 'bg-[var(--ink4)] text-[var(--bright)]' : 'text-[var(--mid)] hover:text-[var(--soft)]'}
                  `}
                >
                  <Globe size={11} /> <span className="hidden sm:inline">Public</span>
                </button>
              </div>
            </div>

            <input
              type="text"
              value={mixDesc}
              onChange={e => setMixDesc(e.target.value)}
              placeholder="Short description…"
              maxLength={140}
              className="w-full bg-transparent border-none outline-none text-sm
                text-[var(--muted)] placeholder:text-[var(--dim)]"
            />
          </div>

          {/* Track list */}
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3">
            {tracks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4
                border border-dashed border-[var(--line2)] rounded-2xl min-h-[200px] text-center px-8">
                <span className="text-5xl opacity-30">🎚</span>
                <p className="text-base font-medium text-[var(--mid)]">Your mixer is empty</p>
                <p className="text-sm text-[var(--dim)] leading-relaxed max-w-[260px]">
                  Click any sound from the library to add it as a track. Up to 6 tracks.
                  <span className="block md:hidden mt-1 text-[var(--sage)]">
                    Tap "Sounds" above to browse the library.
                  </span>
                </p>
              </div>
            ) : (
              <React.Fragment key="tracks-list">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[var(--mid)]">
                    Tracks
                  </span>
                  <span className="text-xs text-[var(--dim)]">{tracks.length} / 6</span>
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
