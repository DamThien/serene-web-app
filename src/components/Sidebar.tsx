import React, { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import { fetchSounds, fetchCategories } from '../services/api';
import type { Category } from '../services/api';
import { FALLBACK_CATEGORIES } from '../data/sounds';
import type { Sound } from '../types';
import { SoundCard } from './SoundCard';

const ALL_CATEGORY: Category = { id: 'all', name: 'All', color: '#eeeef8' };

/** Build initial category list from fallback so UI isn't blank on first render */
const INITIAL_CATEGORIES: Category[] = [
  ALL_CATEGORY,
  ...FALLBACK_CATEGORIES.filter(c => c.name !== 'All').map(c => ({
    id: c.name.toLowerCase().replace(/\s+/g, '-'),
    name: c.name,
    color: c.color,
  })),
];

export const Sidebar: React.FC = () => {
  const [query, setQuery]       = useState('');
  const [cat, setCat]           = useState('All');
  const [freeOnly, setFreeOnly] = useState(false);

  const [sounds, setSounds]         = useState<Sound[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [loading, setLoading]       = useState(true);

  // Fetch categories once on mount
  useEffect(() => {
    fetchCategories().then(cats => {
      setCategories([ALL_CATEGORY, ...cats]);
    });
  }, []);

  // Fetch sounds whenever category / freeOnly changes
  useEffect(() => {
    fetchSounds({
      category: cat !== 'All' ? cat : undefined,
      isFree: freeOnly || undefined,
    }).then(data => {
      setLoading(true);
      setSounds(data);
      setLoading(false);
    });
  }, [cat, freeOnly]);

  const filtered = useMemo(() => {
    if (!query) return sounds;
    const q = query.toLowerCase();
    return sounds.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.categoryname.toLowerCase().includes(q)
    );
  }, [sounds, query]);

  return (
    <div
      className="flex flex-col border-r border-[var(--line)] overflow-hidden"
      style={{ width: 280, flexShrink: 0 }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0 border-b border-[var(--line)]">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--mid)] mb-3">
          Sound Library
        </p>
        {/* Search */}
        <div className="flex items-center gap-2 bg-[var(--ink3)] border border-[var(--line)] rounded-lg px-2.5 py-1.5">
          <Search size={13} className="text-[var(--mid)] flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search sounds…"
            className="flex-1 bg-transparent border-none outline-none text-[12px] text-[var(--bright)] placeholder:text-[var(--dim)]"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-1.5 px-3 py-2.5 overflow-x-auto flex-shrink-0 scrollbar-none">
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setCat(c.name)}
            className={`
              text-[11px] font-medium px-2.5 py-1 rounded-full border whitespace-nowrap
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
      <div className="flex items-center gap-2 px-4 pb-2 flex-shrink-0">
        <button
          role="switch"
          aria-checked={freeOnly}
          onClick={() => setFreeOnly(v => !v)}
          className={`
            relative w-8 h-4.5 rounded-full border transition-all duration-200 flex-shrink-0
            ${freeOnly ? 'bg-[var(--sage2)] border-[var(--sage)]' : 'bg-[var(--ink4)] border-[var(--line2)]'}
          `}
          style={{ height: 18, width: 32 }}
        >
          <span
            className={`
              absolute top-0.5 w-3 h-3 rounded-full transition-all duration-200
              ${freeOnly ? 'left-4 bg-white' : 'left-0.5 bg-[var(--mid)]'}
            `}
          />
        </button>
        <span className="text-[11px] text-[var(--mid)] select-none">Free only</span>
        <span className="ml-auto text-[10px] text-[var(--dim)]">{filtered.length}</span>
      </div>

      {/* Sound list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-[var(--dim)]">
            <span className="text-2xl opacity-40 animate-pulse">🎵</span>
            <span className="text-[12px]">Loading sounds…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-[var(--dim)]">
            <span className="text-2xl opacity-40">🔍</span>
            <span className="text-[12px]">No sounds found</span>
          </div>
        ) : (
          filtered.map(s => <SoundCard key={s.id} sound={s} />)
        )}
      </div>
    </div>
  );
};
