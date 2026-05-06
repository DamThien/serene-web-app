import React from 'react';
import { Play, Pause } from 'lucide-react';
import type { Mix } from '../../types';
import { getFallbackMixCoverUrl, getMixCoverUrl } from '../../utils/mixCovers';

interface MixCardProps {
  mix: Mix;
  playing: boolean;
  onPlay: () => void;
  onOpenStudio: () => void;
  style?: React.CSSProperties;
}

export const MixCard: React.FC<MixCardProps> = ({ mix, playing, onPlay, onOpenStudio, style }) => {
  const tags = mix.tags?.slice(0, 4) ?? [];
  const plays = mix.plays ?? 0;
  const detail = mix.description?.trim() || 'A layered ambience mix for slower, calmer listening sessions.';
  const coverUrl = getMixCoverUrl(mix);

  return (
    <div
      className="group soft-panel rounded-[30px] p-5 cursor-pointer transition-all duration-200 hover:-translate-y-1 relative overflow-hidden anim-fade"
      style={style}
      onClick={onPlay}
    >
      <div className="absolute inset-x-0 top-0 h-[120px] overflow-hidden">
        <img
          src={coverUrl}
          alt=""
          className="h-full w-full object-cover opacity-75 transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(event) => {
            const fallbackUrl = getFallbackMixCoverUrl(mix);

            if (event.currentTarget.src !== fallbackUrl) {
              event.currentTarget.src = fallbackUrl;
            }
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--gradient-phase-1)_0%,var(--gradient-phase-2)_44%,var(--gradient-phase-3)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--gradient-phase-3)] to-[var(--surface-panel)]" />
      </div>

      <div className="relative">
        <div className="flex items-start gap-4 mb-5">
          <div
            className="w-[58px] h-[58px] rounded-[20px] flex items-center justify-center flex-shrink-0 shadow-[var(--card-shadow)]"
            style={{ background: 'var(--icon-shell)' }}
          >
            <img
              src={import.meta.env.BASE_URL + `sound_icons/${mix.icon}.svg`}
              alt={mix.icon}
              className="w-7 h-7 sound-icon"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-medium text-[var(--bright)] truncate">{mix.name}</p>
              <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--mid)] whitespace-nowrap">
                {mix.isOwn ? 'Your mix' : 'Community'}
              </span>
            </div>
            <p className="text-xs text-[var(--mid)] mt-1">
              by {mix.isOwn ? 'You' : mix.user ?? 'anonymous'}
            </p>
            <p className="text-sm text-[var(--muted)] leading-relaxed mt-3 line-clamp-2">{detail}</p>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] px-3 py-3">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--mid)]">Plays</div>
            <div className="text-xl text-[var(--bright)] mt-1">{plays.toLocaleString()}</div>
          </div>
          <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] px-3 py-3">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--mid)]">Layers</div>
            <div className="text-xl text-[var(--bright)] mt-1">{mix.tracks.length}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onPlay();
            }}
            className={`flex-1 min-w-0 rounded-[18px] px-4 py-3 flex items-center justify-center gap-2 bg-[var(--sage2)] text-white transition-all duration-150 hover:opacity-90 ${playing ? 'pulse-ring' : ''}`}
          >
            {playing
              ? <Pause size={16} fill="white" />
              : <Play size={16} fill="white" className="translate-x-0.5" />
            }
            <span>{playing ? 'Pause Mix' : 'Play Mix'}</span>
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onOpenStudio();
            }}
            className="rounded-[18px] border border-[var(--line2)] text-[var(--soft)] px-4 py-3 hover:bg-[var(--surface)] transition-colors"
          >
            Remix
          </button>
        </div>
      </div>
    </div>
  );
};

