import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => (
  <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-4">
    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-[var(--sage)] border border-[var(--line)] bg-[var(--surface-strong)] mb-3">
      {icon}
    </div>
    <div className="text-xs uppercase tracking-[0.16em] text-[var(--mid)]">{label}</div>
    <div className="text-[28px] leading-none text-[var(--bright)] mt-2">{value}</div>
  </div>
);