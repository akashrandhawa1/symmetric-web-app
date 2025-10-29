import React from 'react';

interface BottomSheetProps {
  title: string;
  description: { heading: string; body: string }[];
  onClose: () => void;
  isOpen: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ title, description, onClose, isOpen }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="trend-sheet-title">
      <button className="absolute inset-0" onClick={onClose} aria-label="Close trend information" />
      <div
        className="relative z-10 w-full max-w-xl translate-y-0 rounded-t-3xl border border-slate-700/70 bg-slate-950/95 px-6 pb-10 pt-6 shadow-[0_-24px_48px_rgba(0,0,0,0.6)] transition-transform duration-150 ease-out"
      >
        <div className="mx-auto h-1 w-16 rounded-full bg-slate-700/70" aria-hidden="true" />
        <div className="mt-4 space-y-4 text-left text-slate-200">
          <div className="flex items-center justify-between">
            <h2 id="trend-sheet-title" className="text-lg font-semibold text-slate-100">{title}</h2>
            <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Close</button>
          </div>
          <ul className="space-y-3 text-sm leading-relaxed text-slate-300">
            {description.map((item) => (
              <li key={item.heading}>
                <p className="font-medium text-slate-100">{item.heading}</p>
                <p className="text-slate-300">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
