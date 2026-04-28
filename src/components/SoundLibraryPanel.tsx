import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { fetchCategories, fetchSounds } from '../services/api';
import type { Category } from '../services/api';
import { FALLBACK_CATEGORIES } from '../data/sounds';
import type { Sound } from '../types';
import { SoundCard } from './SoundCard';

const ALL_CATEGORY: Category = { id: 'all', name: 'All', color: '#eeeef8' };
const ROW_HEIGHT = 76;
const OVERSCAN = 6;

interface SoundLibraryPanelProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const SoundLibraryPanel: React.FC<SoundLibraryPanelProps> = ({ mobileOpen = false, onMobileClose }) => {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All');
  const [freeOnly, setFreeOnly] = useState(false);
  const [allSounds, setAllSounds] = useState<Sound[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const deferredQuery = useDeferredValue(query);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [cats, sounds] = await Promise.all([
          fetchCategories().catch(() => []),
          fetchSounds(),
        ]);

        if (cats.length > 0) {
          setCategories([ALL_CATEGORY, ...cats]);
        } else {
          setCategories([ALL_CATEGORY, ...FALLBACK_CATEGORIES.filter((category) => category.name !== 'All').map((category) => ({
            id: category.name.toLowerCase().replace(/\s+/g, '-'),
            name: category.name,
            color: category.color,
          }))]);
        }

        setAllSounds(sounds);
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

  return (
    <>
      {mobileOpen && onMobileClose && <div className="sidebar-overlay" onClick={onMobileClose} />}

      <div className={`sidebar-panel flex flex-col border-l border-[var(--line)] overflow-hidden glass-panel ${mobileOpen ? 'open' : ''}`}>
        <div className="px-5 pt-5 pb-3 flex-shrink-0 border-b border-[var(--line)] bg-[radial-gradient(circle_at_top_right,rgba(163,93,255,0.14),transparent_36%)]">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--mid)]">
            Sound Library
          </p>
          <p className="text-xs text-[var(--dim)] mt-1">
            Pick layers for sleep, focus, or reset.
          </p>
        </div>
        <div className="flex items-center gap-2.5 bg-[var(--surface-strong)] border border-[var(--line)] rounded-[18px] px-3 py-2.5">
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

      <div className="flex gap-2.5 px-4 py-4 overflow-x-auto flex-shrink-0 scrollbar-none">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setCat(category.name)}
            className={`text-sm font-medium px-4 py-2 rounded-full border whitespace-nowrap transition-all duration-150 flex-shrink-0 ${cat === category.name ? 'bg-[var(--sage3)] border-[var(--sage)] text-[var(--sage)]' : 'border-[var(--line)] text-[var(--mid)] hover:border-[var(--line2)] hover:text-[var(--soft)] hover:bg-[var(--surface-elevated)]'}`}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2.5 px-4 pb-3 flex-shrink-0">
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
            <div style={{ transform: `translateY(${offsetY}px)` }} className="sound-library-virtual-list">
              {visibleSounds.map((sound: Sound) => (
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
