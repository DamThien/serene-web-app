import React, { useState, useMemo, useCallback, useEffect, useRef, useDeferredValue } from 'react';
import { Clock3, Search, Sparkles, Users, Waves } from 'lucide-react';
import { useMixerStore } from '../store/mixerStore';
import { useAudioEngineContext } from '../components/AudioEngineProvider';
import { fetchSounds, fetchPublicMixes, logMixPlay } from '../services/api';
import { FEED_FILTERS } from '../data/feed';
import { toast } from '../components/Toast';
import type { Mix, Sound } from '../types';
import { MixCard } from '../components/Feed/MixCard';
import { StatCard } from '../components/Feed/StatCard';

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

const moodHighlights = [
  { title: 'Deep Sleep', copy: 'Warm rain, soft drones, and low-light night textures.', accent: 'rgba(163,93,255,0.18)' },
  { title: 'Focus Drift', copy: 'Sparse ambience that stays out of the way while you work.', accent: 'rgba(221,45,255,0.16)' },
  { title: 'Morning Reset', copy: 'Airy birdsong and gentle motion to ease into the day.', accent: 'rgba(107,92,230,0.16)' },
];

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
    fetchSounds().then((data) => {
      soundsCacheRef.current = data;
    });

    fetchPublicMixes()
      .then((mixes) => {
        setApiMixes(mixes.length > 0 ? mixes : []);
        setMixesLoading(false);
      })
      .catch(() => setMixesLoading(false));
  }, []);

  const savedMixes = useMixerStore((state) => state.savedMixes);
  const feedPlayingId = useMixerStore((state) => state.feedPlayingId);
  const setFeedPlayingId = useMixerStore((state) => state.setFeedPlayingId);
  const isPlaying = useMixerStore((state) => state.isPlaying);
  const setPlaying = useMixerStore((state) => state.setPlaying);
  const startPlaybackClock = useMixerStore((state) => state.startPlaybackClock);
  const pausePlaybackClock = useMixerStore((state) => state.pausePlaybackClock);
  const resetPlaybackClock = useMixerStore((state) => state.resetPlaybackClock);
  const loadTracks = useMixerStore((state) => state.loadTracks);
  const setMixName = useMixerStore((state) => state.setMixName);
  const setMixDesc = useMixerStore((state) => state.setMixDesc);
  const setPublic = useMixerStore((state) => state.setPublic);
  const setSelectedSilentFrequencies = useMixerStore((state) => state.setSelectedSilentFrequencies);
  const setSelectedFrequencyLayer = useMixerStore((state) => state.setSelectedFrequencyLayer);
  const setActiveMixContext = useMixerStore((state) => state.setActiveMixContext);
  const setPage = useMixerStore((state) => state.setPage);
  const user = useMixerStore((state) => state.user);

  const engine = useAudioEngineContext();

  const ownMixes = savedMixes.map((mix) => ({ ...mix, isOwn: true }));
  const publicOwn = ownMixes.filter((mix) => mix.isPublic);
  const communityMixes: Mix[] = dedupeMixes(ownMixes, [...publicOwn, ...apiMixes]);
  const sourceMixes = activeTab === 'community' ? communityMixes : ownMixes;

  const visible = useMemo(() => {
    let list = [...sourceMixes];
    const q = deferredQuery.toLowerCase();

    if (filter === 'Popular') {
      list = list.sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0));
    } else if (filter !== 'All') {
      const normalizedFilter = filter.toLowerCase();
      list = list.filter((mix) => mix.tags?.some((tag) => tag.toLowerCase().includes(normalizedFilter)));
    }

    if (q) {
      list = list.filter(
        (mix) => mix.name.toLowerCase().includes(q) || (mix.user ?? '').toLowerCase().includes(q),
      );
    }

    return list;
  }, [deferredQuery, filter, sourceMixes]);

  const allMixes = activeTab === 'community' ? communityMixes : ownMixes;
  const playingMix = allMixes.find((mix) => mix._id === feedPlayingId);
  const isThisPlaying = (id: string) => feedPlayingId === id && isPlaying;

  const totalPlays = useMemo(
    () => allMixes.reduce((sum, mix) => sum + (mix.plays ?? 0), 0),
    [allMixes],
  );

  const visibleTagCount = useMemo(
    () => new Set(visible.flatMap((mix) => mix.tags ?? [])).size,
    [visible],
  );

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
        .map((trackData) => {
          const soundId = resolveSoundId(trackData.soundId);
          const sound = sounds.find((item) => String(item.id) === soundId);
          const url = sound?.audioUrl ?? '';

          return {
            soundId,
            volume: trackData.volume,
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
        .filter((track) => track.soundId && track.url);

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
    <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="soft-panel rounded-[34px] p-5 sm:p-7 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(163,93,255,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(221,45,255,0.12),transparent_32%)]" />
          <div className="relative grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
            <div className="space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setActiveTab('community')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${activeTab === 'community' ? 'bg-[var(--surface-elevated)] text-[var(--bright)] border border-[var(--line2)]' : 'text-[var(--mid)] border border-transparent hover:text-[var(--soft)]'}`}
                >
                  Community
                </button>
                <button
                  onClick={() => setActiveTab('yours')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${activeTab === 'yours' ? 'bg-[var(--surface-elevated)] text-[var(--bright)] border border-[var(--line2)]' : 'text-[var(--mid)] border border-transparent hover:text-[var(--soft)]'}`}
                >
                  Your Mixes
                </button>
              </div>

              <div className="max-w-2xl">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--mid)] mb-3">
                  Calm-inspired listening room
                </p>
                <h1 className="font-['Instrument_Serif'] italic text-[40px] leading-none sm:text-[56px] text-[var(--hero-title)]">
                  Build a softer web space for focus, sleep, and reset.
                </h1>
                <p className="text-sm sm:text-base text-[var(--hero-copy)] leading-relaxed mt-4 max-w-xl">
                  {activeTab === 'community'
                    ? 'Browse mixes that feel closer to a wellness app template: lighter hierarchy, softer surfaces, and quicker paths to play or remix.'
                    : user
                      ? 'Your saved mixes now sit inside a calmer discovery layout so your own collection feels curated, not just stored.'
                      : 'Sign in to turn this view into your personal calm library and save mixes you want to revisit.'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard icon={<Users size={16} />} label="Mixes ready" value={String(allMixes.length)} />
                <StatCard icon={<Waves size={16} />} label="Mood tags" value={String(visibleTagCount)} />
                <StatCard icon={<Clock3 size={16} />} label="Community plays" value={totalPlays.toLocaleString()} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {moodHighlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[26px] border border-[var(--line)] p-4"
                  style={{ background: `linear-gradient(180deg, ${item.accent}, transparent), var(--surface)` }}
                >
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4 text-[var(--sage)] border border-[var(--line)] bg-[var(--surface-strong)]">
                    <Sparkles size={15} />
                  </div>
                  <div className="text-[17px] text-[var(--bright)] font-medium">{item.title}</div>
                  <div className="text-sm text-[var(--mid)] leading-relaxed mt-2">{item.copy}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
          <div className="soft-panel rounded-[30px] p-4 sm:p-5">
            <div className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--line)] rounded-[24px] px-4 py-3 mb-5">
              <Search size={17} className="text-[var(--mid)] flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={activeTab === 'community' ? 'Search mixes, creators, moods...' : 'Search your saved mixes...'}
                className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--bright)] placeholder:text-[var(--dim)]"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {FEED_FILTERS.map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`text-sm font-medium px-4 py-2.5 rounded-full border transition-all duration-150 ${filter === item ? 'bg-[var(--sage3)] border-[var(--sage)] text-[var(--sage)]' : 'border-[var(--line)] text-[var(--mid)] hover:border-[var(--line2)] hover:text-[var(--soft)] hover:bg-[var(--surface)]'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="soft-panel rounded-[30px] p-4 sm:p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--mid)] mb-3">
              Listening status
            </p>
            {feedPlayingId && playingMix ? (
              <div className="rounded-[24px] border border-[rgba(163,93,255,0.25)] bg-[var(--purple3)] p-4 anim-fade">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[18px] flex items-center justify-center flex-shrink-0 shadow-[var(--card-shadow)]" style={{ background: 'var(--icon-shell)' }}>
                    <img
                      src={import.meta.env.BASE_URL + `sound_icons/${playingMix.icon}.svg`}
                      alt={playingMix.icon}
                      className="w-6 h-6 sound-icon"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--sage)]">Now playing</p>
                    <p className="text-sm text-[var(--bright)] truncate">{playingMix.name}</p>
                    <p className="text-xs text-[var(--mid)] mt-1 truncate">{playingMix.user ?? 'Serene Community'}</p>
                  </div>
                  <button
                    onClick={() => handleOpenInStudio(playingMix)}
                    className="text-xs text-[var(--purple)] border border-[rgba(163,93,255,0.3)] px-3 py-2 rounded-xl hover:bg-[rgba(163,93,255,0.1)] transition-colors flex-shrink-0"
                  >
                    Open Studio
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[var(--line2)] px-4 py-5 text-sm text-[var(--mid)] leading-relaxed">
                Pick any mix below and it will appear here with a quick jump into the Studio.
              </div>
            )}
          </div>
        </section>

        <section className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--mid)] mb-2">
              {activeTab === 'community' ? 'Curated community collection' : 'Your saved collection'}
            </p>
            <h2 className="font-['Instrument_Serif'] italic text-[34px] text-[var(--bright)] leading-none">
              {mixesLoading ? 'Loading...' : `${visible.length} mix${visible.length === 1 ? '' : 'es'} ready to play`}
            </h2>
          </div>
          <div className="text-sm text-[var(--mid)] max-w-md">
            {activeTab === 'community'
              ? 'A softer template look, but still connected to your real public mix feed.'
              : 'Everything you saved stays in one place, with the same quick-play and remix flow.'}
          </div>
        </section>

        {mixesLoading ? (
          <div className="soft-panel rounded-[30px] flex flex-col items-center justify-center py-20 gap-4 text-[var(--dim)]">
            <span className="text-4xl opacity-40 animate-pulse">music</span>
            <p className="text-sm">Loading mixes...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="soft-panel rounded-[30px] flex flex-col items-center justify-center py-20 gap-4 text-[var(--dim)]">
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
            {visible.map((mix, index) => (
              <MixCard
                key={mix._id}
                mix={mix}
                playing={isThisPlaying(mix._id)}
                onPlay={() => {
                  void handlePlay(mix);
                }}
                onOpenStudio={() => handleOpenInStudio(mix)}
                style={{ animationDelay: `${index * 0.04}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
