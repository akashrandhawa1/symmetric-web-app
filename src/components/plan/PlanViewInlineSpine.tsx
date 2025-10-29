import React from "react";
import type { PlanProps } from "../../types/plan";
import { BlockRow } from "./BlockRow";
import { PlanSpineOverlay } from "./PlanSpineOverlay";

export default function PlanViewInlineSpine({
  startReadiness, finalReadiness, path, blocks, confidence
}: PlanProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const blockRefs = React.useMemo(
    () => blocks.map(() => React.createRef<HTMLDivElement>()),
    [blocks.length]
  );

  return (
    <section className="space-y-2.5">
      {/* Header */}
      <div className="rounded-xl bg-zinc-950/60 p-2.5 ring-1 ring-zinc-800">
        <div className="flex items-baseline justify-between flex-wrap gap-1.5">
          <h2 className="text-xs font-semibold text-zinc-100">Today's Plan</h2>
          <div className="text-[10px] text-zinc-400">
            R <span className="font-semibold text-zinc-100">{startReadiness}</span>
            {" → "}
            <span className="font-semibold text-emerald-300">{finalReadiness}</span>
          </div>
        </div>
      </div>

      {/* Inline spine + cards */}
      <div ref={containerRef} className="relative pl-10">
        <PlanSpineOverlay containerRef={containerRef} blockRefs={blockRefs} path={path} />
        <div className="space-y-2 relative z-10">
          {blocks.map((b, i) => (
            <BlockRow key={`${b.label}-${i}`} ref={blockRefs[i]} block={b} />
          ))}
        </div>
      </div>
    </section>
  );
}
