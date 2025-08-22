import type { GameState, PriceRollTable, Proposal } from "@/lib/types";

export const clamp01 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
export const fmtUSD = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const fmtNum = (n: number, digits = 0) => n.toLocaleString(undefined, { maximumFractionDigits: digits });
export const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
export const rollD6 = () => 1 + Math.floor(Math.random() * 6);

export const ROLL_MULTIPLIER: Record<number, number> = {
  1: 0.25,
  2: 0.5,
  3: 1.0,
  4: 1.5,
  5: 2.0,
  6: 2.5,
};

export const ROLL_LABEL: Record<number, string> = {
  1: "Disaster",
  2: "Poor",
  3: "Neutral",
  4: "Good",
  5: "Great",
  6: "Exceptional",
};

export const DEFAULT_STATE: GameState = {
  name: "Your DAO",
  metrics: {
    treasuryUSD: 1_000_000,
    tokens: 6_000_000,
    tokenPrice: 0.5,
    burnRate: 50_000,
    development: 50,
    community: 50,
    hype: 40,
  },
  history: [],
  currentTurn: 1,
  priceRollTable: [-10, -5, 0, 5, 10, 15] as PriceRollTable,
  costMultiplier: 8, // make choices meaningful out of the box
};

const STORAGE_KEY = "crypto-dao-sim-state-v1";
export function loadState(): GameState {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as GameState;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      metrics: { ...DEFAULT_STATE.metrics, ...(parsed as any).metrics },
      priceRollTable: (parsed as any).priceRollTable || DEFAULT_STATE.priceRollTable,
      costMultiplier: (parsed as any).costMultiplier ?? DEFAULT_STATE.costMultiplier,
    };
  } catch {
    return DEFAULT_STATE;
  }
}
export function saveState(state: GameState) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

/** Compute effective costs after applying the current state's multiplier. */
export function effectiveCosts(p: Proposal, state: GameState) {
  const m = state.costMultiplier ?? 1;
  return {
    usd: Math.max(0, Math.round((p.costUSD || 0) * m)),
    tokens: Math.max(0, Math.round((p.costTokens || 0) * m)),
  };
}