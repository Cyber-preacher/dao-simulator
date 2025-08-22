"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RotateCcw, Download as DownloadIcon, Save as SaveIcon, Settings, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { MetricPill } from "@/components/MetricPill";
import { DiceBadge } from "@/components/DiceBadge";
import { ProposalEditor } from "@/components/ProposalEditor";

import { DEFAULT_STATE, ROLL_LABEL, fmtNum, fmtPct, fmtUSD, loadState, saveState, rollD6, clamp01 } from "@/lib/util";
import { applyTurn } from "@/lib/game";
import type { GameState, Proposal } from "@/lib/types";
import { generateProposalPool, drawFromPool } from "@/lib/proposalPool";

const CURSOR_KEY = "proposal-pool-cursor-v1";

export default function Page() {
  const [state, setState] = useState<GameState>(DEFAULT_STATE);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [rolls, setRolls] = useState<(number | undefined)[]>([]);
  const [marketRoll, setMarketRoll] = useState<number | undefined>(undefined);
  const [poolCursor, setPoolCursor] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const raw = localStorage.getItem(CURSOR_KEY);
    return raw ? Number(raw) || 0 : 0;
  });

  const pool = useMemo(() => generateProposalPool(100, 1337), []);

  useEffect(() => {
    const s = loadState();
    setState(s);
    if (proposals.length === 0) {
      drawThree();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(CURSOR_KEY, String(poolCursor));
    }
  }, [poolCursor]);

  function drawThree() {
    const { items, nextCursor } = drawFromPool(pool, poolCursor, 3);
    const fresh = items.map((p) => ({ ...p, accepted: false }));
    setProposals(fresh);
    setRolls([undefined, undefined, undefined]);
    setMarketRoll(undefined);
    setPoolCursor(nextCursor);
  }

  const runwayTurns = useMemo(
    () => (state.metrics.burnRate > 0 ? Math.max(0, Math.floor(state.metrics.treasuryUSD / state.metrics.burnRate)) : Infinity),
    [state.metrics]
  );

  function rollForAccepted() {
    setRolls(proposals.map((p) => (p.accepted ? rollD6() : undefined)));
  }

  function randomizeAllRolls() {
    setRolls(proposals.map((p) => (p.accepted ? rollD6() : undefined)));
    setMarketRoll(rollD6());
  }

  function applyCurrentTurn() {
    const mr = marketRoll ?? rollD6();
    const next = applyTurn(state, { proposals, rolls, marketRoll: mr });
    setState(next);
    drawThree();
  }

  function undoLastTurn() {
    if (state.history.length === 0) return;
    const baseline: GameState = { ...DEFAULT_STATE };
    baseline.name = state.name;
    baseline.priceRollTable = state.priceRollTable;
    baseline.costMultiplier = state.costMultiplier;

    const replay = [...state.history].reverse().slice(1).reverse();
    let s = { ...baseline } as GameState;
    replay.forEach((t) => {
      const props = t.proposals.map((x) => ({ ...x.proposal, accepted: !!x.roll }));
      const rolls = t.proposals.map((x) => x.roll);
      s = applyTurn(s, { proposals: props, rolls, marketRoll: t.marketRoll });
    });
    setState(s);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crypto-dao-sim_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setState(parsed);
      } catch {
        alert("Invalid JSON");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Crypto DAO Simulator</h1>
          <p className="text-sm text-muted-foreground">Conference demo • Turn {state.currentTurn}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={undoLastTurn} title="Undo last turn">
            <RotateCcw className="w-4 h-4 mr-2" /> Undo
          </Button>
          <Button variant="secondary" onClick={exportJSON} title="Export save">
            <DownloadIcon className="w-4 h-4 mr-2" /> Export
          </Button>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer">
            <SaveIcon className="w-4 h-4" />
            <span>Import</span>
            <input type="file" accept="application/json" className="hidden" onChange={importJSON} />
          </label>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Treasury & Token</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Treasury</span>
              <b>{fmtUSD(state.metrics.treasuryUSD)}</b>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Tokens</span>
              <b>{fmtNum(state.metrics.tokens)}</b>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Token Price</span>
              <b>${state.metrics.tokenPrice.toFixed(3)}</b>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Burn / turn</span>
              <b>{fmtUSD(state.metrics.burnRate)}</b>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Runway</span>
              <b>{runwayTurns === Infinity ? "∞" : `${runwayTurns} turns`}</b>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Reputation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricPill name="Development" value={state.metrics.development} />
            <MetricPill name="Community" value={state.metrics.community} />
            <MetricPill name="Hype" value={state.metrics.hype} />
          </CardContent>
        </Card>
      </div>

      {/* Turn Builder */}
      <Tabs defaultValue="turn">
        <TabsList className="grid grid-cols-3 w-full md:w-auto">
          <TabsTrigger value="turn">Turn</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" /> Settings</TabsTrigger>
          <TabsTrigger value="history"><History className="w-4 h-4 mr-2" /> History</TabsTrigger>
        </TabsList>

        <TabsContent value="turn" className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={drawThree}>Draw 3 new</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {proposals.map((p, i) => (
              <ProposalEditor
                key={p.id}
                p={p}
                onChange={(np) => setProposals((arr) => arr.map((x, idx) => (idx === i ? np : x)))}
                costMultiplier={state.costMultiplier}
              />
            ))}
          </div>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Rolls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {proposals.map((p, i) => (
                  <div key={p.id} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate mr-2">{p.title || `Proposal #${i + 1}`}</div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <DiceBadge value={rolls[i]} />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setRolls((r) => r.map((v, idx) => (idx === i ? rollD6() : v)))}
                          disabled={!p.accepted}
                        >
                          Roll
                        </Button>
                        <Input
                          className="w-16"
                          type="number"
                          min={1}
                          max={6}
                          value={rolls[i] ?? ""}
                          placeholder="d6"
                          onChange={(e) =>
                            setRolls((r) =>
                              r.map((v, idx) =>
                                idx === i ? (e.target.value ? Math.max(1, Math.min(6, Number(e.target.value))) : undefined) : v
                              )
                            )
                          }
                          disabled={!p.accepted}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Market Price Roll (d6)</div>
                  <DiceBadge value={marketRoll} />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button size="sm" variant="secondary" onClick={() => setMarketRoll(rollD6())}>
                    Roll market
                  </Button>
                  <Input
                    className="w-16"
                    type="number"
                    min={1}
                    max={6}
                    value={marketRoll ?? ""}
                    placeholder="d6"
                    onChange={(e) => setMarketRoll(e.target.value ? Math.max(1, Math.min(6, Number(e.target.value))) : undefined)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={rollForAccepted} variant="secondary">
                  Roll accepted proposals
                </Button>
                <Button onClick={randomizeAllRolls} variant="secondary">
                  Roll all
                </Button>
                <Button onClick={applyCurrentTurn}>
                  Apply turn
                </Button>
                <Button variant="ghost" onClick={drawThree}>
                  Draw 3 new
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Starting Metrics & Options</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 p-3 border rounded-lg">
                <FieldRow label="DAO Name">
                  <Input value={state.name} onChange={(e) => setState({ ...state, name: e.target.value })} placeholder="Your DAO" />
                </FieldRow>
                <FieldRow label="Treasury (USD)">
                  <Input
                    type="number"
                    value={state.metrics.treasuryUSD}
                    onChange={(e) => setState({ ...state, metrics: { ...state.metrics, treasuryUSD: Number(e.target.value || 0) } })}
                  />
                </FieldRow>
                <FieldRow label="Tokens">
                  <Input
                    type="number"
                    value={state.metrics.tokens}
                    onChange={(e) => setState({ ...state, metrics: { ...state.metrics, tokens: Number(e.target.value || 0) } })}
                  />
                </FieldRow>
                <FieldRow label="Token Price ($)">
                  <Input
                    type="number"
                    step="0.001"
                    value={state.metrics.tokenPrice}
                    onChange={(e) => setState({ ...state, metrics: { ...state.metrics, tokenPrice: Number(e.target.value || 0) } })}
                  />
                </FieldRow>
                <FieldRow label="Burn Rate (USD / turn)">
                  <Input
                    type="number"
                    value={state.metrics.burnRate}
                    onChange={(e) => setState({ ...state, metrics: { ...state.metrics, burnRate: Number(e.target.value || 0) } })}
                  />
                </FieldRow>
                <FieldRow label="Proposal cost multiplier (×)">
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={state.costMultiplier}
                    onChange={(e) => setState({ ...state, costMultiplier: Math.max(1, Math.round(Number(e.target.value || 1))) })}
                  />
                </FieldRow>
              </div>

              <div className="space-y-2 p-3 border rounded-lg">
                <div className="text-sm font-medium mb-2">Reputation Scores (0–100)</div>
                <FieldRow label="Development">
                  <Input
                    type="number"
                    value={state.metrics.development}
                    onChange={(e) => setState({ ...state, metrics: { ...state.metrics, development: clamp01(Number(e.target.value || 0)) } })}
                  />
                </FieldRow>
                <FieldRow label="Community">
                  <Input
                    type="number"
                    value={state.metrics.community}
                    onChange={(e) => setState({ ...state, metrics: { ...state.metrics, community: clamp01(Number(e.target.value || 0)) } })}
                  />
                </FieldRow>
                <FieldRow label="Hype">
                  <Input
                    type="number"
                    value={state.metrics.hype}
                    onChange={(e) => setState({ ...state, metrics: { ...state.metrics, hype: clamp01(Number(e.target.value || 0)) } })}
                  />
                </FieldRow>

                <div className="mt-4">
                  <div className="text-sm font-medium mb-1">Market Price Roll Table (d6 → %)</div>
                  <div className="grid grid-cols-6 gap-2">
                    {state.priceRollTable.map((v, i) => (
                      <Input
                        key={i}
                        type="number"
                        value={v}
                        onChange={(e) => {
                          const val = Number(e.target.value || 0);
                          const next = [...state.priceRollTable] as any;
                          next[i] = val;
                          setState({ ...state, priceRollTable: next });
                        }}
                        placeholder={["1", "2", "3", "4", "5", "6"][i]}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Default: [−10, −5, 0, +5, +10, +15]%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 pt-4">
          {state.history.length === 0 ? (
            <div className="text-sm text-muted-foreground">No turns yet. Apply your first turn to see the log.</div>
          ) : (
            <div className="space-y-3">
              {state.history.map((h) => (
                <Card key={h.turn}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Turn {h.turn}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">Token price change applied: {fmtPct(h.deltas.tokenPricePctApplied)}</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {h.proposals.map((pp, i) => (
                        <div key={i} className="p-3 rounded-lg border space-y-1">
                          <div className="font-medium truncate">{pp.proposal.title || `Proposal #${i + 1}`}</div>
                          <div className="text-xs text-muted-foreground truncate">{pp.proposal.reason}</div>
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span>Accepted</span>
                            <b>{pp.proposal.accepted ? "Yes" : "No"}</b>
                          </div>
                          {pp.roll && (
                            <div className="flex items-center justify-between text-xs">
                              <span>Roll</span>
                              <b>{pp.roll} · {ROLL_LABEL[pp.roll]}</b>
                            </div>
                          )}
                          {pp.appliedMultiplier && (
                            <div className="flex items-center justify-between text-xs">
                              <span>Multiplier</span>
                              <b>×{pp.appliedMultiplier.toFixed(2)}</b>
                            </div>
                          )}
                          <div className="text-xs mt-1">
                            <div>Costs: {fmtUSD(pp.effectiveCostUSD ?? pp.proposal.costUSD)} • {fmtNum(pp.effectiveCostTokens ?? pp.proposal.costTokens)} tokens</div>
                          </div>
                          {pp.sideNote && <div className="text-xs text-muted-foreground">{pp.sideNote}</div>}
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between text-sm">
                        <div>Market roll</div>
                        <b>{h.marketRoll} · {ROLL_LABEL[h.marketRoll]}</b>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg border text-sm">
                        <div className="font-medium mb-1">Δ Metrics</div>
                        <div>Treasury: {fmtUSD(h.deltas.treasuryUSD || 0)}</div>
                        <div>Tokens: {fmtNum(h.deltas.tokens || 0)}</div>
                        <div>Dev: {fmtNum(h.deltas.development || 0)}</div>
                        <div>Community: {fmtNum(h.deltas.community || 0)}</div>
                        <div>Hype: {fmtNum(h.deltas.hype || 0)}</div>
                      </div>
                      <div className="p-3 rounded-lg border text-sm">
                        <div className="font-medium mb-1">Post-burn</div>
                        <div>Treasury: {fmtUSD(h.postBurnTreasury)}</div>
                        <div>Runway: {h.runwayTurns} turns</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="text-xs text-muted-foreground">
        <p>
          Dice mapping: 1=Disaster (×0.25 + small penalty), 2=Poor (×0.5), 3=Neutral (×1.0), 4=Good (×1.5), 5=Great (×2.0), 6=Exceptional (×2.5 + small bonus).
          Costs spend regardless of success. Order each turn: proposals → price effects → market roll → burn.
        </p>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-3 items-center py-1">
      <div className="col-span-5 text-sm text-muted-foreground">{label}</div>
      <div className="col-span-7">{children}</div>
    </div>
  );
}