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
          <div className="px-6 pt-5 pb-4 border-b border-[var(--line)] flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
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
                onChange={(event) => setMixName(event.target.value)}
                placeholder="Name your mix..."
                maxLength={60}
                className="flex-1 bg-transparent border-none outline-none text-2xl text-[var(--bright)] placeholder:text-[var(--dim)] font-['Instrument_Serif'] italic min-w-0"
              />

              <div className="flex rounded-xl border border-[var(--line2)] overflow-hidden flex-shrink-0">
                <button
                  onClick={() => setPublic(false)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3.5 py-2.5 transition-all duration-150 ${!isPublic ? 'bg-[var(--ink4)] text-[var(--bright)]' : 'text-[var(--mid)] hover:text-[var(--soft)]'}`}
                >
                  <Lock size={11} /> <span className="hidden sm:inline">Private</span>
                </button>
                <button
                  onClick={() => setPublic(true)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3.5 py-2.5 transition-all duration-150 ${isPublic ? 'bg-[var(--ink4)] text-[var(--bright)]' : 'text-[var(--mid)] hover:text-[var(--soft)]'}`}
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

            <div className="flex flex-wrap gap-2 mt-4">
              {selectedSilentFrequencies.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-[rgba(126,184,160,0.25)] bg-[var(--sage3)] text-[var(--sage)]"
                >
                  <Sparkles size={12} />
                  {item.title}
                </span>
              ))}

              {selectedFrequencyLayer && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-[rgba(214,178,74,0.25)] bg-[rgba(214,178,74,0.12)] text-[var(--gold)]">
                  <Waves size={12} />
                  {selectedFrequencyLayer.hz} Hz
                </span>
              )}

              {!premiumUnlocked && highlightPlan && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-[var(--line)] text-[var(--mid)]">
                  <Crown size={12} />
                  Unlock add-on layers with {highlightPlan.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3">
            {tracks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 border border-dashed border-[var(--line2)] rounded-2xl min-h-[200px] text-center px-8">
                <span className="text-5xl opacity-30">mix</span>
                <p className="text-base font-medium text-[var(--mid)]">Your mixer is empty</p>
                <p className="text-sm text-[var(--dim)] leading-relaxed max-w-[320px]">
                  Add sounds from the library, then enhance the mix with up to 2 silent frequencies and 1 frequency layer.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1">
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
