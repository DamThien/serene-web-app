import React, { createContext, useContext } from 'react';
import { useAudioEngine } from './../hooks/useAudioEngine';
import type { AudioEngine } from '../hooks/useAudioEngine';

const AudioEngineContext = createContext<AudioEngine | null>(null);

export const AudioEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const engine = useAudioEngine();
  return (
    <AudioEngineContext.Provider value={engine}>
      {children}
    </AudioEngineContext.Provider>
  );
};

export function useAudioEngineContext(): AudioEngine {
  const ctx = useContext(AudioEngineContext);
  if (!ctx) throw new Error('useAudioEngineContext must be inside AudioEngineProvider');
  return ctx;
}
