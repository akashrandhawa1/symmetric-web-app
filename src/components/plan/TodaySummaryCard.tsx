import React from "react";
import clsx from "classnames";

type TodaySummaryCardProps = {
  start: number;
  end: number;
  drop: number;
  focus?: string | null;
  className?: string;
};

const metricClass =
  "flex flex-col gap-2 rounded-2xl bg-slate-900/70 px-4 py-3 text-slate-100 ring-1 ring-white/5";

export default function TodaySummaryCard({
  start,
  end,
  drop,
  focus,
  className,
}: TodaySummaryCardProps) {
  return (
    <section
      className={clsx(
        "rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950/90 p-4 ring-1 ring-white/5",
        className
      )}
    >
      {/* Header */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Today's Readiness
        </p>
        <h1 className="text-xl font-bold text-white leading-tight">
          {focus ?? "Main Session"}
        </h1>
      </div>

      {/* Readiness Flow */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <span className="text-xs text-slate-400 mb-1">Start</span>
          <span className="text-2xl font-bold text-white">{start}</span>
        </div>

        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-px bg-gradient-to-r from-slate-400 via-amber-400 to-emerald-400"></div>
          <span className="text-xs font-semibold text-amber-300">−{drop}</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs text-slate-400 mb-1">Final</span>
          <span className="text-2xl font-bold text-emerald-400">{end}</span>
        </div>
      </div>
    </section>
  );
}
