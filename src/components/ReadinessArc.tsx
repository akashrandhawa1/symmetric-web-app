import React from 'react';

interface ReadinessArcProps {
  score: number;
  color: string;
  size?: number;
}
export const ReadinessArc: React.FC<ReadinessArcProps> = ({ score, color, size = 160 }) => {
  const safeScore = Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;
  const displayScore = Number.isFinite(score) ? Math.round(safeScore) : '--';
  const strokeWidth = 14;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const progressOffset = arcLength * (1 - safeScore / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-[225deg]"
        style={{ filter: "drop-shadow(0px 0px 5px rgba(0,0,0,0.5))" }}
      >
        <defs>
          <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
          <filter id="glow">
            <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor={color} />
          </filter>
        </defs>
        <circle cx={center} cy={center} r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} fill="none" strokeDasharray={arcLength} strokeLinecap="round" />
        <circle cx={center} cy={center} r={radius} stroke="url(#arcGradient)" strokeWidth={strokeWidth} fill="none" strokeDasharray={arcLength} strokeDashoffset={progressOffset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.25, 1, 0.5, 1), stroke 0.5s ease", filter: "url(#glow)" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-5xl font-thin tracking-tight text-white">{displayScore}</span>
      </div>
    </div>
  );
};
