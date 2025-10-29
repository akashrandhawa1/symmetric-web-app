import React, { forwardRef } from "react";
import clsx from "classnames";
import { ChevronDown, Flame } from "lucide-react";
import { motion } from "framer-motion";
import type { EffortLevel, PlanBlock } from "@/types/plan";

type EffortBadgeProps = { level: EffortLevel };

function EffortBadge({ level }: EffortBadgeProps) {
  const styles = {
    Cruise: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/30",
    Solid: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/30",
    Push: "bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/30",
  } as const;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        styles[level]
      )}
    >
      {level !== "Cruise" && <Flame className="h-3 w-3" aria-hidden />}
      {level}
    </span>
  );
}

function DropChip({ drop }: { drop: number }) {
  const pct = Math.max(8, Math.min(100, (drop / 12) * 100));
  const tone =
    drop >= 8 ? "bg-rose-400" : drop >= 5 ? "bg-amber-400" : "bg-emerald-400";

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-16 overflow-hidden rounded-full bg-zinc-800/80">
        <motion.div
          aria-hidden
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 20 }}
          className={clsx("h-full rounded-full", tone)}
        />
      </div>
      <span className="text-[10px] font-medium text-zinc-400 whitespace-nowrap">
        −{drop} R
      </span>
    </div>
  );
}

function MetaLine({ block }: { block: PlanBlock }) {
  return (
    <div className="mt-2 text-[10px] text-zinc-500">
      {block.sets} × {block.reps}
      {block.tempo ? ` • ${block.tempo}` : " • —"}
      {block.rest_s != null ? ` • ${block.rest_s}s` : " • —"}
      {" • "}
      {block.load === "increase" ? "Load ↑" : block.load === "decrease" ? "Load ↓" : "Load =" }
    </div>
  );
}

export const BlockRow = forwardRef<HTMLDivElement, { block: PlanBlock }>(
  ({ block }, ref) => {
    const [open, setOpen] = React.useState(false);

    return (
      <div
        ref={ref}
        className="relative overflow-hidden rounded-2xl bg-zinc-950/70 p-4 ring-1 ring-white/5 backdrop-blur-sm transition-colors hover:ring-white/10"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-zinc-500">
              <span>{block.label}</span>
              <EffortBadge level={block.effort} />
            </div>
            <h3 className="mt-2 text-base font-semibold leading-tight text-white">
              {block.name}
            </h3>
            <MetaLine block={block} />

            {block.why && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setOpen((value) => !value)}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 transition hover:text-zinc-200"
                  aria-expanded={open}
                >
                  <ChevronDown
                    className={clsx(
                      "h-3 w-3 transition-transform",
                      open && "rotate-180"
                    )}
                    aria-hidden
                  />
                  Why this
                </button>
                {open && (
                  <p className="mt-1 text-[11px] leading-snug text-zinc-300">
                    {block.why}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-shrink-0 flex-col items-end gap-2">
            <DropChip drop={block.predictedDrop} />
          </div>
        </div>
      </div>
    );
  }
);

BlockRow.displayName = "BlockRow";

