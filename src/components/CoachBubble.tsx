import React from 'react';

interface CoachBubbleProps {
  text: string;
  loading?: boolean;
}
export const CoachBubble: React.FC<CoachBubbleProps> = ({ text, loading = false }) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-[15px] leading-snug text-white/90">
      {loading ? <span className="opacity-70">Generating...</span> : text}
    </div>
  );
};
