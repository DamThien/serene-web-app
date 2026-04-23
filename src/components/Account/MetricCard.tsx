import React from 'react';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, note }) => (
  <div className="rounded-[24px] border border-[var(--line)] bg-[var(--ink2)] p-5">
    <div className="w-10 h-10 rounded-2xl bg-[var(--ink3)] border border-[var(--line)] flex items-center justify-center text-[var(--sage)] mb-4">
      {icon}
    </div>
    <div className="text-xs uppercase tracking-[0.16em] text-[var(--mid)] font-semibold mb-2">
      {label}
    </div>
    <div className="text-[28px] leading-none text-[var(--bright)] mt-2 font-medium">
      {value}
    </div>
    <div className="text-sm text-[var(--mid)] mt-2">
      {note}
    </div>
  </div>
);