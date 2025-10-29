import React from "react";
import clsx from "classnames";

type WorkoutBlockProps = {
  name: string;
  drop: number;
  beforeReadiness: number;
  afterReadiness: number;
  sets: number;
  reps: string | number;
  tempo?: string | null;
  sides?: string | null;
  restSeconds?: number | null;
  position: "first" | "middle" | "last";
  effort?: string;
  label?: string;
  note?: string | null;
};

export default function WorkoutBlock({
  name,
  sets,
  reps,
  tempo,
  sides,
  restSeconds,
  position,
  effort,
  label,
  note,
}: WorkoutBlockProps) {
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
        <div className="mb-2 flex items-center gap-2">
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

        <h3 className="mb-2 text-lg font-bold leading-tight tracking-tight text-white">{name}</h3>

        <div className="text-base font-semibold tracking-wide text-slate-200">
          {sets} × {reps}
          {sides ? ` · ${sides}` : ""}
        </div>

        {(tempo || restSeconds != null) && (
          <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
            {tempo ? `Tempo ${tempo}` : null}
            {tempo && restSeconds != null ? " • " : ""}
            {restSeconds != null ? `Rest ${restSeconds}s` : null}
          </div>
        )}

        {note && (
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            {note}
          </p>
        )}
      </div>
    </article>
  );
}
