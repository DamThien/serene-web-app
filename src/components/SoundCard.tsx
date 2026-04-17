import React from 'react';
import { Check, Heart, Plus } from 'lucide-react';
import type { Sound } from '../types';
import { useMixerStore } from '../store/mixerStore';
import { addFavoriteSound, isAuthenticated, removeFavoriteSound } from '../services/api';
import { useAudioEngineContext } from './AudioEngineProvider';
import { toast } from './Toast';

interface Props {
  sound: Sound;
}

export const SoundCard: React.FC<Props> = React.memo(({ sound }) => {
  const inMix = useMixerStore((state) => state.tracks.some((track) => track.soundId === sound.id));
  const addTrack = useMixerStore((state) => state.addTrack);
  const isPlaying = useMixerStore((state) => state.isPlaying);
  const favoriteSoundIds = useMixerStore((state) => state.favoriteSoundIds);
  const toggleFavoriteSoundId = useMixerStore((state) => state.toggleFavoriteSoundId);
  const premiumUnlocked = useMixerStore((state) => state.isPremiumUnlocked());
  const engine = useAudioEngineContext();

  const isFavorited = favoriteSoundIds.includes(sound.id);
  const isTrial = sound.isPremium && !premiumUnlocked;

  const handleAdd = () => {
    if (inMix) return;

    const url = isTrial && sound.previewUrl ? sound.previewUrl : sound.audioUrl;
    const playback = isTrial ? null : sound.playback ?? null;
    const ok = addTrack({
      soundId: sound.id,
      volume: 0.7,
      title: sound.title,
      cat: sound.categoryname || 'Unknown',
      icon: sound.icon,
      url,
      playback,
      isPremium: sound.isPremium,
      previewUrl: sound.previewUrl,
    });

    if (!ok) {
      toast('Max 6 tracks per mix');
      return;
    }

    if (isPlaying) {
      void engine.play(sound.id, url, 0.7, playback).catch((error) => {
        toast(error instanceof Error ? error.message : 'Could not start protected audio');
      });
    }

    toast(isTrial ? `${sound.title} added as 30-second trial` : `${sound.title} added`);
  };

  const handleFavorite = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (!isAuthenticated()) {
      toast('Sign in to save favorites');
      return;
    }

    try {
      if (isFavorited) {
        await removeFavoriteSound(sound.id);
        toggleFavoriteSoundId(sound.id, false);
        toast('Removed from favorites');
      } else {
        await addFavoriteSound(sound.id);
        toggleFavoriteSoundId(sound.id, true);
        toast('Saved for later');
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Favorite update failed');
    }
  };

  return (
    <div
      onClick={handleAdd}
      className={`sound-card group flex items-center gap-3 cursor-pointer border transition-all duration-150 select-none ${inMix ? 'bg-[var(--sage3)] border-[rgba(126,184,160,0.2)]' : 'border-transparent hover:bg-[var(--ink3)]'}`}
    >
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 relative">
        <img
          src={import.meta.env.BASE_URL + `sound_icons/${sound.icon}.svg`}
          alt={sound.icon}
          className="w-6 h-6"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--bright)] truncate flex items-center gap-2">
          <span className="truncate">{sound.title}</span>
          {isTrial && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(214,178,74,0.14)] text-[var(--gold)] border border-[rgba(214,178,74,0.25)]">
              30s trial
            </span>
          )}
        </div>
        <div className="text-xs text-[var(--mid)] mt-0.5">{sound.categoryname}</div>
      </div>
      <button
        className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-150 ${isFavorited ? 'bg-[rgba(196,126,142,0.16)] border-[rgba(196,126,142,0.3)]' : 'border-[var(--line2)] hover:bg-[var(--ink4)]'}`}
        onClick={handleFavorite}
        title={isFavorited ? 'Remove favorite' : 'Save for later'}
      >
        <Heart size={11} className={isFavorited ? 'text-[var(--blush)] fill-[var(--blush)]' : 'text-[var(--mid)]'} />
      </button>
      <button
        className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-150 ${inMix ? 'bg-[var(--sage2)] border-[var(--sage2)]' : 'border-[var(--line2)] group-hover:bg-[var(--sage2)] group-hover:border-[var(--sage2)]'}`}
        onClick={(event) => {
          event.stopPropagation();
          handleAdd();
        }}
        title={inMix ? 'Added' : 'Add to mix'}
      >
        {inMix
          ? <Check size={11} className="text-white" />
          : <Plus size={11} className="text-[var(--mid)] group-hover:text-white" />
        }
      </button>
    </div>
  );
});
