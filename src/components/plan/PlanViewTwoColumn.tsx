import React from "react";
import { motion } from "framer-motion";
import clsx from "classnames";
import { ChevronDown, Flame } from "lucide-react";
import type { EffortLevel, PlanBlock, PlanProps } from "@/types/plan";

/* ==========================
 * Small UI atoms
 * ========================== */

function EffortBadge({ level }: { level: EffortLevel }) {
  const style = {
    Cruise: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30",
    Solid: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30",
    Push: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30",
  } as const;
  return (
    <span className={clsx("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px]", style[level])}>
      {level !== "Cruise" && <Flame className="h-3 w-3" aria-hidden />}
      {level}
    </span>
  );
}

function DropChip({ drop }: { drop: number }) {
  const widthPct = Math.max(6, Math.min(100, (drop / 12) * 100));
  const color = drop >= 8 ? "bg-rose-400" : drop >= 5 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative h-1.5 w-12 overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 18 }}
          className={clsx("h-1.5 rounded-full", color)}
          aria-hidden
        />
      </div>
      <span className="text-[10px] text-zinc-400 whitespace-nowrap">−{drop} R</span>
    </div>
  );
}

/* ==========================
 * Cards
 * ========================== */

function PlanHeader({
  start,
  final,
  confidence,
}: {
  start: number;
  final: number;
  confidence?: number;
}) {
  const total = Math.max(0, start - final);
  return (
    <div className="rounded-xl bg-zinc-950/60 p-2.5 ring-1 ring-zinc-800">
      <div className="flex items-baseline justify-between flex-wrap gap-1.5">
        <h2 className="text-xs font-semibold text-zinc-100">Today's Plan</h2>
        <div className="text-[10px] text-zinc-400">
          R <span className="font-semibold text-zinc-100">{start}</span>
          {" → "}
          <span className="font-semibold text-emerald-300">{final}</span>
        </div>
      </div>
    </div>
  );
}

function MetaLine({ block }: { block: PlanBlock }) {
  return (
    <div className="mt-1 text-[10px] text-zinc-400">
      {block.sets}×{block.reps} • {block.tempo ?? "—"} • {block.rest_s ?? "—"}s • {block.load === "increase" ? "↑" : block.load === "decrease" ? "↓" : "="}
    </div>
  );
}

function BlockRow({ block }: { block: PlanBlock }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-xl bg-zinc-900/60 p-2.5 ring-1 ring-zinc-800">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="text-[9px] uppercase tracking-wide text-zinc-500">{block.label}</div>
            <EffortBadge level={block.effort} />
          </div>
          <h3 className="text-xs font-semibold text-zinc-100 mt-0.5 leading-tight">{block.name}</h3>
          <MetaLine block={block} />
          {block.why && (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-zinc-400 hover:text-zinc-200"
                aria-expanded={open}
              >
                <ChevronDown
                  className={clsx("h-2.5 w-2.5 transition-transform", open && "rotate-180")}
                  aria-hidden
                />
                Why
              </button>
              {open && <div className="mt-1 text-[10px] text-zinc-300 leading-snug">{block.why}</div>}
            </>
          )}
        </div>
        <div className="flex-shrink-0 mt-0.5">
          <DropChip drop={block.predictedDrop} />
        </div>
      </div>
    </div>
  );
}

function PredictedPath({ path }: { path: number[] }) {
  if (!path || path.length < 2) return null;
  const total = Math.max(0, path[0] - path[path.length - 1]);
  return (
    <div className="rounded-xl bg-zinc-950/60 p-3 ring-1 ring-zinc-800">
      <div className="mb-1.5 text-xs font-semibold text-zinc-100">Predicted Path</div>
      <div className="text-[10px] text-zinc-400 mb-2">
        Total drop: <span className="text-zinc-100 font-medium">−{total} R</span>
      </div>
      <div className="relative pl-4">
        <div className="absolute left-1.5 top-0 bottom-0 w-px bg-zinc-800" aria-hidden />
        <ul className="space-y-2">
          {path.map((value, index) => {
            const delta = index === 0 ? 0 : Math.max(0, path[index - 1] - value);
            const end = index === path.length - 1;
            return (
              <li key={index} className="relative">
                <div
                  className={clsx(
                    "absolute left-0 top-1 h-2 w-2 rounded-full",
                    end
                      ? "bg-emerald-400"
                      : index === 0
                      ? "bg-zinc-400"
                      : "bg-zinc-300"
                  )}
                  aria-hidden
                />
                <div className="ml-3">
                  <div className={clsx("text-[10px] leading-tight", end ? "text-emerald-300 font-medium" : "text-zinc-200")}>
                    R = {value}
                    {index === 0 && <span className="ml-1.5 text-[9px] text-zinc-500 uppercase">Start</span>}
                    {end && <span className="ml-1.5 text-[9px] text-emerald-500 uppercase">Final</span>}
                  </div>
                  {index > 0 && (
                    <div className="text-[9px] text-zinc-500 leading-tight">−{delta} from previous</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ==========================
 * Skeletons for loading
 * ========================== */

export function PlanSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr),280px]">
      <div className="space-y-5">
        <div className="h-20 rounded-3xl bg-zinc-900/50 ring-1 ring-zinc-800/60 animate-pulse" />
        <div className="h-36 rounded-3xl bg-zinc-900/50 ring-1 ring-zinc-800/60 animate-pulse" />
        <div className="h-36 rounded-3xl bg-zinc-900/50 ring-1 ring-zinc-800/60 animate-pulse" />
      </div>
      <div className="md:sticky md:top-4">
        <div className="h-52 rounded-3xl bg-zinc-900/50 ring-1 ring-zinc-800/60 animate-pulse" />
      </div>
    </div>
  );
}

/* ==========================
 * Main exported component
 * ========================== */

export default function PlanViewTwoColumn({
  startReadiness,
  finalReadiness,
  path,
  blocks,
  confidence,
}: PlanProps) {
  return (
    <section className="space-y-2.5">
      {/* Header */}
      <PlanHeader start={startReadiness} final={finalReadiness} confidence={confidence} />

      {/* Two-column grid on desktop, stack on mobile */}
      <div className="grid gap-2.5 lg:grid-cols-[1fr,240px]">
        {/* Left Column: Blocks */}
        <div className="space-y-1.5 order-1">
          {blocks.map((block, index) => (
            <BlockRow key={`${block.label}-${index}`} block={block} />
          ))}
        </div>

        {/* Right Column: Predicted Path (desktop only) */}
        <div className="order-2 hidden lg:block">
          <PredictedPath path={path} />
        </div>
      </div>

      {/* Mobile: Predicted path at bottom */}
      <div className="lg:hidden">
        <PredictedPath path={path} />
      </div>
    </section>
  );
}
