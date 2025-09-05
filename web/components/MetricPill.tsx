import * as React from "react";

function clamp01(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function MetricPill({ name, value }: { name: string; value: number }) {
  const v = clamp01(value);
  const color =
    v >= 70 ? "bg-emerald-500" :
    v >= 40 ? "bg-amber-500" :
              "bg-rose-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground truncate" title={name}>{name}</span>
        <span className="font-medium tabular-nums">{v}</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${v}%` }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={v}
          role="progressbar"
        />
      </div>
    </div>
  );
}