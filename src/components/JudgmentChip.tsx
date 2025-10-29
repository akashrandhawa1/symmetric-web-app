import React from 'react';

const judgmentColorMap: Record<'productive' | 'neutral' | 'protect', string> = {
  productive: '#3b82f6',
  neutral: '#94a3b8',
  protect: '#f97316',
};

interface JudgmentChipProps {
  judgment: 'productive' | 'neutral' | 'protect';
}

export const JudgmentChip: React.FC<JudgmentChipProps> = ({ judgment }) => {
  const label = judgment === 'productive' ? 'Productive' : judgment === 'protect' ? 'Protect' : 'Neutral';
  const color = judgmentColorMap[judgment];

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
};
