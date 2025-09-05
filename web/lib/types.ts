export type Metrics = {
  treasuryUSD: number;
  tokens: number;
  tokenPrice: number; // USD per token
  burnRate: number;   // USD per turn
  development: number; // 0..100
  community: number;   // 0..100
  hype: number;        // 0..100
};

export type PayOption = "USD" | "TOKENS" | "EITHER";
export type GameStatus = "RUNNING" | "WON" | "LOST";

export type Proposal = {
  id: string;
  title: string;
  reason: string;

  /** Baseline economic value in USD (tokens are derived from tokenPrice at pay time). */
  costUSD: number;

  /** Legacy field (not used for math, kept to render older history safely). */
  costTokens?: number;

  /** How this proposal can be paid */
  payOptions: PayOption;

  /** User selection when payOptions==="EITHER" (defaults to "USD") */
  payWith?: "USD" | "TOKENS";

  // Baseline effects (scaled by roll multiplier)
  baseDev: number;
  baseCommunity: number;
  baseHype: number;
  baseTokenPricePct: number;   // % change to price (scaled by roll)
  baseBurnRateDelta?: number;  // USD/turn change (scaled by roll)

  accepted: boolean;
  customGood?: string;
  customBad?: string;
};

export type PriceRollTable = [number, number, number, number, number, number];

export type TurnResult = {
  turn: number;
  proposals: Array<{
    proposal: Proposal;
    roll?: number;
    appliedMultiplier?: number;
    sideNote?: string;
    effectiveCostUSD?: number;
    effectiveCostTokens?: number;
  }>;
  marketRoll: number; // d6
  deltas: Partial<Metrics> & {
    tokenPricePctApplied: number;
  };
  postBurnTreasury: number;
  runwayTurns: number;
};

export type TradeEntry = {
  ts: number;
  kind: "BUY" | "SELL";
  usd: number;
  tokens: number;
  priceBefore: number;
  priceAfter: number;
  impactPct: number;
};

export type GameState = {
  metrics: Metrics;
  history: TurnResult[];
  tradeHistory: TradeEntry[];
  currentTurn: number;
  priceRollTable: PriceRollTable;
  volatilityFactor: number;
  marketDepthUSD: number;
  name: string;
  costMultiplier: number;

  // NEW: win/loss
  status: GameStatus;
  endReason?: string;
  winTurnTarget: number; // e.g., 20
};
