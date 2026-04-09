import { useEffect, useMemo, useRef, useState } from 'react';

interface UseWaveformProps {
  analyser: AnalyserNode | null;
  barCount?: number;
  playing: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function useWaveform({ analyser, barCount = 24, playing }: UseWaveformProps) {
  const [levels, setLevels] = useState<number[]>(() => Array(barCount).fill(0.12));
  const animationFrameRef = useRef<number | null>(null);
  const previousLevelsRef = useRef<number[]>(Array(barCount).fill(0.12));

  const dataArray = useMemo(() => {
    if (!analyser) {
      return null;
    }

    return new Uint8Array(analyser.frequencyBinCount);
  }, [analyser]);

  useEffect(() => {
    previousLevelsRef.current = Array(barCount).fill(0.12);
    setLevels(Array(barCount).fill(0.12));
  }, [barCount]);

  useEffect(() => {
    if (!analyser || !dataArray) {
      setLevels(Array(barCount).fill(0.12));
      return;
    }

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;
  }, [analyser, dataArray, barCount]);

  useEffect(() => {
    if (!playing || !analyser || !dataArray) {
      setLevels(current => current.map(level => Math.max(0.12, level * 0.82)));
      return;
    }

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);

      const nextLevels = Array.from({ length: barCount }, (_, index) => {
        const start = Math.floor((index / barCount) * dataArray.length);
        const end = Math.max(start + 1, Math.floor(((index + 1) / barCount) * dataArray.length));

        let total = 0;
        for (let cursor = start; cursor < end; cursor += 1) {
          total += dataArray[cursor];
        }

        const average = total / (end - start || 1);
        const normalized = average / 255;
        const curve = Math.pow(normalized, 0.75);
        const emphasis = 1 + (1 - index / barCount) * 0.35;
        const target = clamp(0.12 + curve * 0.88 * emphasis, 0.12, 1);
        const previous = previousLevelsRef.current[index] ?? 0.12;
        const smoothed = target > previous
          ? previous + (target - previous) * 0.45
          : previous * 0.88;

        return clamp(smoothed, 0.12, 1);
      });

      previousLevelsRef.current = nextLevels;
      setLevels(nextLevels);
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, barCount, dataArray, playing]);

  return { levels };
}
