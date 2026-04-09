import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Sparkles, Waves, X } from 'lucide-react';
import {
  fetchCategories,
  fetchFrequencyLayers,
  fetchSilentFrequencies,
  fetchSounds,
} from '../services/api';
import type { Category } from '../services/api';
import { FALLBACK_CATEGORIES } from '../data/sounds';
import { useMixerStore } from '../store/mixerStore';
import type { FrequencyLayer, SilentFrequency, Sound } from '../types';
import { SoundCard } from './SoundCard';
import { toast } from './Toast';

const ALL_CATEGORY: Category = { id: 'all', name: 'All', color: '#eeeef8' };
const ROW_HEIGHT = 76;
const OVERSCAN = 6;

const INITIAL_CATEGORIES: Category[] = [
  ALL_CATEGORY,
  ...FALLBACK_CATEGORIES.filter((category) => category.name !== 'All').map((category) => ({
    id: category.name.toLowerCase().replace(/\s+/g, '-'),
    name: category.name,
    color: category.color,
  })),
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onMobileClose }) => {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All');
  const [freeOnly, setFreeOnly] = useState(false);
  const [allSounds, setAllSounds] = useState<Sound[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [silentFrequencies, setSilentFrequencies] = useState<SilentFrequency[]>([]);
  const [frequencyLayers, setFrequencyLayers] = useState<FrequencyLayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const selectedSilentFrequencies = useMixerStore((state) => state.selectedSilentFrequencies);
  const selectedFrequencyLayer = useMixerStore((state) => state.selectedFrequencyLayer);
  const toggleSilentFrequency = useMixerStore((state) => state.toggleSilentFrequency);
  const setSelectedFrequencyLayer = useMixerStore((state) => state.setSelectedFrequencyLayer);
  const premiumUnlocked = useMixerStore((state) => state.isPremiumUnlocked());

  const deferredQuery = useDeferredValue(query);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [cats, sounds, silent, layers] = await Promise.all([
          fetchCategories().catch(() => []),
          fetchSounds(),
          fetchSilentFrequencies().catch(() => []),
          fetchFrequencyLayers().catch(() => []),
        ]);

        if (cats.length > 0) {
          setCategories([ALL_CATEGORY, ...cats]);
        }

        setAllSounds(sounds);
        setSilentFrequencies(silent);
        setFrequencyLayers(layers);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;

    const measure = () => setViewportHeight(node.clientHeight);
    measure();
    window.addEventListener('resize', measure);

    return () => window.removeEventListener('resize', measure);
  }, []);

  const filtered = useMemo(() => {
    let list = allSounds;

    if (cat !== 'All') {
      list = list.filter((sound) => sound.categoryname === cat);
    }

    if (freeOnly) {
      list = list.filter((sound) => sound.isFree);
    }

    if (deferredQuery) {
      const normalizedQuery = deferredQuery.toLowerCase();
      list = list.filter((sound) =>
        sound.title.toLowerCase().includes(normalizedQuery)
        || sound.categoryname.toLowerCase().includes(normalizedQuery),
      );
    }

    return list;
  }, [allSounds, cat, deferredQuery, freeOnly]);

  const totalHeight = filtered.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = viewportHeight > 0
    ? Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2
    : 20;
  const endIndex = Math.min(filtered.length, startIndex + visibleCount);
  const visibleSounds = filtered.slice(startIndex, endIndex);
  const offsetY = startIndex * ROW_HEIGHT;

  const handleSilentFrequency = (item: SilentFrequency) => {
    if (item.isPremium && !premiumUnlocked) {
      toast('Silent frequencies are part of Premium');
      return;
    }

    const ok = toggleSilentFrequency(item);
    if (!ok) {
      toast('You can add up to 2 silent frequencies');
      return;
    }

    toast(selectedSilentFrequencies.some((entry) => entry.id === item.id) ? 'Silent frequency removed' : 'Silent frequency added');
  };

  const handleFrequencyLayer = (item: FrequencyLayer) => {
    if (!premiumUnlocked) {
      toast('Frequency layers are part of Premium');
      return;
    }

    const next = selectedFrequencyLayer?.id === item.id ? null : item;
    setSelectedFrequencyLayer(next);
    toast(next ? `Frequency layer ${item.hz} Hz added` : 'Frequency layer removed');
  };

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={onMobileClose} />}

      <div className={`sidebar-panel flex flex-col border-r border-[var(--line)] overflow-hidden bg-[var(--ink)] ${mobileOpen ? 'open' : ''}`}>
        <div className="px-5 pt-5 pb-3 flex-shrink-0 border-b border-[var(--line)]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--mid)]">
              Sound Library
            </p>
            {onMobileClose && (
              <button
                onClick={onMobileClose}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--line)] text-[var(--mid)] hover:text-[var(--soft)]"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5 bg-[var(--ink3)] border border-[var(--line)] rounded-xl px-3 py-2.5">
            <Search size={15} className="text-[var(--mid)] flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sounds..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--bright)] placeholder:text-[var(--dim)]"
            />
          </div>
        </div>

        <div className="flex gap-2 px-4 py-3 overflow-x-auto flex-shrink-0 scrollbar-none">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setCat(category.name)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border whitespace-nowrap transition-all duration-150 flex-shrink-0 ${cat === category.name ? 'bg-[var(--sage3)] border-[var(--sage)] text-[var(--sage)]' : 'border-[var(--line)] text-[var(--mid)] hover:border-[var(--line2)] hover:text-[var(--soft)]'}`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 px-5 pb-3 flex-shrink-0">
          <button
            role="switch"
            aria-checked={freeOnly}
            onClick={() => setFreeOnly((value) => !value)}
            className={`relative rounded-full border transition-all duration-200 flex-shrink-0 ${freeOnly ? 'bg-[var(--sage2)] border-[var(--sage)]' : 'bg-[var(--ink4)] border-[var(--line2)]'}`}
            style={{ height: 22, width: 40 }}
          >
            <span
              className={`absolute top-[3px] w-[14px] h-[14px] rounded-full transition-all duration-200 ${freeOnly ? 'left-[22px] bg-white' : 'left-[3px] bg-[var(--mid)]'}`}
            />
          </button>
          <span className="text-sm text-[var(--mid)] select-none">Free only</span>
          <span className="ml-auto text-xs text-[var(--dim)]">{filtered.length}</span>
        </div>

        <div className="px-4 pb-3 flex-shrink-0 border-b border-[var(--line)] space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--mid)]">
              <Sparkles size={13} />
              <span>Silent Frequencies</span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              {silentFrequencies.slice(0, 8).map((item) => {
                const active = selectedSilentFrequencies.some((entry) => entry.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSilentFrequency(item)}
                    className={`px-3 py-2 rounded-xl border text-left min-w-[140px] transition-all ${active ? 'border-[var(--sage)] bg-[var(--sage3)] text-[var(--sage)]' : 'border-[var(--line)] text-[var(--mid)] hover:border-[var(--line2)] hover:text-[var(--soft)]'}`}
                  >
                    <div className="text-xs font-medium truncate">{item.title}</div>
                    <div className="text-[11px] opacity-80 truncate">{item.subtitle || item.category}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--mid)]">
              <Waves size={13} />
              <span>Frequency Layer</span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              {frequencyLayers.slice(0, 8).map((item) => {
                const active = selectedFrequencyLayer?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleFrequencyLayer(item)}
                    className={`px-3 py-2 rounded-xl border text-left min-w-[120px] transition-all ${active ? 'border-[var(--gold)] bg-[rgba(214,178,74,0.12)] text-[var(--gold)]' : 'border-[var(--line)] text-[var(--mid)] hover:border-[var(--line2)] hover:text-[var(--soft)]'}`}
                  >
                    <div className="text-xs font-medium">{item.hz} Hz</div>
                    <div className="text-[11px] opacity-80 truncate">{item.title}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-3 pb-3"
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-[var(--dim)]">
              <span className="text-3xl opacity-40 animate-pulse">music</span>
              <span className="text-sm">Loading sounds...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-[var(--dim)]">
              <span className="text-3xl opacity-40">search</span>
              <span className="text-sm">No sounds found</span>
            </div>
          ) : (
            <div style={{ height: totalHeight, position: 'relative' }}>
              <div style={{ transform: `translateY(${offsetY}px)` }} className="sidebar-virtual-list">
                {visibleSounds.map((sound) => (
                  <SoundCard key={sound.id} sound={sound} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
