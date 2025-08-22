import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { Proposal } from "@/lib/types";
import { fmtNum, fmtUSD } from "@/lib/util";

export function ProposalEditor({
  p,
  onChange,
  costMultiplier = 1,
}: {
  p: Proposal;
  onChange: (next: Proposal) => void;
  costMultiplier?: number;
}) {
  const effUSD = Math.round((p.costUSD || 0) * (costMultiplier || 1));
  const effTok = Math.round((p.costTokens || 0) * (costMultiplier || 1));

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold leading-6">{p.title || "Proposal"}</h3>
          <label className="flex items-center gap-2 text-sm">
            <span>Accepted</span>
            <Switch checked={p.accepted} onCheckedChange={(v) => onChange({ ...p, accepted: v })} />
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="prose text-base">
          <p className="whitespace-pre-wrap">{p.reason}</p>
        </div>

        {(p.customGood || p.customBad) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {p.customGood && (
              <div className="text-sm p-3 rounded-lg bg-muted/50">
                <div className="font-medium mb-1">GOOD (on 4–6)</div>
                <div className="text-muted-foreground">{p.customGood}</div>
              </div>
            )}
            {p.customBad && (
              <div className="text-sm p-3 rounded-lg bg-muted/50">
                <div className="font-medium mb-1">BAD (on 1–2)</div>
                <div className="text-muted-foreground">{p.customBad}</div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Stat label="Effective Cost (USD)" value={fmtUSD(effUSD)} />
          <Stat label="Effective Cost (Tokens)" value={fmtNum(effTok)} />
          <Stat label="Development (±)" value={fmtNum(p.baseDev)} />
          <Stat label="Community (±)" value={fmtNum(p.baseCommunity)} />
          <Stat label="Hype (±)" value={fmtNum(p.baseHype)} />
          <Stat label="Token Price (baseline %)" value={fmtNum(p.baseTokenPricePct)} />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg border">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}