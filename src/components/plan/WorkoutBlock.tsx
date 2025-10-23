import React from "react";
import clsx from "classnames";

type WorkoutBlockProps = {
  name: string;
  drop: number;
  afterReadiness: number;
  sets: number;
  reps: string | number;
  tempo?: string | null;
  sides?: string | null;
  position: "first" | "middle" | "last";
  effort?: string;
  label?: string;
  note?: string | null;
};

export default function WorkoutBlock({
  name,
  drop,
  afterReadiness,
  sets,
  reps,
  tempo,
  sides,
  position,
  effort,
  label,
  note,
}: WorkoutBlockProps) {
  const dropTone =
    drop >= 8
      ? "bg-rose-500/15 text-rose-200 ring-rose-500/20"
      : drop >= 5
      ? "bg-amber-500/15 text-amber-200 ring-amber-500/20"
      : "bg-emerald-500/15 text-emerald-200 ring-emerald-500/20";

  return (
    <article className="relative pl-10">
      <span
        className={clsx(
          "absolute left-0 w-0.5 bg-slate-700/60",
          position === "first" ? "top-5 bottom-0" : position === "last" ? "top-0 bottom-5" : "top-0 bottom-0"
        )}
        aria-hidden
      />
      <span
        className={clsx(
          "absolute left-[-5px] top-5 block h-3 w-3 rounded-full border-2 border-slate-950",
          position === "last" ? "bg-emerald-400" : "bg-slate-400"
        )}
        aria-hidden
      />

      <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950/90 p-4 ring-1 ring-white/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Label + Effort Badge */}
            <div className="flex items-center gap-2 mb-2">
              {label && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {label}
                </span>
              )}
              {effort && (
                <span className="rounded-full bg-slate-800/60 px-2.5 py-0.5 text-xs font-medium text-slate-100 ring-1 ring-white/10">
                  {effort}
                </span>
              )}
            </div>

            {/* Exercise Name - Larger, Better Spacing */}
            <h3 className="text-lg font-bold text-white mb-3 leading-tight tracking-tight">
              {name}
            </h3>

            {/* Sets × Reps - Clear and Readable */}
            <div className="text-base font-semibold text-slate-200 tracking-wide">
              {sets} × {reps}{sides ? ` · ${sides}` : ""}
            </div>
          </div>

          {/* Readiness Drop - Right Side */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* Visual Drop Indicator */}
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 mb-1">
                <svg width="32" height="20" viewBox="0 0 32 20" fill="none" className="opacity-60">
                  <path
                    d="M2 2 L16 18 L30 2"
                    stroke={drop >= 8 ? "rgb(251, 113, 133)" : drop >= 5 ? "rgb(251, 191, 36)" : "rgb(52, 211, 153)"}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className={clsx(
                  "text-xs font-bold",
                  drop >= 8 ? "text-rose-300" : drop >= 5 ? "text-amber-300" : "text-emerald-300"
                )}>
                  {drop}
                </span>
              </div>
            </div>

            {/* After Readiness */}
            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 mb-0.5">After</span>
              <span className="text-2xl font-bold text-emerald-400 leading-none">{afterReadiness}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
