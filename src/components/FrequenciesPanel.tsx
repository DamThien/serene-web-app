import React, { useEffect, useState } from 'react';
import {
  fetchSilentFrequencies,
  fetchFrequencyLayers,
} from '../services/api';
import { useMixerStore } from '../store/mixerStore';
import type { SilentFrequency, FrequencyLayer } from '../types';
import { toast } from './Toast';
import { SilentFrequencySection, FrequencyLayerSection } from './FrequenciesSections';

interface FrequenciesPanelProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const FrequenciesPanel: React.FC<FrequenciesPanelProps> = ({ mobileOpen = false, onMobileClose }) => {
  const [silentFrequencies, setSilentFrequencies] = useState<SilentFrequency[]>([]);
  const [frequencyLayers, setFrequencyLayers] = useState<FrequencyLayer[]>([]);
  const [sfExpanded, setSfExpanded] = useState(true);
  const [flExpanded, setFlExpanded] = useState(true);

  const selectedSilentFrequencies = useMixerStore((state) => state.selectedSilentFrequencies);
  const selectedFrequencyLayer = useMixerStore((state) => state.selectedFrequencyLayer);
  const toggleSilentFrequency = useMixerStore((state) => state.toggleSilentFrequency);
  const setSelectedFrequencyLayer = useMixerStore((state) => state.setSelectedFrequencyLayer);
  const premiumUnlocked = useMixerStore((state) => state.isPremiumUnlocked());

  useEffect(() => {
    const load = async () => {
      const [silent, layers] = await Promise.all([
        fetchSilentFrequencies(),
        fetchFrequencyLayers(),
      ]);
      setSilentFrequencies(silent);
      setFrequencyLayers(layers);
    };
    void load();
  }, []);

  const handleSilentFrequency = (item: SilentFrequency) => {
    if (item.isPremium && !premiumUnlocked) {
      toast('Silent frequencies are part of Premium');
      return;
    }
    const ok = toggleSilentFrequency(item);
    if (!ok) {
      toast('You can add up to 2 silent frequencies');
      return;
    }
    toast(selectedSilentFrequencies.some((entry) => entry.id === item.id) ? 'Silent frequency removed' : 'Silent frequency added');
  };

  const handleFrequencyLayer = (item: FrequencyLayer) => {
    if (!premiumUnlocked) {
      toast('Frequency layers are part of Premium');
      return;
    }
    const next = selectedFrequencyLayer?.id === item.id ? null : item;
    setSelectedFrequencyLayer(next);
    toast(next ? `Frequency layer ${item.hz} Hz added` : 'Frequency layer removed');
  };

  const selectedIds = selectedSilentFrequencies.map((sf) => sf.id);

  return (
    <>
      {mobileOpen && onMobileClose && (
        <div className="sidebar-overlay md:hidden" onClick={onMobileClose} />
      )}
      <div className={`sidebar-panel-left flex flex-col border-r border-[var(--line)] overflow-y-auto bg-[var(--surface)] ${mobileOpen ? 'open' : ''}`}>
        <div className="p-4 flex-shrink-0">
          <div className="space-y-4">
            <SilentFrequencySection
              silentFrequencies={silentFrequencies}
              selectedIds={selectedIds}
              onToggle={handleSilentFrequency}
              maxItems={8}
              premiumUnlocked={premiumUnlocked}
              expanded={sfExpanded}
              onExpandedChange={setSfExpanded}
            />
            <FrequencyLayerSection
              frequencyLayers={frequencyLayers}
              selected={selectedFrequencyLayer}
              onToggle={handleFrequencyLayer}
              maxItems={8}
              premiumUnlocked={premiumUnlocked}
              expanded={flExpanded}
              onExpandedChange={setFlExpanded}
            />
          </div>
        </div>
      </div>
    </>
  );
};
