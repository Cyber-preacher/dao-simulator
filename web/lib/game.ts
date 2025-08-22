import type { GameState, Metrics, Proposal, TurnResult } from "@/lib/types";
import { ROLL_MULTIPLIER, effectiveCosts } from "@/lib/util";

export function applyTurn(
  state: GameState,
  inputs: {
    proposals: Proposal[];
    rolls: (number | undefined)[];
    marketRoll: number;
  }
): GameState {
  const { metrics, priceRollTable } = state;
  const next: Metrics = { ...metrics };

  const applied: TurnResult["proposals"] = [];
  let tokenPricePctFromProposals = 0;

  inputs.proposals.forEach((p, idx) => {
    if (!p.accepted) {
      applied.push({ proposal: p });
      return;
    }
    const roll = inputs.rolls[idx] ?? 3; // default to Neutral if not provided
    const mult = ROLL_MULTIPLIER[roll];

    const eff = effectiveCosts(p, state);
    next.treasuryUSD -= eff.usd;
    next.tokens -= eff.tokens;

    next.development = clamp01(next.development + p.baseDev * mult);
    next.community = clamp01(next.community + p.baseCommunity * mult);
    next.hype = clamp01(next.hype + p.baseHype * mult);
    tokenPricePctFromProposals += p.baseTokenPricePct * mult;

    let sideNote = "";
    if (roll === 1) {
      const r = ["development", "community", "hype"][Math.floor(Math.random() * 3)] as keyof Metrics;
      (next as any)[r] = clamp01((next as any)[r] - 2);
      sideNote = p.customBad?.trim() || `Extra setback: -2 ${r}.`;
    }
    if (roll === 6) {
      const r = ["development", "community", "hype"][Math.floor(Math.random() * 3)] as keyof Metrics;
      (next as any)[r] = clamp01((next as any)[r] + 2);
      sideNote = p.customGood?.trim() || `Unexpected tailwind: +2 ${r}.`;
    }

    applied.push({ proposal: p, roll, appliedMultiplier: mult, sideNote, effectiveCostUSD: eff.usd, effectiveCostTokens: eff.tokens });
  });

  const proposalPct = tokenPricePctFromProposals;
  next.tokenPrice = Math.max(0.0001, next.tokenPrice * (1 + proposalPct / 100));

  const marketPct = priceRollTable[Math.max(1, Math.min(6, inputs.marketRoll)) - 1] || 0;
  next.tokenPrice = Math.max(0.0001, next.tokenPrice * (1 + marketPct / 100));

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
    },
    postBurnTreasury: next.treasuryUSD,
    runwayTurns,
  };

  return {
    ...state,
    metrics: next,
    currentTurn: state.currentTurn + 1,
    history: [turnResult, ...state.history],
  };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}