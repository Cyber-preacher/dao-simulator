import React from "react";
import { Dice5 } from "lucide-react";
import { ROLL_LABEL } from "@/lib/util";

export function DiceBadge({ value }: { value?: number }) {
  if (!value) return <div className="text-xs text-muted-foreground">—</div>;
  return (
    <div className="text-xs px-2 py-1 rounded-full border inline-flex items-center gap-1">
      <Dice5 className="w-3 h-3" />
      <span>
        {value} · {ROLL_LABEL[value]}
      </span>
    </div>
  );
}