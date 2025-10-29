import React from "react";
import type { PlanProps } from "@/types/plan";
import { BlockRow } from "./BlockRow";
import RightSpineOverlay from "./RightSpineOverlay";

function Header({
  start,
  final,
  confidence,
}: {
  start: number;
  final: number;
  confidence?: number;
}) {
  const delta = Math.max(0, start - final);
  return (
    <div className="rounded-2xl bg-zinc-950/70 px-4 py-3 ring-1 ring-white/5 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Today&apos;s Workout
          </div>
          <p className="mt-1 text-[12px] text-zinc-400">
            Each block keeps you inside the productive readiness band.
          </p>
        </div>
        <div className="text-right text-sm text-zinc-300">
          <div className="font-semibold text-white">
            R {start}
            <span className="mx-1 text-zinc-500">→</span>
            <span className="text-emerald-300">{final}</span>
          </div>
          <div className="text-[11px] text-zinc-500">Total drop −{delta} R</div>
          {confidence != null && (
            <div className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">
              Confidence {Math.round(confidence * 100)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlanViewWithRightSpine({
  startReadiness,
  finalReadiness,
  path,
  blocks,
  confidence,
}: PlanProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const blockRefs = React.useMemo(
    () => blocks.map(() => React.createRef<HTMLDivElement>()),
    [blocks.length]
  );

  return (
    <section className="space-y-4 md:space-y-5">
      <Header
        start={startReadiness}
        final={finalReadiness}
        confidence={confidence}
      />

      <div ref={containerRef} className="relative md:pr-52">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden md:flex flex-col items-end gap-2 text-right text-[10px] text-zinc-500">
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/20">
            Desktop preview
          </span>
          <span>Readiness spine hidden on mobile</span>
        </div>

        <RightSpineOverlay
          containerRef={containerRef}
          blockRefs={blockRefs}
          path={path}
          drops={blocks.map((block) => block.predictedDrop)}
        />

        <div className="relative z-10 space-y-3">
          {blocks.map((block, index) => (
            <BlockRow key={`${block.label}-${index}`} ref={blockRefs[index]} block={block} />
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-zinc-950/60 px-4 py-3 text-[12px] text-zinc-400 ring-1 ring-white/5">
        <div className="font-medium text-zinc-200">
          How to read the spine
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Emerald dot marks your final readiness after the plan</li>
          <li>Each bar shows expected readiness drop for that block</li>
          <li>Labels call out readiness compared to the previous block</li>
        </ul>
      </div>
    </section>
  );
}
