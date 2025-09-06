import { scaleByRoll } from "@/lib/rollScaling";
import type { GameState, Metrics, Proposal, TurnResult } from "@/lib/types";
import { ROLL_MULTIPLIER } from "@/lib/util";

function clamp01(n: number) { return Math.max(0, Math.min(100, Math.round(n))); }

function computeCosts(p: Proposal, state: GameState): { usd: number; tokens: number } {
  const m = Math.max(1, state.costMultiplier || 1);
  const price = Math.max(0.000001, state.metrics.tokenPrice);
  const baseUSD = Math.max(0, Math.round((p.costUSD || 0) * m));

  const mode: "USD" | "TOKENS" =
    p.payOptions === "TOKENS" ? "TOKENS" :
    p.payOptions === "USD" ? "USD" :
    (p.payWith === "TOKENS" ? "TOKENS" : "USD");

  if (mode === "USD") return { usd: baseUSD, tokens: 0 };
  const tokenCount = Math.max(0, Math.round(baseUSD / price));
  return { usd: 0, tokens: tokenCount };
}

export function applyTurn(
  state: GameState,
  inputs: { proposals: Proposal[]; rolls: (number | undefined)[]; marketRoll: number }
): GameState {
  const { metrics, priceRollTable, volatilityFactor } = state;
  const next: Metrics = { ...metrics };

  const applied: TurnResult["proposals"] = [];
  let tokenPricePctFromProposals = 0;

  // Effects from accepted proposals
  inputs.proposals.forEach((p, idx) => {
    if (!p.accepted) { applied.push({ proposal: p }); return; }

    const roll = inputs.rolls[idx] ?? 3;
    const mult = ROLL_MULTIPLIER[roll];

    // costs
    const eff = computeCosts(p, state);
    next.treasuryUSD -= eff.usd;
    next.tokens -= eff.tokens;

    // reputations + price baseline
    next.development = clamp01(next.development + p.baseDev * mult);
    next.community = clamp01(next.community + p.baseCommunity * mult);
    next.hype = clamp01(next.hype + p.baseHype * mult);
    tokenPricePctFromProposals += p.baseTokenPricePct * mult;

    // burn rate change
    if (typeof p.baseBurnRateDelta === "number") {
      const delta = p.baseBurnRateDelta * mult;
      next.burnRate = Math.max(0, Math.round(next.burnRate + delta));
    }

    // flavor notes
    let sideNote = "";
    if (roll <= 2 && p.customBad) sideNote = p.customBad.trim();
    if (roll >= 4 && p.customGood) sideNote = p.customGood.trim();
    if (roll === 1) { const r = ["development", "community", "hype"][Math.floor(Math.random() * 3)] as keyof Metrics; next[r] = clamp01(next[r] - 2); sideNote = sideNote ? `${sideNote} · Extra setback.` : "Extra setback."; }
    if (roll === 6) { const r = ["development", "community", "hype"][Math.floor(Math.random() * 3)] as keyof Metrics; next[r] = clamp01(next[r] + 2); sideNote = sideNote ? `${sideNote} · Tailwind.` : "Tailwind."; }

    applied.push({ proposal: p, roll, appliedMultiplier: mult, sideNote, effectiveCostUSD: eff.usd, effectiveCostTokens: eff.tokens });
  });

  // price: proposals then market (scaled by volatility)
  const vol = Number.isFinite(volatilityFactor) ? Math.max(0.1, volatilityFactor) : 1.0;
  const proposalPct = tokenPricePctFromProposals * vol;
  let price = Math.max(0.000001, next.tokenPrice) * (1 + proposalPct / 100);
  const marketPct = (priceRollTable[Math.max(1, Math.min(6, inputs.marketRoll)) - 1] || 0) * vol;
  price = Math.max(0.000001, price * (1 + marketPct / 100));
  next.tokenPrice = price;

  // burn
  next.treasuryUSD -= next.burnRate;

  const runwayTurns = next.burnRate > 0 ? Math.max(0, Math.floor(next.treasuryUSD / next.burnRate)) : Infinity;

  const turnResult: TurnResult = {
    turn: state.currentTurn,
    proposals: applied,
    marketRoll: inputs.marketRoll,
    deltas: {
      tokenPricePctApplied: proposalPct + (marketPct ?? 0),
      treasuryUSD: next.treasuryUSD - metrics.treasuryUSD,
      tokens: next.tokens - metrics.tokens,
      development: next.development - metrics.development,
      community: next.community - metrics.community,
      hype: next.hype - metrics.hype,
      burnRate: next.burnRate - metrics.burnRate,
    },
    postBurnTreasury: next.treasuryUSD,
    runwayTurns,
  };

  // ----- Win/Loss checks -----
  const finishedTurn = state.currentTurn; // this is the turn we just applied
  let status: GameState["status"] = "RUNNING";
  let endReason: string | undefined = undefined;

  const treasuryBust = next.treasuryUSD <= 0;
  const repZero = next.development <= 0 || next.community <= 0 || next.hype <= 0;

  if (treasuryBust) { status = "LOST"; endReason = "Treasury depleted."; }
  else if (repZero) {
    const which = next.development <= 0 ? "Development" : next.community <= 0 ? "Community" : "Hype";
    status = "LOST"; endReason = `${which} reputation collapsed to 0.`;
  }
  else if (finishedTurn >= state.winTurnTarget) { status = "WON"; endReason = `You survived ${state.winTurnTarget} turns. 🎉`; }

  return {
    ...state,
    metrics: next,
    currentTurn: state.currentTurn + 1,
    history: [turnResult, ...state.history],
    status,
    endReason,
  };
}


