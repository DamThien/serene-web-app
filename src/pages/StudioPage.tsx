import React, { useState } from 'react';
import { Crown, Globe, Lock, Sparkles, Waves } from 'lucide-react';
import { FrequenciesPanel } from '../components/FrequenciesPanel';
import { SoundLibraryPanel } from '../components/SoundLibraryPanel';
import { TrackControl } from '../components/TrackControl';
import { useMixerStore } from '../store/mixerStore';
import { getFallbackMixCoverUrl, getMixCoverUrl } from '../utils/mixCovers';

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
  const [FrequenciesOpen, setFrequenciesOpen] = useState(false);

  const highlightPlan = subscriptionPlans.find((plan) => plan.isPopular) ?? subscriptionPlans[0];
  const studioMixCoverSource = {
    name: mixName || 'Untitled Mix',
    description: mixDesc,
    icon: tracks[0]?.icon,
    tags: tracks.map((track) => track.cat.toLowerCase()),
  };
  const studioCoverUrl = getMixCoverUrl(studioMixCoverSource);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="studio-layout">
        <FrequenciesPanel
          mobileOpen={FrequenciesOpen}
          onMobileClose={() => setFrequenciesOpen(false)}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 pb-4 pt-4 sm:px-6 sm:pt-5 flex-shrink-0">
            <div className="soft-panel rounded-[30px] overflow-hidden">
              <div className="relative overflow-hidden px-5 py-5 sm:px-6 sm:py-6 border-b border-[var(--line)]">
                <img
                  src={studioCoverUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-70"
                  loading="lazy"
                  onError={(event) => {
                    const fallbackUrl = getFallbackMixCoverUrl(studioMixCoverSource);

                    if (event.currentTarget.src !== fallbackUrl) {
                      event.currentTarget.src = fallbackUrl;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--gradient-phase-1)_0%,var(--gradient-phase-2)_44%,var(--gradient-phase-3)_100%)]" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-[var(--gradient-phase-3)] to-[var(--surface-panel)]" />

                <div className="relative flex items-center gap-3 mb-4">
                  <button
                    className="sidebar-toggle"
                    onClick={() => setFrequenciesOpen((prev) => !prev)}
                  >
                    <Sparkles size={15} />
                    {FrequenciesOpen ? 'Hide' : 'Show'}
                  </button>

                  <button
                    className="sidebar-toggle"
                    onClick={() => setSidebarOpen(true)}
                  >
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

                <div className="relative">
                  <input
                    type="text"
                    value={mixDesc}
                    onChange={(event) => setMixDesc(event.target.value)}
                    placeholder="Short description..."
                    maxLength={140}
                    className="w-full bg-transparent border-none outline-none text-sm text-[var(--muted)] placeholder:text-[var(--dim)]"
                  />
                </div>
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
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border border-[rgba(221,45,255,0.28)] bg-[rgba(221,45,255,0.12)] text-[var(--pink)]">
                      <span className="w-2 h-2 rounded-full bg-[var(--pink)]" />
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
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border border-[rgba(163,93,255,0.25)] bg-[var(--purple3)] text-[var(--purple)]"
                >
                  <Sparkles size={10} />
                  {item.title}
                </span>
              ))}
  
              {selectedFrequencyLayer && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border border-[rgba(221,45,255,0.25)] bg-[rgba(221,45,255,0.12)] text-[var(--pink)]]">
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

        <SoundLibraryPanel
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />
      </div>
    </div>
  );
};
