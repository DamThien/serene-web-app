import React, { useState } from 'react';
import { Crown, Globe, Lock, PanelLeft, Sparkles, Waves } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { TrackControl } from '../components/TrackControl';
import { useMixerStore } from '../store/mixerStore';

export const StudioPage: React.FC = () => {
  const tracks = useMixerStore((state) => state.tracks);
  const mixName = useMixerStore((state) => state.mixName);
  const mixDesc = useMixerStore((state) => state.mixDesc);
  const isPublic = useMixerStore((state) => state.isPublic);
  const selectedSilentFrequencies = useMixerStore((state) => state.selectedSilentFrequencies);
  const selectedFrequencyLayer = useMixerStore((state) => state.selectedFrequencyLayer);
  const subscriptionPlans = useMixerStore((state) => state.subscriptionPlans);
  const premiumUnlocked = useMixerStore((state) => state.isPremiumUnlocked());
  const setMixName = useMixerStore((state) => state.setMixName);
  const setMixDesc = useMixerStore((state) => state.setMixDesc);
  const setPublic = useMixerStore((state) => state.setPublic);
  const hasSolo = tracks.some((track) => track.solo);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const highlightPlan = subscriptionPlans.find((plan) => plan.isPopular) ?? subscriptionPlans[0];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="studio-layout">
        <Sidebar
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 pb-4 pt-4 sm:px-6 sm:pt-5 flex-shrink-0">
            <div className="soft-panel rounded-[30px] overflow-hidden">
              <div className="px-5 py-5 sm:px-6 sm:py-6 border-b border-[var(--line)] bg-[radial-gradient(circle_at_top_left,rgba(126,184,160,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(123,127,196,0.14),transparent_26%)]">
                <div className="flex items-center gap-3 mb-4">
                  <button
                    className="sidebar-toggle"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <PanelLeft size={15} />
                    Sounds
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--mid)] mb-2">
                      Mix canvas
                    </p>
                    <input
                      type="text"
                      value={mixName}
                      onChange={(event) => setMixName(event.target.value)}
                      placeholder="Name your mix..."
                      maxLength={60}
                      className="w-full bg-transparent border-none outline-none text-2xl sm:text-[2rem] text-[var(--bright)] placeholder:text-[var(--dim)] font-['Instrument_Serif'] italic min-w-0"
                    />
                  </div>

                  <div className="flex rounded-[18px] border border-[var(--line2)] overflow-hidden flex-shrink-0 bg-[var(--surface)]">
                    <button
                      onClick={() => setPublic(false)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3.5 py-2.5 transition-all duration-150 ${!isPublic ? 'bg-[var(--surface-strong)] text-[var(--bright)]' : 'text-[var(--mid)] hover:text-[var(--soft)]'}`}
                    >
                      <Lock size={11} /> <span className="hidden sm:inline">Private</span>
                    </button>
                    <button
                      onClick={() => setPublic(true)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3.5 py-2.5 transition-all duration-150 ${isPublic ? 'bg-[var(--surface-strong)] text-[var(--bright)]' : 'text-[var(--mid)] hover:text-[var(--soft)]'}`}
                    >
                      <Globe size={11} /> <span className="hidden sm:inline">Public</span>
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={mixDesc}
                  onChange={(event) => setMixDesc(event.target.value)}
                  placeholder="Short description..."
                  maxLength={140}
                  className="w-full bg-transparent border-none outline-none text-sm text-[var(--muted)] placeholder:text-[var(--dim)]"
                />
              </div>

              <div className="px-5 py-4 sm:px-6 bg-[var(--surface)]">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--soft)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--sage)]" />
                    {tracks.length} track{tracks.length === 1 ? '' : 's'} in session
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--soft)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--indigo)]" />
                    Calm studio layout
                  </span>
                  {hasSolo && (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border border-[rgba(214,178,74,0.28)] bg-[rgba(214,178,74,0.12)] text-[var(--gold)]">
                      <span className="w-2 h-2 rounded-full bg-[var(--gold)]" />
                      Solo monitoring active
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {selectedSilentFrequencies.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border border-[rgba(126,184,160,0.25)] bg-[var(--sage3)] text-[var(--sage)]"
                >
                  <Sparkles size={10} />
                  {item.title}
                </span>
              ))}
  
              {selectedFrequencyLayer && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border border-[rgba(214,178,74,0.25)] bg-[rgba(214,178,74,0.12)] text-[var(--gold)]">
                  <Waves size={10} />
                  {selectedFrequencyLayer.hz} Hz
                </span>
              )}
  
              {!premiumUnlocked && highlightPlan && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border border-[var(--line)] text-[var(--mid)]">
                  <Crown size={10} />
                  Unlock add-on layers with {highlightPlan.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-5 sm:px-6 flex flex-col gap-3">
            {tracks.length === 0 ? (
              <div className="soft-panel flex-1 flex flex-col items-center justify-center gap-4 border border-dashed border-[var(--line2)] rounded-[30px] min-h-[240px] text-center px-8">
                <span className="text-5xl opacity-30">mix</span>
                <p className="text-base font-medium text-[var(--bright)]">Your mixer is empty</p>
                <p className="text-sm text-[var(--dim)] leading-relaxed max-w-[320px]">
                  Add sounds from the library, then enhance the mix with up to 2 silent frequencies and 1 frequency layer.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1 px-1">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[var(--mid)]">
                    Tracks
                  </span>
                  <span className="text-xs text-[var(--dim)]">{tracks.length} / 6</span>
                </div>

                {tracks.map((track) => (
                  <TrackControl key={track.soundId} track={track} hasSolo={hasSolo} />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
