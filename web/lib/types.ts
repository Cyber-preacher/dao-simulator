export type Metrics = {
  treasuryUSD: number;
  tokens: number;
  tokenPrice: number; // USD per token
  burnRate: number;   // USD per turn
  development: number; // 0..100
  community: number;   // 0..100
  hype: number;        // 0..100
};

export type Proposal = {
  id: string;
  title: string;
  reason: string;
  costUSD: number;
  costTokens: number;
  baseDev: number;
  baseCommunity: number;
  baseHype: number;
  baseTokenPricePct: number; // baseline % change to price
  accepted: boolean;
  customGood?: string;
  customBad?: string;
};

export type PriceRollTable = [number, number, number, number, number, number];

export type TurnResult = {
  turn: number;
  proposals: Array<{
    proposal: Proposal;
    roll?: number; // d6 if accepted
    appliedMultiplier?: number;
    sideNote?: string;
    effectiveCostUSD?: number;
    effectiveCostTokens?: number;
  }>;
  marketRoll: number; // d6
  deltas: Partial<Metrics> & { tokenPricePctApplied: number };
  postBurnTreasury: number;
  runwayTurns: number;
};

export type GameState = {
  metrics: Metrics;
  history: TurnResult[];
  currentTurn: number;
  priceRollTable: PriceRollTable;
  name: string;
  costMultiplier: number; // scales all proposal costs to matter vs treasury
};