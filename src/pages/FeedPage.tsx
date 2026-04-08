import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, Play, Pause } from 'lucide-react';
import { useMixerStore } from '../store/mixerStore';
import { useAudioEngineContext } from '../components/AudioEngineProvider';
import { fetchSounds, fetchPublicMixes } from '../services/api';
import { FEED_FILTERS } from '../data/feed';
import { logMixPlay } from '../services/api';
import { toast } from '../components/Toast';
import type { Mix, Sound } from '../types';

export const FeedPage: React.FC = () => {
  const [query, setQuery]       = useState('');
  const [filter, setFilter]     = useState('All');
  const [apiMixes, setApiMixes] = useState<Mix[]>([]);
  const [mixesLoading, setMixesLoading] = useState(true);

  const soundsCacheRef = useRef<Sound[]>([]);

  useEffect(() => {
    fetchSounds().then(data => { soundsCacheRef.current = data; });
    fetchPublicMixes().then(mixes => {
      setApiMixes(mixes.length > 0 ? mixes : []);
      setMixesLoading(false);
    }).catch(() => setMixesLoading(false));
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
      m.name.toLowerCase().includes(q) || (m.user ?? '').toLowerCase().includes(q)
    );
    return list;
  }, [query, filter, savedMixes, apiMixes]);

  const playingMix = allMixes.find(m => m._id === feedPlayingId);
  const isThisPlaying = (id: string) => feedPlayingId === id && isPlaying;

  const handlePlay = useCallback(async (mix: Mix) => {
    if (feedPlayingId === mix._id) {
      if (isPlaying) { engine.pauseAll(); setPlaying(false); engine.setMediaSessionState('paused'); }
      else           { engine.resumeAll(); setPlaying(true); engine.setMediaSessionState('playing'); }
      return;
    }

    engine.stopAll();
    setFeedPlayingId(mix._id);

    const sounds = soundsCacheRef.current;
    const newTracks = mix.tracks.map(td => {
      const s = sounds.find(x => String(x.id) === String(td.soundId._id));
      const url = s?.audioUrl ?? '';
      return {
        soundId: String(td.soundId),
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

    newTracks.forEach(t => engine.play(t.soundId, t.url, t.volume));
    setPlaying(true);

    // Sync OS media controls
    engine.syncMediaSession(
      { title: mix.name, artist: mix.user ?? 'Serene Community' },
      {
        onPlay:  () => { engine.resumeAll(); setPlaying(true); },
        onPause: () => { engine.pauseAll();  setPlaying(false); },
        onStop:  () => { engine.stopAll();   setPlaying(false); setFeedPlayingId(''); },
      },
    );

    try { await logMixPlay(mix._id); } catch { /* non-critical */ }
    toast(`Now playing: ${mix.name}`);
  }, [feedPlayingId, isPlaying, engine, setFeedPlayingId, loadTracks, setMixName, setMixDesc, setPlaying]);

  const handleOpenInStudio = (mix: Mix) => {
    handlePlay(mix);
    setPage('studio');
  };

  return (
    <div className="flex-1 overflow-y-auto px-7 py-7">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-['Instrument_Serif'] italic text-[32px] text-[var(--bright)] mb-1.5">
          Community Mixes
        </h1>
        <p className="text-sm text-[var(--mid)]">
          Discover soundscapes crafted by the Serene community
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-[var(--ink3)] border border-[var(--line)] rounded-2xl
        px-4 py-3 mb-5">
        <Search size={16} className="text-[var(--mid)] flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search mixes, creators…"
          className="flex-1 bg-transparent border-none outline-none text-sm
            text-[var(--bright)] placeholder:text-[var(--dim)]"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FEED_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`
              text-sm font-medium px-4 py-2 rounded-full border transition-all duration-150
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
        <div className="flex items-center gap-4 bg-[var(--sage3)] border border-[rgba(126,184,160,0.25)]
          rounded-2xl px-5 py-4 mb-6 anim-fade">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
            <img
              src={import.meta.env.BASE_URL + `sound_icons/${playingMix.icon}.svg`}
              alt={playingMix.icon}
              className="w-6 h-6"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--sage)]">Now playing</p>
            <p className="text-sm text-[var(--bright)] truncate">{playingMix.name}</p>
          </div>
          <button
            onClick={() => handleOpenInStudio(playingMix)}
            className="text-xs text-[var(--sage)] border border-[rgba(126,184,160,0.3)]
              px-3 py-1.5 rounded-xl hover:bg-[rgba(126,184,160,0.1)] transition-colors flex-shrink-0"
          >
            Open in Studio →
          </button>
        </div>
      )}

      {/* Grid */}
      {mixesLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-[var(--dim)]">
          <span className="text-4xl opacity-40 animate-pulse">🎵</span>
          <p className="text-sm">Loading mixes…</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-[var(--dim)]">
          <span className="text-5xl opacity-30">🎵</span>
          <p className="text-sm">No mixes found</p>
        </div>
      ) : (
        <div className="feed-grid">
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
      className="group bg-[var(--ink3)] border border-[var(--line)] rounded-2xl p-5
        cursor-pointer transition-all duration-200 hover:border-[var(--line2)]
        hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,.4)]
        relative overflow-hidden anim-fade"
      style={style}
      onClick={onPlay}
    >
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--sage)] to-[var(--indigo)]
        opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Card header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-13 h-13 rounded-xl bg-white flex items-center justify-center text-xl flex-shrink-0"
          style={{ width: 52, height: 52 }}>
          <img
            src={import.meta.env.BASE_URL + `sound_icons/${mix.icon}.svg`}
            alt={mix.icon}
            className="w-7 h-7"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-[var(--bright)] truncate">{mix.name}</p>
          <p className="text-xs text-[var(--mid)] mt-0.5">
            👤 {mix.isOwn ? 'You' : mix.user ?? 'anonymous'}
          </p>
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tags.map(tag => (
            <span
              key={tag}
              className="text-xs px-2.5 py-1 rounded-full
                bg-[var(--ink4)] text-[var(--muted)] border border-[var(--line)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--mid)]">▶ {plays.toLocaleString()} plays</span>
        <button
          onClick={e => { e.stopPropagation(); onPlay(); }}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center
            bg-[var(--sage2)] text-white transition-all duration-150
            hover:bg-[var(--sage)] hover:scale-110
            ${playing ? 'pulse-ring' : ''}
          `}
        >
          {playing
            ? <Pause size={14} fill="white" />
            : <Play  size={14} fill="white" className="translate-x-0.5" />
          }
        </button>
      </div>
    </div>
  );
};
