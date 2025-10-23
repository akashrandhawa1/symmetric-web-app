import React from "react";
import type { PlanProps } from "../../types/plan";
import TodaySummaryCard from "./TodaySummaryCard";
import WorkoutBlock from "./WorkoutBlock";

export default function PremiumPlanView({
  startReadiness,
  finalReadiness,
  path,
  blocks,
}: PlanProps) {
  const totalDrop = Math.max(0, startReadiness - finalReadiness);

  let runningReadiness = startReadiness;
  const timeline = blocks.map((block, index) => {
    const before = path[index] ?? runningReadiness;
    const predicted = Math.max(
      0,
      Math.round(
        block.predictedDrop ??
          Math.max(0, before - (path[index + 1] ?? finalReadiness))
      )
    );
    const after = path[index + 1] ?? Math.max(0, before - predicted);
    runningReadiness = after;

    return {
      block,
      drop: predicted,
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

      <div className="rounded-3xl bg-slate-950/70 p-6 ring-1 ring-white/5 backdrop-blur-sm">
        <div className="space-y-6">
          {timeline.map(({ block, drop, after, position }, index) => (
            <WorkoutBlock
              key={`${block.label}-${index}`}
              name={block.name}
              drop={drop}
              afterReadiness={after}
              sets={block.sets}
              reps={block.reps}
              tempo={block.tempo}
              note={block.why}
              effort={block.effort}
              label={block.label}
              position={position}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
