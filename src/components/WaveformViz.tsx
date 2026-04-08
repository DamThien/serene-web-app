import React from 'react';

interface Props {
  playing: boolean;
  barCount?: number;
}

export const WaveformViz: React.FC<Props> = ({ playing, barCount = 16 }) => {
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div className="flex items-center gap-[2px] h-7">
      {bars.map(i => {
        const seed = ((i * 7 + 3) % barCount) / barCount;
        const h = Math.round(4 + seed * 22);
        const delay = (i * 0.05).toFixed(2);
        const dur = (0.4 + seed * 0.5).toFixed(2);
        return (
          <div
            key={i}
            className="flex-1 rounded-[1px] bg-[var(--sage)]"
            style={{
              height: playing ? `${h}px` : '3px',
              opacity: playing ? 0.85 : 0.3,
              transform: 'scaleY(1)',
              transformOrigin: 'bottom',
              transition: playing ? 'none' : 'all 0.3s ease',
              animation: playing
                ? `waveAnim ${dur}s ease-in-out ${delay}s infinite alternate`
                : 'none',
            }}
          />
        );
      })}
    </div>
  );
};
