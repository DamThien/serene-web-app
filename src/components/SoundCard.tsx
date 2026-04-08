import React from 'react';
import { Plus, Check } from 'lucide-react';
import type { Sound } from '../types';
import { useMixerStore } from '../store/mixerStore';
import { useAudioEngineContext } from './AudioEngineProvider';
import { toast } from './Toast';

interface Props { sound: Sound; }

export const SoundCard: React.FC<Props> = ({ sound }) => {
  const { tracks, addTrack, isPlaying } = useMixerStore();
  const engine = useAudioEngineContext();
  const inMix = tracks.some(t => t.soundId === sound.id);

  const handleAdd = () => {
    if (inMix) return;
    const ok = addTrack({
      soundId: sound.id,
      volume: 0.7,
      title: sound.title,
      cat: sound.categoryname || 'Unknown',
      icon: sound.icon,
      url: sound.audioUrl,
    });
    if (!ok) { toast('Max 6 tracks per mix'); return; }
    if (isPlaying) engine.play(sound.id, sound.audioUrl, 0.7);
    toast(`${sound.title} added`);
  };

  return (
    <div
      onClick={handleAdd}
      className={`
        sound-card group flex items-center gap-3 cursor-pointer
        border transition-all duration-150 select-none
        ${inMix
          ? 'bg-[var(--sage3)] border-[rgba(126,184,160,0.2)]'
          : 'border-transparent hover:bg-[var(--ink3)]'
        }
      `}
    >
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
        <img
          src={import.meta.env.BASE_URL + `sound_icons/${sound.icon}.svg`}
          alt={sound.icon}
          className="w-6 h-6"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--bright)] truncate">{sound.title}</div>
        <div className="text-xs text-[var(--mid)] mt-0.5">{sound.categoryname}</div>
      </div>
      <button
        className={`
          w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0
          transition-all duration-150
          ${inMix
            ? 'bg-[var(--sage2)] border-[var(--sage2)]'
            : 'border-[var(--line2)] group-hover:bg-[var(--sage2)] group-hover:border-[var(--sage2)]'
          }
        `}
        onClick={e => { e.stopPropagation(); handleAdd(); }}
        title={inMix ? 'Added' : 'Add to mix'}
      >
        {inMix
          ? <Check size={11} className="text-white" />
          : <Plus  size={11} className="text-[var(--mid)] group-hover:text-white" />
        }
      </button>
    </div>
  );
};
