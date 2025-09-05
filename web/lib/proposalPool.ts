import type { Proposal, PayOption } from "@/lib/types";

/** Tiny seeded RNG so the 100 proposals are reproducible on reload */
class RNG {
  constructor(private seed: number) {}
  next() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 2 ** 32; }
  int(min: number, max: number) { return Math.floor(this.next() * (max - min + 1)) + min; }
  pick<T>(arr: T[]) { return arr[Math.floor(this.next() * arr.length)]; }
}

type Range = [number, number];
type Template = {
  key: string;
  titles: string[];
  reasons: string[];   // multi-sentence, realistic copy
  usd: Range;          // baseline USD value (we scale by costMultiplier at pay time)
  pay: PayOption;      // USD/TOKENS/EITHER
  dev: Range;
  community: Range;
  hype: Range;
  pricePct: Range;     // baseline % (scaled by roll, then by volatility)
  burn?: Range;        // USD/turn delta (±)
  good?: string[];
  bad?: string[];
};

const XS: Range = [5_000, 15_000];
const S : Range = [15_000, 40_000];
const M : Range = [40_000, 90_000];
const L : Range = [90_000, 180_000];

const TEMPLATES: Template[] = [
  {
    key: "grants",
    titles: ["Builder Grants v", "Open Grants Round v", "Core Maintainer Grants v"],
    reasons: [
      "Fund tiny squads to ship specific modules, SDKs, and quality-of-life improvements. Every grant has public milestones, review calls, and weekly check-ins so the work doesn’t drift.",
      "Target integrations, indexers, and tooling that unblock real apps. We prioritize boring-but-critical tasks—things users notice only when they’re missing.",
      "Sponsor maintainers of unglamorous dependencies the ecosystem relies on. We publish a roster and rotate responsibilities to avoid fatigue."
    ],
    usd: M, pay: "USD",
    dev: [2,4], community: [1,2], hype: [1,2], pricePct: [2,6],
    good: ["One tool becomes the default in community repos."],
    bad: ["Review bandwidth gets thin; next round is smaller."]
  },
  {
    key: "bounty",
    titles: ["Security Bounty Boost v","Vulnerability Rewards v","Bug Bash v"],
    reasons: [
      "Increase top-tier payouts and commit to same-day triage. Public leaderboard, clear scope, and fast merges for high-signal reports.",
      "Invite third-party auditors and prolific whitehats to stress the riskiest surfaces. We track time-to-fix, not just time-to-respond.",
      "Document common footguns and harden interfaces; we publish a monthly ‘lessons learned’ thread so the fixes stick."
    ],
    usd: S, pay: "USD",
    dev: [2,4], community: [1,2], hype: [0,1], pricePct: [1,3],
    good: ["A nasty edge case is found privately and fixed quietly."],
    bad: ["Few submissions this cycle; optics look slow."]
  },
  {
    key: "audit",
    titles: ["External Audit v","Security Review v","Formal Methods v"],
    reasons: [
      "Deep pass by a top firm before the next release. We add invariant tests and run a chaos suite so regressions are loud.",
      "Independent report for partner confidence. Issues block release; we budget time to actually refactor, not just rename things.",
      "Formal methods for the parts that can really hurt us; clear assumptions and threat models for the rest."
    ],
    usd: L, pay: "USD",
    dev: [2,4], community: [1,2], hype: [2,3], pricePct: [3,7],
    good: ["Green report becomes a calling card in BD calls."],
    bad: ["Refactors land late; we communicate early."]
  },
  {
    key: "marketing",
    titles: ["Narrative Campaign v","Creator Collab v","Performance Ops v"],
    reasons: [
      "A crisp, repeatable story across channels: who we help, why it matters, and why now. We ship short explainers that don’t require a decoder ring.",
      "Creators who already understand the space, with veto power on cringe. We measure lift in qualified activations, not vanity impressions.",
      "Week-by-week experiments; we double-down where onboarding completes and kill what doesn’t move the needle."
    ],
    usd: M, pay: "USD",
    dev: [0,1], community: [1,2], hype: [3,5], pricePct: [4,10], burn: [2000,6000],
    good: ["Clips travel outside crypto—search lifts and sticks."],
    bad: ["It reads as ads to the core crowd; limited spillover."]
  },
  {
    key: "listing",
    titles: ["Tier-1 Listing v","Listing + MM v","Liquidity Access v"],
    reasons: [
      "Centralized listing to deepen liquidity and price discovery. We coordinate comms, support, and incident runbooks ahead of time.",
      "Market-maker rails for smoother books and lower spreads. We publish a simple FAQ so newcomers don’t bounce.",
      "Legal + ops work starts early so the day itself is boring—in a good way."
    ],
    usd: L, pay: "USD",
    dev: [0,1], community: [1,2], hype: [4,6], pricePct: [6,12], burn: [1000,4000],
    good: ["Opening pop with healthy follow-through."],
    bad: ["Volume light; it fades within days."]
  },
  {
    key: "lm",
    titles: ["AMM Incentives v","LP Rewards v","DEX Liquidity Sprint v"],
    reasons: [
      "Time-boxed emissions on pairs that hurt most. We add sunset dates and checkpoints to avoid infinite drip.",
      "Guardrails against mercenary churn; the dashboard shows depth, not tweets.",
      "LPs get clarity on risk and rewards; users get ‘just works’ swaps."
    ],
    usd: M, pay: "TOKENS",
    dev: [0,1], community: [1,2], hype: [2,4], pricePct: [3,7],
    good: ["Depth improves; retail slippage stops scaring people."],
    bad: ["Farmers rotate out the minute rewards drop."]
  },
  {
    key: "staking",
    titles: ["Staking Launch v","Validator Program v","Lock & Earn v"],
    reasons: [
      "Ship staking with sane defaults and visible risks. We aim for predictability over headline APY.",
      "Validator kit with monitoring, alerts, and an escape hatch. We reward uptime, not hardware photos.",
      "Clear comms on lockups and penalties; we’d rather under-promise than backpedal."
    ],
    usd: M, pay: "USD",
    dev: [2,3], community: [2,3], hype: [2,3], pricePct: [3,8], burn: [1500,4000],
    good: ["Participation is healthy; support DMs cool off."],
    bad: ["Edge-case bugs trigger hand-holding for a week."]
  },
  {
    key: "ambassadors",
    titles: ["Regional Guilds v","Ambassador Cohort v","Community Advocates v"],
    reasons: [
      "Micro-grants for meetups, translations, and local FAQs. We showcase what works so others can copy it.",
      "Cohort training with a simple playbook and reporting. We reward outcomes, not airtime.",
      "We prune politely when things drift; the best work gets the mic."
    ],
    usd: S, pay: "EITHER",
    dev: [0,1], community: [3,5], hype: [1,3], pricePct: [2,5], burn: [500,2000],
    good: ["Grassroots channels look alive—and stay alive."],
    bad: ["Some busy-work sneaks in; then gets sunset."]
  },
  {
    key: "hackathon",
    titles: ["Global Hackweek v","Online Hackdays v","Partner Tracks v"],
    reasons: [
      "Mentors, bounties, and runnable starter kits. We define problems people actually want solved.",
      "We recruit judges who ship; feedback is blunt but kind. Winning teams get a lane into grants.",
      "We measure follow-on commits, not just registrations."
    ],
    usd: M, pay: "EITHER",
    dev: [2,4], community: [2,3], hype: [2,3], pricePct: [2,6], burn: [1500,3500],
    good: ["A demo becomes a weekly community call favorite."],
    bad: ["Lots of repos; commit lights go dark after day three."]
  },
  {
    key: "nft",
    titles: ["Artist Drop v","Creator Collab v","Culture Pack v"],
    reasons: [
      "Art that fits the brand. Utility is tasteful and optional; the story is the point.",
      "We invite communities adjacent to ours, not random hype collectors.",
      "We go light on supply and heavy on communication so it ages well."
    ],
    usd: S, pay: "EITHER",
    dev: [0,1], community: [1,2], hype: [2,4], pricePct: [2,6],
    good: ["Sold out without cringe; new faces show up politely."],
    bad: ["Some roll their eyes; we present receipts."]
  },
  {
    key: "bridge",
    titles: ["L2 Bridge v","Omnichain Messaging v","Cross-Chain Access v"],
    reasons: [
      "Make it trivial to arrive from where users already are. We keep limits tight and publish runbooks.",
      "We choose boring, battle-tested parts over shiny experiments. No heroics.",
      "Integration partners get a test week before we announce."
    ],
    usd: L, pay: "USD",
    dev: [3,5], community: [1,2], hype: [2,3], pricePct: [4,9], burn: [800,3000],
    good: ["Smooth bridge day; integrations line up fast."],
    bad: ["Bridge discourse flares up; cautious folks wait."]
  },
  {
    key: "docs",
    titles: ["Docs Revamp v","Developer Portal v","Tutorial Sprint v"],
    reasons: [
      "Rewrite the top 5 ‘stuck points’ with copy/paste snippets and screenshots. The best doc is the one you didn’t need.",
      "Search finally finds things; API examples ship with tests. People can copy, paste, and move on.",
      "We keep prose short and add a ‘do this, then this’ for each task."
    ],
    usd: S, pay: "USD",
    dev: [2,3], community: [2,3], hype: [0,1], pricePct: [0,2],
    good: ["PRs merge faster; fewer ‘what’s the flag’ questions."],
    bad: ["Naming bikesheds appear; we timebox and decide."]
  },
  {
    key: "rebrand",
    titles: ["Visual Refresh v","Website Overhaul v","Positioning Pass v"],
    reasons: [
      "A look and tone that match what the product actually is now. We remove mystery metaphors.",
      "Landing page optimized for conversion and clarity. The path from curiosity to action is short.",
      "We say who we’re for, and just as clearly who we aren’t."
    ],
    usd: M, pay: "USD",
    dev: [0,1], community: [0,2], hype: [2,4], pricePct: [2,6],
    good: ["People share the site without caveats again."],
    bad: ["Style nostalgia threads; they pass in a week."]
  },
  {
    key: "compliance",
    titles: ["Compliance Program v","KYC/AML Framework v","Jurisdiction Review v"],
    reasons: [
      "Reduce regulatory risk with counsel, controls, and logs. We pick practical steps over policy theater.",
      "Partner-readiness for exchanges and institutions. Docs are organized and searchable, not mythical.",
      "We publish the exact commitments so nobody has to guess."
    ],
    usd: M, pay: "USD",
    dev: [0,1], community: [-2,1], hype: [-1,1], pricePct: [2,6], burn: [1500,4000],
    good: ["Conservative partners return calls with calendars open."],
    bad: ["Privacy die-hards make noise; we engage kindly."]
  },
  {
    key: "treasury",
    titles: ["Treasury Transparency v","Public Dashboard v","Real-time Metrics v"],
    reasons: [
      "Runway, holdings, and flows—live. No more spreadsheet archaeology or guesswork on calls.",
      "Everyone sees the same numbers; forum threads get calmer and more useful.",
      "APIs for analysts; summaries for humans; alerts when anything drifts."
    ],
    usd: XS, pay: "USD",
    dev: [1,2], community: [2,4], hype: [1,2], pricePct: [0,2], burn: [-800,-2500],
    good: ["Trust rises; bad takes get corrected faster."],
    bad: ["A data glitch day; rollback is quick and loud."]
  },
  {
    key: "buyback",
    titles: ["Token Buyback v","Open Market Accumulation v","Liquidity Sinks v"],
    reasons: [
      "Use a slice of treasury to reduce float with rules, not vibes. We publish the policy and stick to it.",
      "Buys concentrate during drawdowns to steady hands. We coordinate comms so nobody is surprised.",
      "We measure results in realized volatility, not likes."
    ],
    usd: M, pay: "USD",
    dev: [0,1], community: [1,2], hype: [2,4], pricePct: [5,12],
    good: ["Timing looks smart; the narrative tightens."],
    bad: ["Critics yell ‘short-term’; receipts help."]
  },
  {
    key: "fee-up",
    titles: ["Adjust Fee Parameters v","Premium Path Fees v","Protocol Fee Ramps v"],
    reasons: [
      "Raise fees where value is obvious; explain the why and show the math.",
      "Use extra revenue to extend runway, not to paper over problems.",
      "If metrics don’t justify it, we roll back without drama."
    ],
    usd: XS, pay: "USD",
    dev: [0,1], community: [-4,-2], hype: [-2,-1], pricePct: [2,5], burn: [-2500,-7000],
    good: ["Revenue cushions burn; budget threads get calmer."],
    bad: ["Some churn; support runs hot for a cycle."]
  },
  {
    key: "fee-down",
    titles: ["Promotional Fees v","Lower Swap Fee v","Friction Trim v"],
    reasons: [
      "Lower fees where elasticity is high—time-boxed so we learn something.",
      "New users get a friendlier first ride; we track who sticks around.",
      "We turn it off if it doesn’t pay for itself."
    ],
    usd: XS, pay: "USD",
    dev: [0,1], community: [2,4], hype: [2,3], pricePct: [0,3], burn: [1000,3000],
    good: ["Activity spikes; a chunk stays."],
    bad: ["Revenue dip draws budget scrutiny."]
  },
  {
    key: "partnership",
    titles: ["Ecosystem Partnership v","Brand Collab v","Enterprise Pilot v"],
    reasons: [
      "Pick one segment and unlock it together. We ship an integration users can actually try.",
      "Co-marketing with real user stories, not just logos on a slide.",
      "Pilot a concrete workflow; we publish what worked and what didn’t."
    ],
    usd: M, pay: "EITHER",
    dev: [1,2], community: [2,4], hype: [2,4], pricePct: [3,8],
    good: ["Joint announcement with a demo travels well."],
    bad: ["Integration slips; momentum cools."]
  },
  {
    key: "wallet",
    titles: ["Mobile SDK v","Wallet Integration v","One-Tap Onboarding v"],
    reasons: [
      "Reduce signup friction with passkeys and wallet partners. The happy path fits in a short video.",
      "Embedded flows for non-custodial without the pain. We remove scary words where we can.",
      "Activation journeys are timed and measured; we trim steps ruthlessly."
    ],
    usd: M, pay: "USD",
    dev: [2,3], community: [2,3], hype: [2,3], pricePct: [2,6], burn: [1500,3500],
    good: ["Drop-off shrinks; people complete the first run."],
    bad: ["SDK papercuts cost a sprint to sand down."]
  },
  {
    key: "edu",
    titles: ["Starter Quests v","Academy Launch v","Learn-to-Earn v"],
    reasons: [
      "On-chain quests that teach the right muscle memory. We reward comprehension, not form-filling.",
      "A curriculum that answers the questions users actually ask; support links everywhere.",
      "Rewards sized for learning, not for farming; filters evolve with behavior."
    ],
    usd: S, pay: "EITHER",
    dev: [1,2], community: [3,5], hype: [2,3], pricePct: [1,4], burn: [800,2500],
    good: ["Completion rates rise; support tickets fall."],
    bad: ["Farmers sniff it out; gates get tweaked."]
  },
  {
    key: "cost-ops",
    titles: ["Cloud Bill Renegotiation v","Infra Cost Sprint v","Vendor RFP v"],
    reasons: [
      "Audit the top 3 infra line items; renegotiate or replace. We keep a ‘savings’ changelog.",
      "Right-size instances, cache more, and ship fewer bytes. Boring wins.",
      "Competitive RFP with apples-to-apples metrics and a deadline."
    ],
    usd: S, pay: "USD",
    dev: [1,2], community: [0,1], hype: [0,1], pricePct: [0,1], burn: [-4000,-12000],
    good: ["Savings stick; nobody misses the old setup."],
    bad: ["A noisy migration steals a week."]
  },
  {
    key: "support",
    titles: ["Support Desk v","Moderator Cohort v","Community Success v"],
    reasons: [
      "Staff a small desk with SLAs and a public queue. We de-escalate, then document.",
      "First replies under an hour during peaks. Moderators redirect to docs without snark.",
      "We celebrate helpful threads and close the rest politely."
    ],
    usd: M, pay: "USD",
    dev: [0,1], community: [3,5], hype: [1,2], pricePct: [0,2], burn: [4000,11000],
    good: ["Threads turn into tutorials; rage-quits drop."],
    bad: ["Volume spikes reveal playbook gaps."]
  },
];

function r(rng: RNG, [a,b]: Range) { return rng.int(Math.min(a,b), Math.max(a,b)); }
function title(rng: RNG, t: Template) { const b = rng.pick(t.titles); return b.endsWith("v") ? b + String(rng.int(1,3)) : b; }

export function generateProposalPool(count = 100, seed = 1337): Proposal[] {
  const rng = new RNG(seed);
  const out: Proposal[] = [];
  for (let i = 0; i < count; i++) {
    const t = TEMPLATES[rng.int(0, TEMPLATES.length - 1)];
    out.push({
      id: `pool-${i}-${Math.floor(rng.next() * 1e9).toString(36)}`,
      title: title(rng, t),
      reason: rng.pick(t.reasons),
      costUSD: Math.max(5_000, r(rng, t.usd)),
      costTokens: 0,
      payOptions: t.pay,
      payWith: t.pay === "EITHER" ? "USD" : (t.pay as "USD" | "TOKENS"),
      baseDev: r(rng, t.dev),
      baseCommunity: r(rng, t.community),
      baseHype: r(rng, t.hype),
      baseTokenPricePct: r(rng, t.pricePct),
      baseBurnRateDelta: t.burn ? r(rng, t.burn) : 0,
      accepted: false,
      customGood: t.good ? rng.pick(t.good) : "",
      customBad: t.bad ? rng.pick(t.bad) : "",
    });
  }
  return out;
}

// Deck helpers
function shuffleIndices(size: number, rng: RNG): number[] {
  const arr = Array.from({ length: size }, (_, i) => i);
  for (let i = size - 1; i > 0; i--) { const j = rng.int(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
export function makeDeck(size: number, seed = 1337): number[] { const rng = new RNG(seed >>> 0); return shuffleIndices(size, rng); }
export function drawFromDeck<T>(pool: T[], deck: number[], cursor: number, count: number, reseed?: number) {
  if (!Array.isArray(deck) || deck.length === 0) return { items: [], nextCursor: 0, deck: [] };
  const remaining = deck.length - cursor;
  if (count <= remaining) {
    const indices = deck.slice(cursor, cursor + count);
    const items = indices.map((i) => pool[i]);
    return { items, nextCursor: cursor + count, deck };
  }
  const first = deck.slice(cursor).map((i) => pool[i]);
  const need = count - first.length;
  const fresh = makeDeck(pool.length, (reseed ?? Date.now()) >>> 0);
  const second = fresh.slice(0, need).map((i) => pool[i]);
  return { items: [...first, ...second], nextCursor: need, deck: fresh };
}
