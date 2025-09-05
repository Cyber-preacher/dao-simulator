import type { GameState, PriceRollTable } from "@/lib/types";

export const ROLL_MULTIPLIER: Record<number, number> = {
  1: 0.25, 2: 0.5, 3: 1.0, 4: 1.5, 5: 2.0, 6: 2.5,
};

export const ROLL_LABEL: Record<number, string> = {
  1: "Disaster", 2: "Poor", 3: "Neutral", 4: "Good", 5: "Great", 6: "Exceptional",
};

export function fmtUSD(n: number) {
  const s = Math.sign(n) < 0 ? "-" : "";
  const v = Math.abs(n);
  return s + v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
export function fmtNum(n: number) {
  const s = Math.sign(n) < 0 ? "-" : "";
  const v = Math.abs(n);
  if (v >= 1_000_000_000) return s + (v / 1_000_000_000).toFixed(1) + "B";
  if (v >= 1_000_000) return s + (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return s + (v / 1_000).toFixed(1) + "k";
  return s + v.toString();
}
export function fmtPct(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(0)}%`;
}
export function clamp01(n: number) { return Math.max(0, Math.min(100, Math.round(n))); }
export function rollD6() { return Math.floor(Math.random() * 6) + 1; }

// Spicier market by default
const DEFAULT_PRICES: PriceRollTable = [-15, -8, 0, +10, +18, +25];

export const DEFAULT_STATE: GameState = {
  name: "Your DAO",
  currentTurn: 1,
  metrics: {
    treasuryUSD: 1_000_000,
    tokens: 6_000_000,
    tokenPrice: 0.5,
    burnRate: 50_000,
    development: 50,
    community: 50,
    hype: 40,
  },
  priceRollTable: DEFAULT_PRICES,
  volatilityFactor: 1.6,
  marketDepthUSD: 2_000_000,
  costMultiplier: 1,
  history: [],
  tradeHistory: [],
  // NEW
  status: "RUNNING",
  endReason: undefined,
  winTurnTarget: 20,
};

const KEY = "crypto-dao-state-v6";

export function saveState(s: GameState) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export function loadState(): GameState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    // try v6
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_STATE,
        ...parsed,
        metrics: { ...DEFAULT_STATE.metrics, ...(parsed.metrics || {}) },
        priceRollTable: parsed.priceRollTable || DEFAULT_PRICES,
        volatilityFactor: parsed.volatilityFactor ?? DEFAULT_STATE.volatilityFactor,
        marketDepthUSD: parsed.marketDepthUSD ?? DEFAULT_STATE.marketDepthUSD,
        tradeHistory: parsed.tradeHistory ?? [],
        status: parsed.status ?? "RUNNING",
        endReason: parsed.endReason,
        winTurnTarget: parsed.winTurnTarget ?? 20,
      };
    }
    // migrate older key if present
    for (const k of ["crypto-dao-state-v5", "crypto-dao-state-v4", "crypto-dao-state-v3"]) {
      const old = localStorage.getItem(k);
      if (old) {
        const parsed = JSON.parse(old);
        const migrated: GameState = {
          ...DEFAULT_STATE,
          ...parsed,
          metrics: { ...DEFAULT_STATE.metrics, ...(parsed.metrics || {}) },
          priceRollTable: parsed.priceRollTable || DEFAULT_PRICES,
          volatilityFactor: parsed.volatilityFactor ?? DEFAULT_STATE.volatilityFactor,
          marketDepthUSD: parsed.marketDepthUSD ?? DEFAULT_STATE.marketDepthUSD,
          tradeHistory: parsed.tradeHistory ?? [],
          status: parsed.status ?? "RUNNING",
          endReason: parsed.endReason,
          winTurnTarget: parsed.winTurnTarget ?? 20,
        };
        // write to new key
        saveState(migrated);
        return migrated;
      }
    }
    return DEFAULT_STATE;
  } catch { return DEFAULT_STATE; }
}
