import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { Proposal } from "@/lib/types";
import { fmtNum, fmtUSD } from "@/lib/util";

export function ProposalEditor({
  p,
  onChange,
  costMultiplier = 1,
  currentTokenPrice,
  treasuryUSD,
  tokens,
}: {
  p: Proposal;
  onChange: (next: Proposal) => void;
  costMultiplier?: number;
  currentTokenPrice: number;
  treasuryUSD: number;
  tokens: number;
}) {
  const effUSD = Math.max(0, Math.round((p.costUSD || 0) * (costMultiplier || 1)));
  const price = Math.max(0.000001, Number(currentTokenPrice) || 0); // real price; no fake 0.0001 fallback
  const effTok = Math.max(0, Math.round(effUSD / price));

  const showChoice = p.payOptions === "EITHER";
  const payWith: "USD" | "TOKENS" =
    p.payOptions === "USD" ? "USD" :
    p.payOptions === "TOKENS" ? "TOKENS" :
    (p.payWith === "TOKENS" ? "TOKENS" : "USD");

  const canPayUSD = treasuryUSD >= effUSD;
  const canPayTOK = tokens >= effTok;

  // When switching method on EITHER, persist choice on the proposal
  function setPay(withWhat: "USD" | "TOKENS") {
    if (p.payOptions !== "EITHER") return;
    onChange({ ...p, payWith: withWhat });
  }

  // What we will actually deduct on Apply Turn
  const willPay = payWith === "USD" ? fmtUSD(effUSD) : `${fmtNum(effTok)} tokens`;
  const equiv = payWith === "USD" ? `≈ ${fmtNum(effTok)} T` : `≈ ${fmtUSD(effUSD)}`;

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3 min-w-0">
          <h3 className="text-lg font-semibold leading-6 break-words">{p.title || "Proposal"}</h3>
          <label className="flex items-center gap-2 text-sm">
            <span>Accepted</span>
            <Switch checked={p.accepted} onCheckedChange={(v) => onChange({ ...p, accepted: v })} />
          </label>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="prose text-base">
          <p className="whitespace-pre-wrap break-words">{p.reason}</p>
        </div>

        {(p.customGood || p.customBad) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {p.customGood && (
              <div className="text-sm p-3 rounded-lg bg-muted/50">
                <div className="font-medium mb-1">GOOD (on 4–6)</div>
                <div className="text-muted-foreground break-words">{p.customGood}</div>
              </div>
            )}
            {p.customBad && (
              <div className="text-sm p-3 rounded-lg bg-muted/50">
                <div className="font-medium mb-1">BAD (on 1–2)</div>
                <div className="text-muted-foreground break-words">{p.customBad}</div>
              </div>
            )}
          </div>
        )}

        {/* Payment selection */}
        {showChoice ? (
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">Payment</div>
            <div className="inline-flex text-xs rounded-md border overflow-hidden">
              <button
                className={`px-3 py-1 ${payWith === "USD" ? "bg-primary text-primary-foreground" : "bg-background"} ${canPayUSD ? "" : "opacity-50 cursor-not-allowed"}`}
                onClick={() => canPayUSD && setPay("USD")}
                title={canPayUSD ? "" : "Insufficient USD"}
              >
                USD
              </button>
              <button
                className={`px-3 py-1 border-l ${payWith === "TOKENS" ? "bg-primary text-primary-foreground" : "bg-background"} ${canPayTOK ? "" : "opacity-50 cursor-not-allowed"}`}
                onClick={() => canPayTOK && setPay("TOKENS")}
                title={canPayTOK ? "" : "Insufficient tokens"}
              >
                Tokens
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Paying in <b>{p.payOptions === "USD" ? "USD" : "Tokens"}</b>
          </div>
        )}

        {/* Costs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat label="You will pay" value={willPay} />
          <Stat label="Equivalent" value={equiv} />
          <Stat label="Dev (base±)" value={fmtNum(p.baseDev)} />
          <Stat label="Comm (base±)" value={fmtNum(p.baseCommunity)} />
          <Stat label="Hype (base±)" value={fmtNum(p.baseHype)} />
          <Stat label="Price (base%)" value={fmtNum(p.baseTokenPricePct)} />
          {typeof p.baseBurnRateDelta === "number" && p.baseBurnRateDelta !== 0 && (
            <Stat label="Burn Δ/turn" value={fmtUSD(p.baseBurnRateDelta)} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg border min-w-0">
      <div className="text-xs text-muted-foreground truncate" title={label}>{label}</div>
      <div className="font-medium mt-0.5 break-words tabular-nums">{value}</div>
    </div>
  );
}
