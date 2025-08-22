import type { Proposal } from "@/lib/types";

/** Tiny seeded RNG so the 100 proposals are reproducible on reload */
class RNG {
  constructor(private seed: number) {}
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0; // LCG
    return this.seed / 2 ** 32;
  }
  int(min: number, max: number) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: T[]) {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

type Range = [number, number];
type Template = {
  key: string;
  titles: string[];
  reasons: string[];
  costUSD: Range;
  costTokens: Range;
  dev: Range;
  community: Range;
  hype: Range;
  pricePct: Range;
  good?: string[];
  bad?: string[];
};

const TEMPLATES: Template[] = [
  { key: "dev-grants",
    titles: ["Developer Grants v", "Open Grants Round v", "Core Dev Grants v"],
    reasons: ["Fund builders to expand protocol features and tooling.","Accelerate ecosystem apps and integrations.","Unblock roadmap items with external contributions."],
    costUSD: [30000,120000], costTokens: [0,0], dev:[5,10], community:[1,3], hype:[1,3], pricePct:[1,4],
    good:["Standout app emerges; extra +2 Hype."], bad:["Grants fragmented; coordination tax −2 Community."] },
  { key: "bug-bounty",
    titles: ["Bug Bounty Boost v","Security Bounty v","Vulnerability Rewards v"],
    reasons: ["Increase rewards to attract whitehats.","Harden core contracts through adversarial testing.","Signal security-first culture."],
    costUSD:[20000,80000], costTokens:[0,0], dev:[4,8], community:[2,4], hype:[0,2], pricePct:[0,2],
    good:["Major vuln responsibly disclosed; +2 Dev."], bad:["No submissions; optics −1 Hype."] },
  { key: "audit",
    titles:["Full External Audit v","Security Review v","Formal Verification v"],
    reasons:["Hire top firm to audit core contracts.","Independent assessment to reduce systemic risk.","Formal methods to prove invariants."],
    costUSD:[60000,180000], costTokens:[0,0], dev:[5,9], community:[1,2], hype:[2,4], pricePct:[2,5],
    good:["Clean report; +2 Hype."], bad:["Delays found; −2 Dev to refactor."] },
  { key: "marketing",
    titles:["Brand Campaign v","Growth Campaign v","Performance Marketing v"],
    reasons:["Top-of-funnel awareness to widen community.","Acquire new users with clear activation.","Multi-channel push across socials and creator collabs."],
    costUSD:[30000,150000], costTokens:[0,0], dev:[0,1], community:[2,5], hype:[4,9], pricePct:[2,6],
    good:["Campaign goes viral; +2 Hype."], bad:["Audience mismatch; −2 Community."] },
  { key: "exchange",
    titles:["Tier-1 CEX Listing Fee v","Market Maker + Listing v","Liquidity & Listing v"],
    reasons:["Secure centralized exchange listing to deepen liquidity.","Improve accessibility for retail users.","Reduce slippage and boost visibility."],
    costUSD:[100000,300000], costTokens:[0,0], dev:[0,1], community:[1,3], hype:[5,10], pricePct:[4,10],
    good:["Strong listing day; +2 Hype."], bad:["Volume underwhelms; −2 Hype."] },
  { key: "liquidity-mining",
    titles:["DEX Liquidity Mining v","AMM Incentives v","LP Rewards v"],
    reasons:["Bootstrap liquidity with token incentives.","Lower spreads; attract LPs.","Incentivize two-sided liquidity across pools."],
    costUSD:[0,0], costTokens:[80000,300000], dev:[0,1], community:[2,4], hype:[3,6], pricePct:[2,6],
    good:["TVL spikes; +2 Hype."], bad:["Farming dump pressure; −2 Price% vibe."] },
  { key: "staking",
    titles:["Staking Launch v","Lock & Earn v","Validator Program v"],
    reasons:["Introduce staking to align long-term holders.","Reduce float; provide yield.","Security through stake participation."],
    costUSD:[30000,90000], costTokens:[0,0], dev:[3,7], community:[2,4], hype:[3,6], pricePct:[3,7],
    good:["APY well-received; +2 Community."], bad:["UX rough edges; −2 Community."] },
  { key: "ambassadors",
    titles:["Ambassador Program v","Community Advocates v","Regional Guilds v"],
    reasons:["Activate champions in key regions.","Grassroots events & translations.","Train advocates to onboard newcomers."],
    costUSD:[20000,70000], costTokens:[20000,80000], dev:[0,1], community:[4,8], hype:[2,5], pricePct:[1,4],
    good:["Organic meetups thrive; +2 Community."], bad:["Low accountability; −2 Community."] },
  { key: "hackathon",
    titles:["Global Hackathon v","BUIDL Week v","Online Hackdays v"],
    reasons:["Attract developers with bounties and mentors.","Catalyze new dApps and tooling.","Showcase ecosystem velocity."],
    costUSD:[40000,120000], costTokens:[20000,80000], dev:[4,9], community:[2,5], hype:[2,5], pricePct:[1,4],
    good:["Killer project ships; +2 Dev."], bad:["Few submissions; −2 Hype."] },
  { key: "nft",
    titles:["NFT Collaboration v","Collector Drop v","Creator x Protocol v"],
    reasons:["Partner with artists for limited collection.","Drive culture + utility tie-ins.","Broaden audience beyond crypto-native."],
    costUSD:[15000,60000], costTokens:[20000,100000], dev:[0,1], community:[2,4], hype:[3,7], pricePct:[1,4],
    good:["Sold out mint; +2 Hype."], bad:["Perceived cash-grab; −2 Community."] },
  { key: "bridge",
    titles:["Cross-Chain Bridge v","Omnichain Messaging v","L2 Bridge v"],
    reasons:["Open access from other chains.","Capture liquidity via seamless transfers.","Interoperability to grow addressable market."],
    costUSD:[60000,150000], costTokens:[0,0], dev:[5,9], community:[1,3], hype:[3,6], pricePct:[2,6],
    good:["Smooth launch; +2 Hype."], bad:["Bridge incident scares users; −2 Community."] },
  { key: "docs",
    titles:["Docs Revamp v","Developer Portal v","Tutorial Sprint v"],
    reasons:["Rewrite and restructure docs.","Add quickstarts and sample repos.","Reduce onboarding friction."],
    costUSD:[10000,30000], costTokens:[0,0], dev:[3,6], community:[2,4], hype:[0,2], pricePct:[0,1],
    good:["Community PRs surge; +2 Dev."], bad:["Docs bikeshedding; −2 Community."] },
  { key: "rebrand",
    titles:["Light Rebrand v","Visual Refresh v","Website Overhaul v"],
    reasons:["Update brand to match positioning.","Clarify messaging for non-technical users.","Improve conversion on landing."],
    costUSD:[25000,90000], costTokens:[0,0], dev:[0,1], community:[-1,2], hype:[2,6], pricePct:[1,4],
    good:["Great reception; +2 Hype."], bad:["Community split on aesthetics; −2 Community."] },
  { key: "compliance",
    titles:["Compliance Program v","KYC/AML Framework v","Jurisdictional Review v"],
    reasons:["Reduce regulatory risk with counsel.","Implement compliance controls for partners.","Future-proof listings."],
    costUSD:[30000,110000], costTokens:[0,0], dev:[0,1], community:[-3,1], hype:[-1,2], pricePct:[1,4],
    good:["Institutional doors open; +2 Price% vibe."], bad:["Backlash on KYC; −2 Community."] },
  { key: "treasury-dashboard",
    titles:["Treasury Transparency v","Public Dashboard v","Real-time Metrics v"],
    reasons:["Increase trust via open treasury analytics.","Show runway, holdings, and reports.","Improve DAO decision quality."],
    costUSD:[10000,35000], costTokens:[0,0], dev:[1,3], community:[3,6], hype:[1,3], pricePct:[0,2],
    good:["Community praises clarity; +2 Community."], bad:["Data glitches; −2 Hype."] },
  { key: "buyback",
    titles:["Token Buyback v","Open Market Buy v","Liquidity Sinks v"],
    reasons:["Signal confidence; reduce float.","Stabilize price during volatility.","Deploy treasury tactically."],
    costUSD:[40000,150000], costTokens:[0,0], dev:[0,1], community:[1,3], hype:[3,6], pricePct:[3,8],
    good:["Timing excellent; +2 Price% vibe."], bad:["Perceived as short-term; −2 Community."] },
  { key: "fee-increase",
    titles:["Protocol Fee Increase v","Adjust Fee Parameters v","Raise Swap Fee v"],
    reasons:["Extend runway with higher fees.","Fund dev without emissions.","Align supply-side incentives."],
    costUSD:[0,0], costTokens:[0,0], dev:[0,1], community:[-6,-2], hype:[-4,-1], pricePct:[1,3],
    good:["Revenue jump; +2 Price% vibe."], bad:["User churn; −2 Community."] },
  { key: "fee-reduction",
    titles:["Protocol Fee Reduction v","Lower Swap Fee v","Promotional Fees v"],
    reasons:["Grow volume with cheaper fees.","User-friendly move to win mindshare.","Short-term promo to catalyze activity."],
    costUSD:[0,0], costTokens:[0,0], dev:[0,1], community:[2,5], hype:[2,5], pricePct:[-2,2],
    good:["Volume booms; +2 Hype."], bad:["Revenue dip; −2 Price% vibe."] },
  { key: "partnership",
    titles:["Ecosystem Partnership v","Brand Collaboration v","Enterprise Pilot v"],
    reasons:["Co-market with aligned protocol.","Unlock new user segments.","Proof-of-concept with enterprise."],
    costUSD:[15000,70000], costTokens:[0,60000], dev:[1,3], community:[2,5], hype:[3,7], pricePct:[2,6],
    good:["Joint announcement pops; +2 Hype."], bad:["Integration slips; −2 Dev."] },
  { key: "mobile-wallet",
    titles:["Wallet Integration v","Mobile SDK v","One-Click Onboarding v"],
    reasons:["Reduce sign-up friction via wallet partners.","Embedded flows for non-custodial users.","Boost activation and retention."],
    costUSD:[20000,90000], costTokens:[0,0], dev:[3,6], community:[2,4], hype:[2,5], pricePct:[1,4],
    good:["Seamless UX praise; +2 Community."], bad:["SDK bugs; −2 Hype."] },
  { key: "education",
    titles:["Learn-to-Earn v","Academy Launch v","Starter Quests v"],
    reasons:["Educate users with on-chain quests.","Reward learning; reduce support load.","Create reliable onboarding path."],
    costUSD:[15000,60000], costTokens:[20000,80000], dev:[1,2], community:[3,7], hype:[2,5], pricePct:[1,3],
    good:["High completion; +2 Community."], bad:["Farming/paper users; −2 Hype."] },
];

/** Helper: random int in range */
function r(rng: RNG, [a, b]: Range) {
  return rng.int(Math.min(a, b), Math.max(a, b));
}

function makeTitle(rng: RNG, t: Template) {
  const base = rng.pick(t.titles);
  if (base.endsWith("v")) return base + String(rng.int(1, 3));
  return base;
}

export function generateProposalPool(count = 100, seed = 1337): Proposal[] {
  const rng = new RNG(seed);
  const out: Proposal[] = [];
  for (let i = 0; i < count; i++) {
    const t = TEMPLATES[rng.int(0, TEMPLATES.length - 1)];
    const title = makeTitle(rng, t);
    const reason = rng.pick(t.reasons);
    const p: Proposal = {
      id: `pool-${i}-${Math.floor(rng.next() * 1e9).toString(36)}`,
      title,
      reason,
      costUSD: r(rng, t.costUSD),
      costTokens: r(rng, t.costTokens),
      baseDev: r(rng, t.dev),
      baseCommunity: r(rng, t.community),
      baseHype: r(rng, t.hype),
      baseTokenPricePct: r(rng, t.pricePct),
      accepted: false,
      customGood: t.good ? rng.pick(t.good) : "",
      customBad: t.bad ? rng.pick(t.bad) : "",
    };
    out.push(p);
  }
  return out;
}

/** Draw `count` proposals starting at `cursor` (wraps). Returns items + next cursor. */
export function drawFromPool<T>(pool: T[], cursor: number, count: number): { items: T[]; nextCursor: number } {
  const items: T[] = [];
  let c = cursor;
  for (let i = 0; i < count; i++) {
    items.push(pool[c % pool.length]);
    c++;
  }
  return { items, nextCursor: c % pool.length };
}