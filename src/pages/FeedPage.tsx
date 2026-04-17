import React, { useState, useMemo, useCallback, useEffect, useRef, useDeferredValue } from 'react';
import { Search, Play, Pause } from 'lucide-react';
import { useMixerStore } from '../store/mixerStore';
import { useAudioEngineContext } from '../components/AudioEngineProvider';
import { fetchSounds, fetchPublicMixes, logMixPlay } from '../services/api';
import { FEED_FILTERS } from '../data/feed';
import { toast } from '../components/Toast';
import type { Mix, Sound } from '../types';

const resolveSoundId = (value: unknown) => {
  if (value && typeof value === 'object') {
    const sound = value as { _id?: string; id?: string };
    return String(sound._id ?? sound.id ?? '');
  }

  return String(value ?? '');
};

const dedupeMixes = (ownMixes: Mix[], mixes: Mix[]) => {
  const ownIds = new Set(ownMixes.map((mix) => mix._id));
  const seenKeys = new Set<string>();

  return mixes.filter((mix) => {
    const sourceId = mix.sourceMixId || '';
    const dedupeKey = sourceId || mix._id;

    if (sourceId && ownIds.has(sourceId)) {
      return false;
    }

    if (!dedupeKey || seenKeys.has(dedupeKey)) {
      return false;
    }

    seenKeys.add(dedupeKey);
    return true;
  });
};

export const FeedPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'community' | 'yours'>('community');
  const [apiMixes, setApiMixes] = useState<Mix[]>([]);
  const [mixesLoading, setMixesLoading] = useState(true);
  const deferredQuery = useDeferredValue(query);

  const soundsCacheRef = useRef<Sound[]>([]);
  const playLogRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    fetchSounds().then(data => {
      soundsCacheRef.current = data;
    });

    fetchPublicMixes()
      .then(mixes => {
        setApiMixes(mixes.length > 0 ? mixes : []);
        setMixesLoading(false);
      })
      .catch(() => setMixesLoading(false));
  }, []);

  const savedMixes = useMixerStore(state => state.savedMixes);
  const feedPlayingId = useMixerStore(state => state.feedPlayingId);
  const setFeedPlayingId = useMixerStore(state => state.setFeedPlayingId);
  const isPlaying = useMixerStore(state => state.isPlaying);
  const setPlaying = useMixerStore(state => state.setPlaying);
  const startPlaybackClock = useMixerStore(state => state.startPlaybackClock);
  const pausePlaybackClock = useMixerStore(state => state.pausePlaybackClock);
  const resetPlaybackClock = useMixerStore(state => state.resetPlaybackClock);
  const loadTracks = useMixerStore(state => state.loadTracks);
  const setMixName = useMixerStore(state => state.setMixName);
  const setMixDesc = useMixerStore(state => state.setMixDesc);
  const setPublic = useMixerStore(state => state.setPublic);
  const setSelectedSilentFrequencies = useMixerStore(state => state.setSelectedSilentFrequencies);
  const setSelectedFrequencyLayer = useMixerStore(state => state.setSelectedFrequencyLayer);
  const setActiveMixContext = useMixerStore(state => state.setActiveMixContext);
  const setPage = useMixerStore(state => state.setPage);
  const user = useMixerStore(state => state.user);

  const engine = useAudioEngineContext();

  const ownMixes = savedMixes.map(m => ({ ...m, isOwn: true }));
  const publicOwn = ownMixes.filter(m => m.isPublic);
  const communityMixes: Mix[] = dedupeMixes(ownMixes, [...publicOwn, ...apiMixes]);
  const sourceMixes = activeTab === 'community' ? communityMixes : ownMixes;

  const visible = useMemo(() => {
    let list = [...sourceMixes];
    const q = deferredQuery.toLowerCase();

    if (filter === 'Popular') {
      list = list.sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0));
    } else if (filter !== 'All') {
      const f = filter.toLowerCase();
      list = list.filter(m => m.tags?.some(t => t.toLowerCase().includes(f)));
    }

    if (q) {
      list = list.filter(
        m => m.name.toLowerCase().includes(q) || (m.user ?? '').toLowerCase().includes(q),
      );
    }

    return list;
  }, [deferredQuery, filter, sourceMixes]);

  const allMixes = activeTab === 'community' ? communityMixes : ownMixes;
  const playingMix = allMixes.find(m => m._id === feedPlayingId);
  const isThisPlaying = (id: string) => feedPlayingId === id && isPlaying;

  const handlePlay = useCallback(async (mix: Mix) => {
    try {
      if (feedPlayingId === mix._id) {
        if (isPlaying) {
          engine.pauseAll();
          pausePlaybackClock();
          setPlaying(false);
          engine.setMediaSessionState('paused');
        } else {
          engine.resumeAll();
          startPlaybackClock();
          setPlaying(true);
          engine.setMediaSessionState('playing');
        }
        return;
      }

      engine.stopAll();
      resetPlaybackClock();
      setFeedPlayingId(mix._id);

      const sounds = soundsCacheRef.current;
      const newTracks = mix.tracks
        .map(td => {
          const soundId = resolveSoundId(td.soundId);
          const sound = sounds.find(x => String(x.id) === soundId);
          const url = sound?.audioUrl ?? '';

          return {
            soundId,
            volume: td.volume,
            loop: true,
            muted: false,
            solo: false,
            title: sound?.title ?? `Sound ${soundId}`,
            cat: sound?.categoryname ?? 'Unknown',
            icon: sound?.icon ?? 'music',
            url,
            playback: sound?.playback ?? null,
          };
        })
        .filter(track => track.soundId && track.url);

      loadTracks(newTracks);
      setMixName(mix.name);
      setMixDesc(mix.description ?? '');
      setPublic(Boolean(mix.isPublic && mix.isOwn));
      setSelectedSilentFrequencies(mix.silentFrequencies ?? []);
      setSelectedFrequencyLayer(mix.frequencyLayer ?? null);
      setActiveMixContext(mix.isOwn ? mix._id : null, Boolean(mix.isOwn));
      setPlaying(false);

      await Promise.all(
        newTracks.map((track) => engine.play(track.soundId, track.url, track.volume, track.playback)),
      );
      startPlaybackClock();
      setPlaying(true);

      engine.syncMediaSession(
        { title: mix.name, artist: mix.user ?? 'Serene Community' },
        {
          onPlay: () => {
            engine.resumeAll();
            startPlaybackClock();
            setPlaying(true);
          },
          onPause: () => {
            engine.pauseAll();
            pausePlaybackClock();
            setPlaying(false);
          },
          onStop: () => {
            engine.stopAll();
            resetPlaybackClock();
            setPlaying(false);
            setFeedPlayingId('');
          },
        },
      );

      const lastLoggedAt = playLogRef.current.get(mix._id) ?? 0;
      const shouldLogPlay = !mix.isOwn && Date.now() - lastLoggedAt > 30_000;

      if (shouldLogPlay) {
        try {
          await logMixPlay(mix._id);
          playLogRef.current.set(mix._id, Date.now());
        } catch {
          // non-critical
        }
      }

      toast(`Now playing: ${mix.name}`);
    } catch (error) {
      engine.stopAll();
      resetPlaybackClock();
      setPlaying(false);
      setFeedPlayingId(null);
      toast(error instanceof Error ? error.message : 'Could not start protected audio');
    }
  }, [feedPlayingId, isPlaying, engine, pausePlaybackClock, resetPlaybackClock, setFeedPlayingId, loadTracks, setMixName, setMixDesc, setPublic, setSelectedSilentFrequencies, setSelectedFrequencyLayer, setActiveMixContext, setPlaying, startPlaybackClock]);

  const handleOpenInStudio = (mix: Mix) => {
    void handlePlay(mix);
    setPage('studio');
  };

  return (
    <div className="flex-1 overflow-y-auto px-7 py-7">
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <button
            onClick={() => setActiveTab('community')}
            className={`font-['Instrument_Serif'] italic text-[32px] leading-none transition-colors ${activeTab === 'community' ? 'text-[var(--bright)]' : 'text-[var(--mid)] hover:text-[var(--soft)]'}`}
          >
            Community Mixes
          </button>
          <span className="text-[var(--dim)] text-[28px]">/</span>
          <button
            onClick={() => setActiveTab('yours')}
            className={`font-['Instrument_Serif'] italic text-[32px] leading-none transition-colors ${activeTab === 'yours' ? 'text-[var(--bright)]' : 'text-[var(--mid)] hover:text-[var(--soft)]'}`}
          >
            Your Mixes
          </button>
        </div>
        <p className="text-sm text-[var(--mid)]">
          {activeTab === 'community'
            ? 'Discover soundscapes crafted by the Serene community'
            : user
              ? 'Browse the mixes saved to your own account'
              : 'Sign in to see mixes saved to your account'}
        </p>
      </div>

      <div className="flex items-center gap-3 bg-[var(--ink3)] border border-[var(--line)] rounded-2xl px-4 py-3 mb-5">
        <Search size={16} className="text-[var(--mid)] flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={activeTab === 'community' ? 'Search mixes, creators...' : 'Search your mixes...'}
          className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--bright)] placeholder:text-[var(--dim)]"
        />
      </div>

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

      {feedPlayingId && playingMix && (
        <div className="flex items-center gap-4 bg-[var(--sage3)] border border-[rgba(126,184,160,0.25)] rounded-2xl px-5 py-4 mb-6 anim-fade">
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
            className="text-xs text-[var(--sage)] border border-[rgba(126,184,160,0.3)] px-3 py-1.5 rounded-xl hover:bg-[rgba(126,184,160,0.1)] transition-colors flex-shrink-0"
          >
            Open in Studio
          </button>
        </div>
      )}

      {mixesLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-[var(--dim)]">
          <span className="text-4xl opacity-40 animate-pulse">music</span>
          <p className="text-sm">Loading mixes...</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-[var(--dim)]">
          <span className="text-5xl opacity-30">music</span>
          <p className="text-sm">
            {activeTab === 'community'
              ? 'No mixes found'
              : user
                ? 'You have no saved mixes yet'
                : 'Sign in to view your mixes'}
          </p>
        </div>
      ) : (
        <div className="feed-grid">
          {visible.map((m, i) => (
            <MixCard
              key={m._id}
              mix={m}
              playing={isThisPlaying(m._id)}
              onPlay={() => {
                void handlePlay(m);
              }}
              style={{ animationDelay: `${i * 0.04}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

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
      className="group bg-[var(--ink3)] border border-[var(--line)] rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:border-[var(--line2)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,.4)] relative overflow-hidden anim-fade"
      style={style}
      onClick={onPlay}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--sage)] to-[var(--indigo)] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-13 h-13 rounded-xl bg-white flex items-center justify-center text-xl flex-shrink-0"
          style={{ width: 52, height: 52 }}
        >
          <img
            src={import.meta.env.BASE_URL + `sound_icons/${mix.icon}.svg`}
            alt={mix.icon}
            className="w-7 h-7"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-[var(--bright)] truncate">{mix.name}</p>
          <p className="text-xs text-[var(--mid)] mt-0.5">
            User: {mix.isOwn ? 'You' : mix.user ?? 'anonymous'}
          </p>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tags.map(tag => (
            <span
              key={tag}
              className="text-xs px-2.5 py-1 rounded-full bg-[var(--ink4)] text-[var(--muted)] border border-[var(--line)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--mid)]">Play {plays.toLocaleString()} times</span>
        <button
          onClick={e => {
            e.stopPropagation();
            onPlay();
          }}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center
            bg-[var(--sage2)] text-white transition-all duration-150
            hover:bg-[var(--sage)] hover:scale-110
            ${playing ? 'pulse-ring' : ''}
          `}
        >
          {playing
            ? <Pause size={14} fill="white" />
            : <Play size={14} fill="white" className="translate-x-0.5" />
          }
        </button>
      </div>
    </div>
  );
};
