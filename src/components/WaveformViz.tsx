import React, { useMemo } from 'react';
import { useWaveform } from '../hooks/useWaveform';

interface Props {
  analyser: AnalyserNode | null;
  playing: boolean;
  barCount?: number;
}

export const WaveformViz: React.FC<Props> = React.memo(({ analyser, playing, barCount = 20 }) => {
  const { levels } = useWaveform({ analyser, playing, barCount });

  const bars = useMemo(() => levels.map((level, index) => {
    const hueShift = (index / Math.max(levels.length - 1, 1)) * 18;

    return {
      id: index,
      level,
      color: `color-mix(in srgb, var(--sage) ${88 - hueShift}%, white ${12 + hueShift}%)`,
    };
  }), [levels]);

  return (
    <div className="waveform-viz" aria-hidden="true">
      {bars.map(bar => (
        <div
          key={bar.id}
          className="waveform-bar"
          style={{
            height: `${Math.max(8, Math.round(bar.level * 30))}px`,
            opacity: 0.3 + bar.level * 0.85,
            background: bar.color,
            transform: `scaleY(${0.75 + bar.level * 0.35}) translateZ(0)`,
          }}
        />
      ))}
    </div>
  );
});
