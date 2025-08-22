import React from "react";

export function MetricPill({ name, value }: { name: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 text-sm text-muted-foreground">{name}</div>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full" style={{ width: `${value}%` }} />
      </div>
      <div className="w-10 text-right text-sm font-medium">{value}</div>
    </div>
  );
}