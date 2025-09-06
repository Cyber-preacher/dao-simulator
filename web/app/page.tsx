"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RotateCcw, Download as DownloadIcon, Save as SaveIcon, Settings, History, Store, Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { MetricPill } from "@/components/MetricPill";
import { DiceBadge } from "@/components/DiceBadge";
import { ProposalEditor } from "@/components/ProposalEditor";

import { DEFAULT_STATE, ROLL_LABEL, fmtNum, fmtPct, fmtUSD, loadState, saveState, rollD6, clamp01 } from "@/lib/util";
import { applyTurn } from "@/lib/game";
import type { GameState, Proposal, TradeEntry } from "@/lib/types";
import { generateProposalPool, makeDeck, drawFromDeck } from "@/lib/proposalPool";

const CURSOR_KEY = "proposal-pool-cursor-v3";
const DECK_KEY = "proposal-pool-deck-v3";

export default function Page() {
  const [state, setState] = useState<GameState>(DEFAULT_STATE);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [rolls, setRolls] = useState<(number | undefined)[]>([]);
  const [marketRoll, setMarketRoll] = useState<number | undefined>(undefined);
  const [poolCursor, setPoolCursor] = useState<number>(0);
  const [deck, setDeck] = useState<number[]>([]);

  // Trade inputs
  const [buyUSD, setBuyUSD] = useState<string>("");
  const [sellUSD, setSellUSD] = useState<string>("");

  const pool = useMemo(() => generateProposalPool(100, 1337), []);
  const isOver = state.status !== "RUNNING";

  // Initial load: state + deck/cursor + first draw
  useEffect(() => {
    const s = loadState();
    setState(s);

    if (typeof window === "undefined") return;

    let storedDeck: number[] | null = null;
    try {
      const rawDeck = localStorage.getItem(DECK_KEY);
      if (rawDeck) storedDeck = JSON.parse(rawDeck);
    } catch {}
    if (!storedDeck || !Array.isArray(storedDeck) || storedDeck.length !== pool.length) {
      storedDeck = makeDeck(pool.length, 1337);
      localStorage.setItem(DECK_KEY, JSON.stringify(storedDeck));
      localStorage.setItem(CURSOR_KEY, "0");
    }
    setDeck(storedDeck);

    const rawCursor = localStorage.getItem(CURSOR_KEY);
    const initialCursor = rawCursor ? Number(rawCursor) || 0 : 0;
    setPoolCursor(initialCursor);

    if (proposals.length === 0) {
      const res = drawFromDeck(pool, storedDeck, initialCursor, 3, Date.now());
      setProposals(res.items.map((p) => ({ ...p, accepted: false })));
      setRolls([undefined, undefined, undefined]);
      setMarketRoll(undefined);
      setDeck(res.deck);
      setPoolCursor(res.nextCursor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist state
  useEffect(() => { saveState(state); }, [state]);

  // persist deck/cursor
  useEffect(() => {
    if (typeof window !== "undefined") { try { localStorage.setItem(DECK_KEY, JSON.stringify(deck)); } catch {} }
  }, [deck]);
  useEffect(() => {
    if (typeof window !== "undefined") { localStorage.setItem(CURSOR_KEY, String(poolCursor)); }
  }, [poolCursor]);

  function drawThree() {
    const res = drawFromDeck(pool, deck, poolCursor, 3, Date.now());
    const fresh = res.items.map((p) => ({ ...p, accepted: false }));
    setProposals(fresh);
    setRolls([undefined, undefined, undefined]);
    setMarketRoll(undefined);
    setDeck(res.deck);
    setPoolCursor(res.nextCursor);
  }

  const runwayTurns = React.useMemo(
    () => (state.metrics.burnRate > 0 ? Math.max(0, Math.floor(state.metrics.treasuryUSD / state.metrics.burnRate)) : Infinity),
    [state.metrics]
  );

  function rollForAccepted() { if (isOver) return; setRolls(proposals.map((p) => (p.accepted ? rollD6() : undefined))); }
  function randomizeAllRolls() { if (isOver) return; setRolls(proposals.map((p) => (p.accepted ? rollD6() : undefined))); setMarketRoll(rollD6()); }

  function applyCurrentTurn() {
    if (isOver) return;
    const mr = marketRoll ?? rollD6();
    const next = applyTurn(state, { proposals, rolls, marketRoll: mr });
    setState(next);
    if (next.status === "RUNNING") drawThree();
  }

  function undoLastTurn() {
    if (state.history.length === 0) return;
    const baseline: GameState = { ...DEFAULT_STATE };
    baseline.name = state.name;
    baseline.priceRollTable = state.priceRollTable;
    baseline.costMultiplier = state.costMultiplier;
    baseline.volatilityFactor = state.volatilityFactor;
    baseline.marketDepthUSD = state.marketDepthUSD;

    const replay = [...state.history].reverse().slice(1).reverse();
    let s = { ...baseline } as GameState;
    replay.forEach((t) => {
      const props = t.proposals.map((x) => ({ ...x.proposal, accepted: !!x.roll }));
      const rolls = t.proposals.map((x) => x.roll);
      s = applyTurn(s, { proposals: props, rolls, marketRoll: t.marketRoll });
    });
    s.tradeHistory = state.tradeHistory;
    s.status = "RUNNING";
    s.endReason = undefined;
    setState(s);
  }

  function newGame() {
    // Keep name & settings; reset metrics, history, trades, status
    const reset: GameState = {
      ...DEFAULT_STATE,
      name: state.name,
      priceRollTable: state.priceRollTable,
      costMultiplier: state.costMultiplier,
      volatilityFactor: state.volatilityFactor,
      marketDepthUSD: state.marketDepthUSD,
    };
    setState(reset);
    const nd = makeDeck(pool.length, Date.now());
    setDeck(nd);
    setPoolCursor(0);
    try {
      localStorage.setItem(DECK_KEY, JSON.stringify(nd));
      localStorage.setItem(CURSOR_KEY, "0");
    } catch {}
    const res = drawFromDeck(pool, nd, 0, 3, Date.now());
    setProposals(res.items.map((p) => ({ ...p, accepted: false })));
    setRolls([undefined, undefined, undefined]);
    setMarketRoll(undefined);
    setDeck(res.deck);
    setPoolCursor(res.nextCursor);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `crypto-dao-sim_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  }
  function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const parsed = JSON.parse(String(reader.result)); setState(parsed); } catch { alert("Invalid JSON"); } };
    reader.readAsText(file);
  }

  // ----- Trade helpers -----
  function previewImpact(usdSigned: number) {
    const depth = Math.max(1, state.marketDepthUSD);
    const p0 = Math.max(0.000001, state.metrics.tokenPrice);
    const p1 = p0 * Math.exp(usdSigned / depth);
    const pct = (p1 / p0 - 1) * 100;
    return { p0, p1, pct };
  }

  function doTrade(kind: "BUY" | "SELL", usdAmount: number) {
    if (isOver) return;
    const absUSD = Math.max(0, Math.round(usdAmount));
    if (absUSD === 0) return;

    const p0 = Math.max(0.000001, state.metrics.tokenPrice);
    const { p1, pct } = previewImpact(kind === "BUY" ? absUSD : -absUSD);

    let deltaUSD = 0;
    let deltaTokens = 0;

    if (kind === "BUY") {
      if (state.metrics.treasuryUSD < absUSD) { alert("Not enough USD in treasury."); return; }
      deltaUSD = -absUSD;
      deltaTokens = Math.round(absUSD / p0);
    } else {
      const wantTokens = Math.round(absUSD / p0);
      const sellTokens = Math.min(state.metrics.tokens, wantTokens);
      if (sellTokens <= 0) { alert("No tokens to sell."); return; }
      deltaTokens = -sellTokens;
      deltaUSD = Math.round(sellTokens * p0);
    }

    // Compute next metrics first to evaluate loss
    const nextTreasury = state.metrics.treasuryUSD + deltaUSD;
    const nextTokens = state.metrics.tokens + deltaTokens;

    const entry: TradeEntry = {
      ts: Date.now(),
      kind,
      usd: Math.abs(deltaUSD),
      tokens: Math.abs(deltaTokens),
      priceBefore: p0,
      priceAfter: p1,
      impactPct: pct,
    };

    let status: GameState["status"] = state.status;
    let endReason: string | undefined = state.endReason;
    if (nextTreasury <= 0) { status = "LOST"; endReason = "Treasury depleted (trade)."; }

    setState((s) => ({
      ...s,
      metrics: { ...s.metrics, treasuryUSD: nextTreasury, tokens: nextTokens, tokenPrice: p1 },
      tradeHistory: [entry, ...s.tradeHistory],
      status,
      endReason,
    }));
  }

  const remainingInDeck = Math.max(0, (deck?.length || 0) - poolCursor);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* End banner */}
      {isOver && (
        <Card className="border-2 border-destructive">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Flag className="w-5 h-5 text-destructive" />
                  {state.status === "WON" ? "You win!" : "Game over"}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{state.endReason || (state.status === "WON" ? "Victory condition reached." : "Defeat condition reached.")}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={newGame}>Start New Game</Button>
                <Button variant="secondary" onClick={undoLastTurn} title="Undo last turn">Undo</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Crypto DAO Simulator</h1>
          <p className="text-sm text-muted-foreground">Conference demo • Turn {state.currentTurn} • {state.status === "RUNNING" ? `Survive to ${state.winTurnTarget}` : state.status}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={undoLastTurn} title="Undo last turn"><RotateCcw className="w-4 h-4 mr-2" /> Undo</Button>
          <Button variant="secondary" onClick={exportJSON} title="Export save"><DownloadIcon className="w-4 h-4 mr-2" /> Export</Button>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer">
            <SaveIcon className="w-4 h-4" /><span>Import</span>
            <input type="file" accept="application/json" className="hidden" onChange={importJSON} />
          </label>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Treasury & Token</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Row name="Treasury" value={fmtUSD(state.metrics.treasuryUSD)} />
            <Row name="Tokens" value={fmtNum(state.metrics.tokens)} />
            <Row name="Token Price" value={`$${state.metrics.tokenPrice.toFixed(4)}`} />
            <Row name="Burn / turn" value={fmtUSD(state.metrics.burnRate)} />
            <Row name="Runway" value={runwayTurns === Infinity ? "∞" : `${runwayTurns} turns`} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Reputation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <MetricPill name="Dev" value={state.metrics.development} />
            <MetricPill name="Comm" value={state.metrics.community} />
            <MetricPill name="Hype" value={state.metrics.hype} />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="turn">
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="turn">Turn</TabsTrigger>
          <TabsTrigger value="trade"><Store className="w-4 h-4 mr-2" /> Trade</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" /> Settings</TabsTrigger>
          <TabsTrigger value="history"><History className="w-4 h-4 mr-2" /> History</TabsTrigger>
        </TabsList>

        {/* TURN */}
        <TabsContent value="turn" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={drawThree} disabled={isOver}>Draw 3 new</Button>
            <Button
              variant="ghost"
              disabled={isOver}
              onClick={() => {
                const nd = makeDeck(pool.length, Date.now());
                setDeck(nd);
                setPoolCursor(0);
                try { localStorage.setItem(DECK_KEY, JSON.stringify(nd)); localStorage.setItem(CURSOR_KEY, "0"); } catch {}
                const res = drawFromDeck(pool, nd, 0, 3, Date.now());
                setProposals(res.items.map((p) => ({ ...p, accepted: false })));
                setRolls([undefined, undefined, undefined]);
                setMarketRoll(undefined);
                setDeck(res.deck);
                setPoolCursor(res.nextCursor);
              }}
            >Reshuffle</Button>
            <div className="text-sm text-muted-foreground">Pool left: <b>{remainingInDeck}</b> / {pool.length}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {proposals.map((p, i) => (
              <ProposalEditor
                key={p.id}
                p={p}
                onChange={(np) => setProposals((arr) => arr.map((x, idx) => (idx === i ? np : x)))}
                costMultiplier={state.costMultiplier}
                currentTokenPrice={state.metrics.tokenPrice}
                treasuryUSD={state.metrics.treasuryUSD}
                tokens={state.metrics.tokens}
              />
            ))}
          </div>

          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Rolls</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {proposals.map((p, i) => (
                  <div key={p.id} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate mr-2 min-w-0">{p.title || `Proposal #${i + 1}`}</div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <DiceBadge value={rolls[i]} />
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setRolls((r) => r.map((v, idx) => (idx === i ? rollD6() : v)))} disabled={!p.accepted || isOver}>Roll</Button>
                        <Input className="w-16" type="number" min={1} max={6} value={rolls[i] ?? ""} placeholder="d6"
                          onChange={(e) => setRolls((r) => r.map((v, idx) => idx === i ? (e.target.value ? Math.max(1, Math.min(6, Number(e.target.value))) : undefined) : v))}
                          disabled={!p.accepted || isOver} />
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
                  <Button size="sm" variant="secondary" onClick={() => setMarketRoll(rollD6())} disabled={isOver}>Roll market</Button>
                  <Input className="w-16" type="number" min={1} max={6} value={marketRoll ?? ""} placeholder="d6"
                    onChange={(e) => setMarketRoll(e.target.value ? Math.max(1, Math.min(6, Number(e.target.value))) : undefined)} disabled={isOver} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={rollForAccepted} variant="secondary" disabled={isOver}>Roll accepted proposals</Button>
                <Button onClick={randomizeAllRolls} variant="secondary" disabled={isOver}>Roll all</Button>
                <Button onClick={applyCurrentTurn} disabled={isOver}>Apply turn</Button>
                <Button variant="ghost" onClick={drawThree} disabled={isOver}>Draw 3 new</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRADE */}
        <TabsContent value="trade" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BUY */}
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-base">Buy token (spend USD)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-5 text-sm text-muted-foreground">Amount (USD)</div>
                  <div className="col-span-7"><Input type="number" min={0} disabled={isOver} value={buyUSD} onChange={(e) => setBuyUSD(e.target.value)} placeholder="10000" /></div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Est. tokens: <b>{fmtNum(Math.max(0, Math.round((Number(buyUSD || 0)) / Math.max(0.000001, state.metrics.tokenPrice))))}</b>
                </div>
                <div className="text-xs">Price impact: <b>{fmtPct(previewImpact(Number(buyUSD || 0)).pct)}</b> → ${previewImpact(Number(buyUSD || 0)).p1.toFixed(4)}</div>
                <div className="flex gap-2">
                  <Button disabled={isOver || Number(buyUSD || 0) <= 0 || state.metrics.treasuryUSD < Number(buyUSD || 0)} onClick={() => doTrade("BUY", Number(buyUSD || 0))}>
                    Execute buy
                  </Button>
                  <Button variant="ghost" onClick={() => setBuyUSD("")} disabled={isOver}>Clear</Button>
                </div>
              </CardContent>
            </Card>

            {/* SELL */}
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-base">Sell token (receive USD)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-5 text-sm text-muted-foreground">Target USD</div>
                  <div className="col-span-7"><Input type="number" min={0} disabled={isOver} value={sellUSD} onChange={(e) => setSellUSD(e.target.value)} placeholder="10000" /></div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Est. tokens to sell: <b>{fmtNum(Math.max(0, Math.round((Number(sellUSD || 0)) / Math.max(0.000001, state.metrics.tokenPrice))))}</b> (you have {fmtNum(state.metrics.tokens)})
                </div>
                <div className="text-xs">Price impact: <b>{fmtPct(previewImpact(-Number(sellUSD || 0)).pct)}</b> → ${previewImpact(-Number(sellUSD || 0)).p1.toFixed(4)}</div>
                <div className="flex gap-2">
                  <Button disabled={isOver || Number(sellUSD || 0) <= 0 || state.metrics.tokens <= 0} onClick={() => doTrade("SELL", Number(sellUSD || 0))}>
                    Execute sell
                  </Button>
                  <Button variant="ghost" onClick={() => setSellUSD("")} disabled={isOver}>Clear</Button>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="text-xs text-muted-foreground">
            Impact model: <code>priceAfter = priceBefore × e^(USD / MarketDepth)</code>. Tweak Market Depth in <b>Settings</b>.
          </div>
        </TabsContent>

        {/* SETTINGS */}
        <TabsContent value="settings" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Starting Metrics & Options</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 p-3 border rounded-lg">
                <FieldRow label="DAO Name"><Input value={state.name} onChange={(e) => setState({ ...state, name: e.target.value })} placeholder="Your DAO" /></FieldRow>
                <FieldRow label="Treasury (USD)"><Input type="number" value={state.metrics.treasuryUSD} onChange={(e) => setState({ ...state, metrics: { ...state.metrics, treasuryUSD: Number(e.target.value || 0) } })} /></FieldRow>
                <FieldRow label="Tokens"><Input type="number" value={state.metrics.tokens} onChange={(e) => setState({ ...state, metrics: { ...state.metrics, tokens: Number(e.target.value || 0) } })} /></FieldRow>
                <FieldRow label="Token Price ($)"><Input type="number" step="0.0001" value={state.metrics.tokenPrice} onChange={(e) => setState({ ...state, metrics: { ...state.metrics, tokenPrice: Number(e.target.value || 0) } })} /></FieldRow>
                <FieldRow label="Burn Rate (USD / turn)"><Input type="number" value={state.metrics.burnRate} onChange={(e) => setState({ ...state, metrics: { ...state.metrics, burnRate: Number(e.target.value || 0) } })} /></FieldRow>
                <FieldRow label="Proposal cost multiplier (×)"><Input type="number" min={1} step={1} value={state.costMultiplier} onChange={(e) => setState({ ...state, costMultiplier: Math.max(1, Math.round(Number(e.target.value || 1))) })} /></FieldRow>
                <FieldRow label="Win after turns"><Input type="number" min={1} value={state.winTurnTarget} onChange={(e) => setState({ ...state, winTurnTarget: Math.max(1, Math.round(Number(e.target.value || 1))) })} /></FieldRow>
              </div>

              <div className="space-y-2 p-3 border rounded-lg">
                <div className="text-sm font-medium mb-2">Reputation Scores (0–100)</div>
                <FieldRow label="Dev"><Input type="number" value={state.metrics.development} onChange={(e) => setState({ ...state, metrics: { ...state.metrics, development: clamp01(Number(e.target.value || 0)) } })} /></FieldRow>
                <FieldRow label="Comm"><Input type="number" value={state.metrics.community} onChange={(e) => setState({ ...state, metrics: { ...state.metrics, community: clamp01(Number(e.target.value || 0)) } })} /></FieldRow>
                <FieldRow label="Hype"><Input type="number" value={state.metrics.hype} onChange={(e) => setState({ ...state, metrics: { ...state.metrics, hype: clamp01(Number(e.target.value || 0)) } })} /></FieldRow>

                <div className="mt-4">
                  <div className="text-sm font-medium mb-1">Market Price Roll Table (d6 → %)</div>
                  <div className="grid grid-cols-6 gap-2">
                    {state.priceRollTable.map((v, i) => (
                      <Input key={i} type="number" value={v} onChange={(e) => {
                        const val = Number(e.target.value || 0);
                        const next = [...state.priceRollTable] as number[];
                        next[i] = val;
                        setState({ ...state, priceRollTable: (next as unknown as typeof state.priceRollTable) });
                      }} placeholder={["1","2","3","4","5","6"][i]} />
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Default: [−15, −8, 0, +10, +18, +25]%</div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm font-medium mb-1">Volatility factor</div>
                    <Input type="number" step="0.1" value={state.volatilityFactor} onChange={(e) => setState({ ...state, volatilityFactor: Math.max(0.1, Number(e.target.value || 1)) })} />
                    <div className="text-xs text-muted-foreground mt-1">Scales proposal + market impacts.</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Market depth (USD)</div>
                    <Input type="number" value={state.marketDepthUSD} onChange={(e) => setState({ ...state, marketDepthUSD: Math.max(1, Number(e.target.value || 1)) })} />
                    <div className="text-xs text-muted-foreground mt-1">Larger = less slippage when trading.</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="space-y-4 pt-4">
          {state.history.length === 0 && state.tradeHistory.length === 0 ? (
            <div className="text-sm text-muted-foreground">No turns or trades yet.</div>
          ) : (
            <div className="space-y-4">
              {state.tradeHistory.length > 0 && (
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-base">Trades</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {state.tradeHistory.map((t, idx) => (
                      <div key={idx} className="p-3 rounded-lg border grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
                        <div><span className="text-muted-foreground">When</span><div>{new Date(t.ts).toLocaleString()}</div></div>
                        <div><span className="text-muted-foreground">Kind</span><div>{t.kind}</div></div>
                        <div><span className="text-muted-foreground">USD</span><div>{fmtUSD(t.usd)}</div></div>
                        <div><span className="text-muted-foreground">Tokens</span><div>{fmtNum(t.tokens)}</div></div>
                        <div><span className="text-muted-foreground">Price</span><div>${t.priceBefore.toFixed(4)} → ${t.priceAfter.toFixed(4)} ({fmtPct(t.impactPct)})</div></div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {state.history.map((h) => (
                <Card key={h.turn}>
                  <CardHeader className="py-3"><CardTitle className="text-base">Turn {h.turn}</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">Token price change applied: {fmtPct(h.deltas.tokenPricePctApplied)}</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {h.proposals.map((pp, i) => (
                        <div key={i} className="p-3 rounded-lg border space-y-1">
                          <div className="font-medium truncate">{pp.proposal.title || `Proposal #${i + 1}`}</div>
                          <div className="text-xs text-muted-foreground truncate">{pp.proposal.reason}</div>
                          <div className="flex items-center justify-between text-xs mt-1"><span>Accepted</span><b>{pp.proposal.accepted ? "Yes" : "No"}</b></div>
                          {pp.roll && (<div className="flex items-center justify-between text-xs"><span>Roll</span><b>{pp.roll} · {ROLL_LABEL[pp.roll]}</b></div>)}
                          {pp.appliedMultiplier && (<div className="flex items-center justify-between text-xs"><span>Multiplier</span><b>×{pp.appliedMultiplier.toFixed(2)}</b></div>)}
                          <div className="text-xs mt-1">
                            <div>Costs: {fmtUSD(pp.effectiveCostUSD ?? 0)} • {fmtNum(pp.effectiveCostTokens ?? 0)} tokens</div>
                          </div>
                          {pp.sideNote && <div className="text-xs text-muted-foreground">{pp.sideNote}</div>}
                        </div>
                      ))}
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between text-sm">
                        <div>Market roll</div><b>{h.marketRoll} · {ROLL_LABEL[h.marketRoll]}</b>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg border text-sm">
                        <div className="font-medium mb-1">Δ Metrics</div>
                        <div>Treasury: {fmtUSD(h.deltas.treasuryUSD || 0)}</div>
                        <div>Tokens: {fmtNum(h.deltas.tokens || 0)}</div>
                        <div>Dev: {fmtNum(h.deltas.development || 0)}</div>
                        <div>Comm: {fmtNum(h.deltas.community || 0)}</div>
                        <div>Hype: {fmtNum(h.deltas.hype || 0)}</div>
                        <div>Burn rate: {fmtUSD(h.deltas.burnRate || 0)}</div>
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
    </div>
  );
}

function Row({ name, value }: { name: string; value: React.ReactNode }) {
  return <div className="flex items-center justify-between text-sm"><span>{name}</span><b>{value}</b></div>;
}
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-3 items-center py-1">
      <div className="col-span-5 text-sm text-muted-foreground">{label}</div>
      <div className="col-span-7">{children}</div>
    </div>
  );
}


