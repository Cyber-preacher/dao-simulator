export function scaleByRoll(delta: number, roll: number, key?: string) {
  if (!Number.isFinite(delta) || !roll) return delta;
  const isRep = key ? ["development", "community", "hype"].includes(key) : false;

  // Bad rolls bite harder on negatives for reputation keys
  const mult = {
    1: { pos: 0.25, neg: isRep ? 2.0 : 1.6 },
    2: { pos: 0.60, neg: isRep ? 1.50 : 1.25 },
    3: { pos: 1.00, neg: 1.00 },
    4: { pos: 1.50, neg: 0.85 },
    5: { pos: 2.00, neg: 0.70 },
    6: { pos: 2.50, neg: 0.60 },
  } as const;

  const m = delta >= 0 ? mult[roll as 1|2|3|4|5|6].pos
                       : mult[roll as 1|2|3|4|5|6].neg;

  let out = delta * m;
  if (isRep && roll === 1 && delta < 0) out -= 2; // extra sting on 1s
  return out;
}
