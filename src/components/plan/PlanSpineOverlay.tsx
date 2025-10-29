import React from "react";
import { motion } from "framer-motion";

type SpineProps = {
  containerRef: React.RefObject<HTMLDivElement>;
  blockRefs: React.RefObject<HTMLDivElement>[];
  path: number[];                  // e.g., [65, 57, 51]
  gutter?: number;                 // px from container's left edge (default 24)
};

export function PlanSpineOverlay({ containerRef, blockRefs, path, gutter = 24 }: SpineProps) {
  const [points, setPoints] = React.useState<{ x: number; y: number }[]>([]);
  const [height, setHeight] = React.useState(0);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const compute = () => {
      const cRect = container.getBoundingClientRect();
      const pts = blockRefs.map(ref => {
        const el = ref.current;
        if (!el) return { x: gutter, y: 0 };
        const r = el.getBoundingClientRect();
        return { x: gutter, y: (r.top + r.bottom) / 2 - cRect.top };
      });
      setPoints(pts);
      setHeight(container.clientHeight);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    blockRefs.forEach(r => r.current && ro.observe(r.current));
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [containerRef, blockRefs, gutter]);

  if (!containerRef.current || points.length === 0 || path.length < 2) return null;
  const startY = points[0]?.y ?? 0;
  const endY = points[points.length - 1]?.y ?? height - 16;

  return (
    <svg className="pointer-events-none absolute inset-0 z-0" width="100%" height={height} aria-hidden>
      {/* Spine */}
      <motion.line
        x1={gutter} x2={gutter}
        y1={startY} y2={endY}
        stroke="rgba(148,163,184,0.35)" strokeWidth="1"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />
      {/* Nodes + labels */}
      {points.map((p, i) => {
        const start = i === 0, end = i === points.length - 1;
        const rVal = path[Math.min(i, path.length - 1)];
        const delta = i === 0 ? 0 : Math.max(0, path[i - 1] - path[i]);
        const dot = end ? "rgb(52,211,153)" : start ? "rgb(161,161,170)" : "rgb(212,212,216)";
        const label = end ? "FINAL" : start ? "START" : "";
        return (
          <g key={i}>
            <motion.circle
              cx={p.x} cy={p.y} r={5}
              fill={dot}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.25, delay: i * 0.08 }}
            />
            <motion.text
              x={p.x + 12} y={p.y - 2}
              fill={end ? "rgb(110,231,183)" : "rgb(228,228,231)"}
              style={{ fontFamily: "inherit", fontSize: 12, fontWeight: end ? 600 : 500 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: i * 0.08 + 0.1 }}
            >
              R = {rVal} {label}
            </motion.text>
            {i > 0 && (
              <motion.text
                x={p.x + 12} y={p.y + 12}
                fill="rgb(161,161,170)"
                style={{ fontFamily: "inherit", fontSize: 11 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: i * 0.08 + 0.15 }}
              >
                −{delta} from previous
              </motion.text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
