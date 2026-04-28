import React from 'react';
import { ChevronDown, ChevronUp, Sparkles, Waves } from 'lucide-react';
import type { SilentFrequency, FrequencyLayer } from '../types';

export const SilentFrequencySection: React.FC<{
  silentFrequencies: SilentFrequency[];
  selectedIds: string[];
  onToggle: (item: SilentFrequency) => void;
  maxItems?: number;
  premiumUnlocked: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}> = ({ silentFrequencies, selectedIds, onToggle, maxItems = 8, expanded, onExpandedChange }) => {
  return (
    <div>
      <button onClick={() => onExpandedChange(!expanded)} className="flex items-center justify-between gap-2 w-full text-xs font-semibold uppercase tracking-widest text-[var(--mid)] hover:text-[var(--soft)] transition-colors">
        <div className="flex items-center gap-2"><Sparkles size={13} /><span>Silent Frequencies</span></div>
        <div className="flex items-center gap-1.5"><span className="text-[10px] text-[var(--dim)] normal-case tracking-normal">Up to 2</span>{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
      </button>
      {expanded && (
        <div className="grid grid-cols-1 gap-2 mt-2">
          {silentFrequencies.slice(0, maxItems).map((item) => {
            const active = selectedIds.some((id) => id === item.id);
            return (
              <button key={item.id} onClick={() => onToggle(item)} className={`rounded-[18px] border text-left px-3 py-3 transition-all ${active ? 'border-[var(--purple)] bg-[var(--purple3)] text-[var(--purple)] shadow-[0_12px_24px_rgba(163,93,255,0.12)]' : 'border-[var(--line)] bg-[var(--surface-strong)] text-[var(--mid)] hover:border-[var(--line2)] hover:text-[var(--soft)] hover:bg-[var(--surface-elevated)]'}`}>
                <div className="flex items-start gap-3">
                  {item.thumbnail && (
                    <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden">
                      <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{item.title}</div>
                    <div className="text-[11px] opacity-80 leading-relaxed mt-1 line-clamp-2">{item.subtitle || item.category}</div>
                  </div>
                  {item.isPremium && (
                    <span className="text-[10px] px-2 py-1 rounded-full border border-[rgba(221,45,255,0.25)] text-[var(--pink)] bg-[rgba(221,45,255,0.1)] flex-shrink-0">Pro</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const FrequencyLayerSection: React.FC<{
  frequencyLayers: FrequencyLayer[];
  selected: FrequencyLayer | null;
  onToggle: (item: FrequencyLayer) => void;
  maxItems?: number;
  premiumUnlocked: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}> = ({ frequencyLayers, selected, onToggle, maxItems = 8, expanded, onExpandedChange }) => {
  return (
    <div>
      <button onClick={() => onExpandedChange(!expanded)} className="flex items-center justify-between gap-2 w-full text-xs font-semibold uppercase tracking-widest text-[var(--mid)] hover:text-[var(--soft)] transition-colors">
        <div className="flex items-center gap-2"><Waves size={13} /><span>Frequency Layer</span></div>
        <div className="flex items-center gap-1.5"><span className="text-[10px] text-[var(--dim)] normal-case tracking-normal">Pick 1</span>{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
      </button>
      {expanded && (
        <div className="grid grid-cols-1 gap-2 mt-2">
          {frequencyLayers.slice(0, maxItems).map((item) => {
            const active = selected?.id === item.id;
            return (
              <button key={item.id} onClick={() => onToggle(item)} className={`rounded-[18px] border text-left px-3 py-3 transition-all ${active ? 'border-[var(--pink)] bg-[rgba(221,45,255,0.12)] text-[var(--pink)] shadow-[0_12px_24px_rgba(221,45,255,0.10)]' : 'border-[var(--line)] bg-[var(--surface-strong)] text-[var(--mid)] hover:border-[var(--line2)] hover:text-[var(--soft)] hover:bg-[var(--surface-elevated)]'}`}>
                <div className="text-sm font-medium">{item.hz} Hz</div>
                <div className="text-[11px] opacity-80 leading-relaxed mt-1 line-clamp-2">{item.title}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
