import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, Play, Pause } from 'lucide-react';
import { useMixerStore } from '../store/mixerStore';
import { useAudioEngineContext } from '../components/AudioEngineProvider';
import { fetchSounds, fetchPublicMixes } from '../services/api';
import { 
  // DEMO_MIXES,
  FEED_FILTERS 
} from '../data/feed';
import { logMixPlay } from '../services/api';
import { toast } from '../components/Toast';
import type { Mix, Sound } from '../types';

export const FeedPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [apiMixes, setApiMixes] = useState<Mix[]>([]);
  const [mixesLoading, setMixesLoading] = useState(true);

  // Cache of all sounds fetched from API (for resolving mix tracks → local audio url)
  const soundsCacheRef = useRef<Sound[]>([]);

  useEffect(() => {
    // Fetch sounds cache (needed to resolve soundId → local audioUrl)
    fetchSounds().then(data => {
      soundsCacheRef.current = data;
    });

    // Fetch default mixes from API
    fetchPublicMixes().then(mixes => {
      setApiMixes(mixes.length > 0 ? mixes : []);
      setMixesLoading(false);
    }).catch(() => {
      // setApiMixes(DEMO_MIXES);
      setMixesLoading(false);
    });
  }, []);

  const {
    savedMixes, feedPlayingId, setFeedPlayingId,
    isPlaying, setPlaying,
    loadTracks, setMixName, setMixDesc,
    setPage,
  } = useMixerStore();
  const engine = useAudioEngineContext();

  const publicOwn = savedMixes.filter(m => m.isPublic).map(m => ({ ...m, isOwn: true }));
  const allMixes: Mix[] = [...publicOwn, ...apiMixes];

  const visible = useMemo(() => {
    let list = [...allMixes];
    const q = query.toLowerCase();

    if (filter === 'Popular') list = list.sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0));
    else if (filter !== 'All') {
      const f = filter.toLowerCase();
      list = list.filter(m => m.tags?.some(t => t.toLowerCase().includes(f)));
    }

    if (q) list = list.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.user ?? '').toLowerCase().includes(q)
    );

    return list;
  }, [query, filter, savedMixes, apiMixes]);

  const playingMix = allMixes.find(m => m._id === feedPlayingId);
  const isThisPlaying = (id: string) => feedPlayingId === id && isPlaying;

  const handlePlay = useCallback(async (mix: Mix) => {
    // Same mix — toggle play/pause
    if (feedPlayingId === mix._id) {
      if (isPlaying) { engine.pauseAll(); setPlaying(false); }
      else { engine.resumeAll(); setPlaying(true); }
      return;
    }

    // New mix — stop old, load new tracks
    engine.stopAll();
    setFeedPlayingId(mix._id);

    const sounds = soundsCacheRef.current;

    const newTracks = mix.tracks.map(td => {
      // Match sound by soundId (MongoDB _id string from API)
      const s = sounds.find(x => String(x.id) === String(td.soundId._id));

      // Use the sound's already-resolved local audioUrl (set by mapSound in api.ts)
      // Fallback: if sound not in cache, try DEMO legacy format "s4" → sound4.mp3
      let url: string = ''; // Assign a default value to avoid uninitialized usage
      if (s?.audioUrl) {
        url = s.audioUrl; // already "/mylodies_all_sound/sound26.mp3"
      }

      return {
        soundId: String(td.soundId), // handle both API ObjectId and legacy string
        volume: td.volume,
        loop: true,
        muted: false,
        solo: false,
        title: s?.title ?? `Sound ${td.soundId}`,
        cat: s?.categoryname ?? 'Unknown',
        icon: s?.icon ?? '🎵',
        url,
      };
    });

    loadTracks(newTracks);
    setMixName(mix.name);
    setMixDesc(mix.description ?? '');
    setPlaying(false);

    // Start playback
    newTracks.forEach(t => engine.play(t.soundId, t.url, t.volume));    
    setPlaying(true);

    try { await logMixPlay(mix._id); } catch {
      // non-critical
    }
    toast(`Now playing: ${mix.name}`);
  }, [feedPlayingId, isPlaying, engine, setFeedPlayingId, loadTracks, setMixName, setMixDesc, setPlaying]);

  const handleOpenInStudio = (mix: Mix) => {
    handlePlay(mix);
    setPage('studio');
  };

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-['Instrument_Serif'] italic text-[28px] text-[var(--bright)] mb-1">
          Community Mixes
        </h1>
        <p className="text-[12px] text-[var(--mid)]">
          Discover soundscapes crafted by the Serene community
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[var(--ink3)] border border-[var(--line)] rounded-xl
        px-3.5 py-2.5 mb-4">
        <Search size={14} className="text-[var(--mid)] flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search mixes, creators…"
          className="flex-1 bg-transparent border-none outline-none text-[13px]
            text-[var(--bright)] placeholder:text-[var(--dim)]"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap mb-5">
        {FEED_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`
              text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all duration-150
              ${filter === f
                ? 'bg-[var(--sage3)] border-[var(--sage)] text-[var(--sage)]'
                : 'border-[var(--line)] text-[var(--mid)] hover:border-[var(--line2)] hover:text-[var(--soft)]'
              }
            `}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Now playing banner */}
      {feedPlayingId && playingMix && (
        <div className="flex items-center gap-3 bg-[var(--sage3)] border border-[rgba(126,184,160,0.25)]
          rounded-xl px-4 py-3 mb-5 anim-fade">
          <span className="text-xl bg-white rounded-l bg-white flex items-center justify-center text-xl flex-shrink-0">
            <img
              src={`/sound_icons/${playingMix.icon}.svg`}
              alt={playingMix.icon}
              className="w-6 h-6"
            />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-[var(--sage)]">Now playing</p>
            <p className="text-[13px] text-[var(--bright)] truncate">{playingMix.name}</p>
          </div>
          <button
            onClick={() => handleOpenInStudio(playingMix)}
            className="text-[11px] text-[var(--sage)] border border-[rgba(126,184,160,0.3)]
              px-2.5 py-1 rounded-lg hover:bg-[rgba(126,184,160,0.1)] transition-colors"
          >
            Open in Studio →
          </button>
        </div>
      )}

      {/* Grid */}
      {mixesLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--dim)]">
          <span className="text-3xl opacity-40 animate-pulse">🎵</span>
          <p className="text-[13px]">Loading mixes…</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--dim)]">
          <span className="text-4xl opacity-30">🎵</span>
          <p className="text-[13px]">No mixes found</p>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))' }}>
          {visible.map((m, i) => (
            <MixCard
              key={m._id}
              mix={m}
              playing={isThisPlaying(m._id)}
              onPlay={() => handlePlay(m)}
              style={{ animationDelay: `${i * 0.04}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Mix Card ─────────────────────────────────────────── */
interface CardProps {
  mix: Mix;
  playing: boolean;
  onPlay: () => void;
  style?: React.CSSProperties;
}

const MixCard: React.FC<CardProps> = ({ mix, playing, onPlay, style }) => {
  const tags = mix.tags?.slice(0, 4) ?? [];
  const plays = mix.plays ?? 0;

  return (
    <div
      className="group bg-[var(--ink3)] border border-[var(--line)] rounded-xl p-4
        cursor-pointer transition-all duration-200 hover:border-[var(--line2)]
        hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,.4)]
        relative overflow-hidden anim-fade"
      style={style}
      onClick={onPlay}
    >
      {/* Top accent line on hover */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--sage)] to-[var(--indigo)]
        opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Card header */}
      <div className="flex items-start gap-2.5 mb-3">
        <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-xl flex-shrink-0">
          <img
            src={`/sound_icons/${mix.icon}.svg`}
            alt={mix.icon}
            className="w-6 h-6"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-[var(--bright)] truncate">{mix.name}</p>
          <p className="text-[11px] text-[var(--mid)] mt-0.5">
            👤 {mix.isOwn ? 'You' : mix.user ?? 'anonymous'}
          </p>
        </div>
      </div>

      {/* Track tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.map(tag => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full
                bg-[var(--ink4)] text-[var(--muted)] border border-[var(--line)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[var(--mid)]">
          ▶ {plays.toLocaleString()} plays
        </span>
        <button
          onClick={e => { e.stopPropagation(); onPlay(); }}
          className={`
            w-8 h-8 rounded-full flex items-center justify-center
            bg-[var(--sage2)] text-white transition-all duration-150
            hover:bg-[var(--sage)] hover:scale-110
            ${playing ? 'pulse-ring' : ''}
          `}
        >
          {playing
            ? <Pause size={12} fill="white" />
            : <Play size={12} fill="white" className="translate-x-0.5" />
          }
        </button>
      </div>
    </div>
  );
};