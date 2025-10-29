import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { PlanProps } from "../../types/plan";
import TodaySummaryCard from "./TodaySummaryCard";
import WorkoutBlock from "./WorkoutBlock";
import ReadinessDrops from "../ReadinessDrops";

export default function PremiumPlanView({
  startReadiness,
  finalReadiness,
  path,
  blocks,
  simple,
}: PlanProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalDrop = simple
    ? Math.max(0, Number(simple.totalDrop.toFixed(1)))
    : Math.max(0, Number((startReadiness - finalReadiness).toFixed(1)));

  let runningReadiness = startReadiness;
  const timeline = blocks.map((block, index) => {
    const beforeBase =
      simple?.blocks[index]?.before ?? path[index] ?? runningReadiness;
    const before = Number(beforeBase.toFixed(1));
    const rawAfter =
      simple?.blocks[index]?.after ??
      path[index + 1] ??
      Math.max(0, before - (block.predictedDrop ?? 0));
    const after = Number(rawAfter.toFixed(1));
    const dropBase =
      simple?.blocks[index]?.drop ?? before - after;
    const dropValue = Number(dropBase.toFixed(1));
    runningReadiness = after;

    return {
      block,
      drop: dropValue,
      before,
      after,
      position:
        index === 0
          ? blocks.length === 1
            ? "last"
            : "first"
          : index === blocks.length - 1
          ? "last"
          : "middle",
    } as const;
  });

  return (
    <section className="space-y-6">
      <TodaySummaryCard
        start={startReadiness}
        end={finalReadiness}
        drop={totalDrop}
        focus={blocks[0]?.label === "Main" ? "Main Session" : blocks[0]?.name}
        className="md:sticky md:top-4 md:z-10"
      />

      {simple ? (
        <div className="space-y-3">
          <ReadinessDrops plan={simple} title="Readiness Timeline" />

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-900/40 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={16} />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                View Details
              </>
            )}
          </button>
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-3xl bg-slate-950/70 p-6 ring-1 ring-white/5 backdrop-blur-sm">
              <div className="space-y-6">
                {timeline.map(({ block, drop, before, after, position }, index) => (
                  <WorkoutBlock
                    key={`${block.label}-${index}`}
                    name={block.name}
                    drop={drop}
                    afterReadiness={after}
                    beforeReadiness={before}
                    sets={block.sets}
                    reps={block.reps}
                    tempo={block.tempo}
                    restSeconds={block.rest_s}
                    note={block.why}
                    effort={block.effort}
                    label={block.label}
                    position={position}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
