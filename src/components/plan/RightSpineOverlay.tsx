import React from "react";
import clsx from "classnames";
import { motion } from "framer-motion";

type OverlayPoint = { x: number; y: number };

type Props = {
  containerRef: React.RefObject<HTMLDivElement>;
  blockRefs: React.RefObject<HTMLDivElement>[];
  path: number[];
  drops: number[];
  gutter?: number;
};

const severityColor = (drop: number) => {
  if (drop >= 8) {
    return {
      bar: "rgb(244,63,94)",
      text: "text-rose-300",
      chip: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/30",
    };
  }
  if (drop >= 5) {
    return {
      bar: "rgb(251,191,36)",
      text: "text-amber-300",
      chip: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30",
    };
  }
  return {
    bar: "rgb(52,211,153)",
    text: "text-emerald-300",
    chip: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30",
  };
};

export default function RightSpineOverlay({
  containerRef,
  blockRefs,
  path,
  drops,
  gutter = 56,
}: Props) {
  const [points, setPoints] = React.useState<OverlayPoint[]>([]);
  const [height, setHeight] = React.useState(0);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const compute = () => {
      const rect = container.getBoundingClientRect();
      const lineX = rect.width - gutter;
      const pts = blockRefs.map((ref) => {
        const el = ref.current;
        if (!el) return { x: lineX, y: 0 };
        const elRect = el.getBoundingClientRect();
        return {
          x: lineX,
          y: (elRect.top + elRect.bottom) / 2 - rect.top,
        };
      });

      setPoints(pts);
      setHeight(container.scrollHeight);
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(container);
    blockRefs.forEach((ref) => ref.current && observer.observe(ref.current));
    window.addEventListener("resize", compute);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [containerRef, blockRefs, gutter]);

  if (!containerRef.current || points.length === 0) {
    return null;
  }

  const yValues = points.map((p) => p.y);
  const startY = Math.max(12, Math.min(...yValues) - 28);
  const endY = Math.min(height - 12, Math.max(...yValues) + 28);
  const lineX = points[0]?.x ?? 0;
  const labelWidth = 148;

  return (
    <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden>
      <svg
        width="100%"
        height={height}
        className="absolute inset-0"
        role="presentation"
      >
        <defs>
          <linearGradient id="right-spine-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(148,163,184,0.2)" />
            <stop offset="55%" stopColor="rgba(148,163,184,0.35)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0.5)" />
          </linearGradient>
        </defs>

        <motion.line
          x1={lineX}
          x2={lineX}
          y1={startY}
          y2={endY}
          stroke="url(#right-spine-gradient)"
          strokeWidth={1.5}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />

        {points.map((point, index) => {
          const isStart = index === 0;
          const isEnd = index === points.length - 1;

          const dotColor = isEnd
            ? "rgb(52,211,153)"
            : isStart
            ? "rgb(161,161,170)"
            : "rgb(113,113,122)";

          return (
            <g key={`node-${index}`}>
              <motion.circle
                cx={point.x}
                cy={point.y}
                r={8}
                fill="rgba(15,23,42,0.25)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.34, delay: index * 0.06 }}
              />
              <motion.circle
                cx={point.x}
                cy={point.y}
                r={4.5}
                fill={dotColor}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1.2}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  duration: 0.34,
                  delay: index * 0.06 + 0.05,
                  type: "spring",
                  stiffness: 220,
                  damping: 20,
                }}
              />
            </g>
          );
        })}
      </svg>

      {points.map((point, index) => {
        const readiness = path[Math.min(index, path.length - 1)];
        const previous = index === 0 ? null : path[index - 1] ?? null;
        const delta = previous != null ? Math.max(0, previous - readiness) : 0;
        const drop = drops[index] ?? delta;
        const { bar, text, chip } = severityColor(drop);
        const tag = index === 0 ? "Start" : index === points.length - 1 ? "Final" : null;

        return (
          <div
            key={`label-${index}`}
            className="absolute flex w-[148px] translate-y-[-50%] flex-col gap-1 rounded-xl bg-zinc-950/80 px-3 py-2 text-right ring-1 ring-white/5 backdrop-blur-sm"
            style={{
              top: point.y,
              left: Math.max(0, point.x - labelWidth - 16),
            }}
          >
            <div className="flex items-center justify-end gap-1">
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  chip
                )}
              >
                −{drop} R
              </span>

              {tag && (
                <span
                  className={clsx(
                    "rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wide",
                    tag === "Final"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-zinc-700/40 text-zinc-300"
                  )}
                >
                  {tag}
                </span>
              )}
            </div>

            <div className="text-[11px] font-medium text-zinc-200">R = {readiness}</div>

            {index > 0 && (
              <div className="text-[10px] text-zinc-500">
                −{delta} readiness vs previous
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800/80">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(12, Math.min(100, (drop / 12) * 100))}%`,
                    backgroundColor: bar,
                  }}
                />
              </div>
              <span className={clsx("text-[10px] font-medium", text)}>
                −{drop} R
              </span>
            </div>
          </div>
        );
      })}

      <div
        className="absolute rounded-xl bg-zinc-950/80 px-3 py-2 text-right text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400 ring-1 ring-white/5 backdrop-blur-sm"
        style={{
          top: Math.max(8, startY - 44),
          left: Math.max(0, lineX - labelWidth - 16),
        }}
      >
        Readiness Path
      </div>
    </div>
  );
}
