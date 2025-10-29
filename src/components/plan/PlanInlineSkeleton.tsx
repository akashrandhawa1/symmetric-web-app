export function PlanInlineSkeleton() {
  return (
    <div className="space-y-2.5">
      <div className="h-12 rounded-xl bg-zinc-900/50 ring-1 ring-zinc-800/60 animate-pulse" />
      <div className="relative pl-10">
        <div className="absolute left-6 top-0 bottom-0 w-px bg-zinc-800/60" />
        <div className="space-y-2">
          <div className="h-32 rounded-xl bg-zinc-900/50 ring-1 ring-zinc-800/60 animate-pulse" />
          <div className="h-32 rounded-xl bg-zinc-900/50 ring-1 ring-zinc-800/60 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
