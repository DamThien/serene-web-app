import React, { useState, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { fetchSounds, fetchCategories } from '../services/api';
import type { Category } from '../services/api';
import { FALLBACK_CATEGORIES } from '../data/sounds';
import type { Sound } from '../types';
import { SoundCard } from './SoundCard';

const ALL_CATEGORY: Category = { id: 'all', name: 'All', color: '#eeeef8' };

const INITIAL_CATEGORIES: Category[] = [
  ALL_CATEGORY,
  ...FALLBACK_CATEGORIES.filter(c => c.name !== 'All').map(c => ({
    id: c.name.toLowerCase().replace(/\s+/g, '-'),
    name: c.name,
    color: c.color,
  })),
];

interface SidebarProps {
  /** Mobile: whether the drawer is open */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onMobileClose }) => {
  const [query, setQuery]       = useState('');
  const [cat, setCat]           = useState('All');
  const [freeOnly, setFreeOnly] = useState(false);

  const [allSounds, setAllSounds]   = useState<Sound[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [loading, setLoading]       = useState(true);

  // Fetch everything once on mount — no more re-fetching on filter change
  useEffect(() => {
    fetchCategories().then(cats => setCategories([ALL_CATEGORY, ...cats]));
    fetchSounds().then(data => {
      setAllSounds(data);
      setLoading(false);
    });
  }, []);

  // All filtering is done client-side
  const filtered = useMemo(() => {
    let list = allSounds;
    if (cat !== 'All')  list = list.filter(s => s.categoryname === cat);
    if (freeOnly)       list = list.filter(s => s.isFree);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.categoryname.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allSounds, cat, freeOnly, query]);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={onMobileClose}
        />
      )}

      <div
        className={`sidebar-panel flex flex-col border-r border-[var(--line)] overflow-hidden bg-[var(--ink)] ${mobileOpen ? 'open' : ''}`}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex-shrink-0 border-b border-[var(--line)]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--mid)]">
              Sound Library
            </p>
            {/* Mobile close button */}
            {onMobileClose && (
              <button
                onClick={onMobileClose}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg
                  border border-[var(--line)] text-[var(--mid)] hover:text-[var(--soft)]"
              >
                <X size={15} />
              </button>
            )}
          </div>
          {/* Search */}
          <div className="flex items-center gap-2.5 bg-[var(--ink3)] border border-[var(--line)] rounded-xl px-3 py-2.5">
            <Search size={15} className="text-[var(--mid)] flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search sounds…"
              className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--bright)] placeholder:text-[var(--dim)]"
            />
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto flex-shrink-0 scrollbar-none">
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setCat(c.name)}
              className={`
                text-xs font-medium px-3 py-1.5 rounded-full border whitespace-nowrap
                transition-all duration-150 flex-shrink-0
                ${cat === c.name
                  ? 'bg-[var(--sage3)] border-[var(--sage)] text-[var(--sage)]'
                  : 'border-[var(--line)] text-[var(--mid)] hover:border-[var(--line2)] hover:text-[var(--soft)]'
                }
              `}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Free-only toggle */}
        <div className="flex items-center gap-2.5 px-5 pb-3 flex-shrink-0">
          <button
            role="switch"
            aria-checked={freeOnly}
            onClick={() => setFreeOnly(v => !v)}
            className={`
              relative rounded-full border transition-all duration-200 flex-shrink-0
              ${freeOnly ? 'bg-[var(--sage2)] border-[var(--sage)]' : 'bg-[var(--ink4)] border-[var(--line2)]'}
            `}
            style={{ height: 22, width: 40 }}
          >
            <span
              className={`
                absolute top-[3px] w-[14px] h-[14px] rounded-full transition-all duration-200
                ${freeOnly ? 'left-[22px] bg-white' : 'left-[3px] bg-[var(--mid)]'}
              `}
            />
          </button>
          <span className="text-sm text-[var(--mid)] select-none">Free only</span>
          <span className="ml-auto text-xs text-[var(--dim)]">{filtered.length}</span>
        </div>

        {/* Sound list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-[var(--dim)]">
              <span className="text-3xl opacity-40 animate-pulse">🎵</span>
              <span className="text-sm">Loading sounds…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-[var(--dim)]">
              <span className="text-3xl opacity-40">🔍</span>
              <span className="text-sm">No sounds found</span>
            </div>
          ) : (
            filtered.map(s => <SoundCard key={s.id} sound={s} />)
          )}
        </div>
      </div>
    </>
  );
};
