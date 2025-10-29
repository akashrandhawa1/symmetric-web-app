import React from 'react';

interface SideCardProps {
    label: string;
    color: string;
    done: number;
    total: number;
    onSimulateSqueeze: (side: string) => void;
}
export const SideCard: React.FC<SideCardProps> = ({ label, color, done, total, onSimulateSqueeze }) => {
    const border = color === "blue" ? "border-blue-500/70" : "border-emerald-500/70";
    const isDone = done >= total;
    return (
        <div className={`relative flex-1 w-full rounded-3xl border-2 ${border} transition-all flex flex-col items-center justify-start overflow-hidden p-6 space-y-4 min-h-[320px] bg-white/5 backdrop-blur-sm`} >
            <div className={`text-lg font-bold ${color === "blue" ? "text-blue-400" : "text-emerald-400"}`}>{label}</div>
            <div className="flex flex-col space-y-3 flex-1 justify-center">
                {Array.from({ length: total }, (_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 transition-all duration-500 flex items-center justify-center" style={{ backgroundColor: i < done ? (color === "blue" ? "#3B82F6" : "#10B981") : "transparent", borderColor: i < done ? (color === "blue" ? "#60A5FA" : "#34D399") : color === "blue" ? "rgba(96, 165, 250, 0.4)" : "rgba(52, 211, 153, 0.4)", transform: i < done ? "scale(1.1)" : "scale(1)" }}>{i < done && <span className="text-white text-lg">✓</span>}</div>
                ))}
            </div>
            <div className={`text-lg font-bold ${color === "blue" ? "text-blue-400" : "text-emerald-400"} mt-2`}>{done}/{total}</div>
            {!isDone && (
                <button
                    onClick={() => onSimulateSqueeze(label.toLowerCase())}
                    className="bg-gray-800 text-sm text-gray-300 py-2 px-4 rounded-full mt-4 hover:bg-gray-700 transition-colors button-press"
                >
                    Simulate Squeeze
                </button>
            )}
        </div>
    );
};
