import React from 'react';

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

export const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--ink3)] px-4 py-3">
    <div className="text-[var(--sage)]">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-xs uppercase tracking-[0.14em] text-[var(--mid)] font-semibold">
        {label}
      </div>
      <div className="text-sm text-[var(--bright)] truncate mt-1">
        {value}
      </div>
    </div>
  </div>
);