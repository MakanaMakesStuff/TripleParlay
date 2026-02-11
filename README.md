# MLB Player Odds Scoring

This module calculates player probabilities, scores, and American betting odds for MLB hitters. It is designed for parlay generation and player evaluation.
[visit site](https://triple-parlay-7mo1ed9oy-makanaokeakua-edwards-projects.vercel.app/team/133)

---

## Table of Contents

- [HitterStats](#hitterstats)
- [ScoredHitter](#scoredhitter)
- [Scoring Logic](#scoring-logic)
- [Probability to Score](#probability-to-score)
- [Probability to Odds](#probability-to-odds)
- [Notes and Tweaks](#notes-and-tweaks)

---

## HitterStats

Represents the raw inputs for a player:

```ts
export type HitterStats = {
	paPerGame: number; // Plate appearances per game
	obp: number; // On-base percentage (0-1)
	iso: number; // Isolated power (SLG - AVG)
	recentForm: number; // Recent performance multiplier (0-1)
	oppKpct: number; // Opponent strikeout rate (0-1)
	parkFactor: number; // Park adjustment (1 = neutral)
};
```

- **paPerGame:** Higher PA increases chances of getting hits or bases.
- **obp:** Strongest factor for hit probability.
- **iso:** Strongest factor for base probability (extra-base hits).
- **recentForm:** Player streaks/slumps. Should be normalized 0–1.
- **oppKpct:** Opponent strikeout percentage. High K% reduces probabilities.
- **parkFactor:** Adjusts for hitter-friendly or pitcher-friendly ballparks.

---

## ScoredHitter

Represents the output:

```ts
export type ScoredHitter = {
	hitProbability: number; // Raw probability [0-1]
	baseProbability: number; // Raw probability [0-1]
	hitScore: number; // 1-5 scale
	baseScore: number; // 1-5 scale
	hitOdds: number; // American odds
	baseOdds: number; // American odds
};
```

---

## Scoring Logic

1. **Hit Probability:**

```
hitProbability =
  60% * OBP +
  10% * normalized PA +
  20% * recentForm +
  10% * (1 - opponentK%)
```

2. **Base Probability:**

```
baseProbability =
  50% * ISO +
  10% * OBP (to include singles) +
  20% * normalized PA +
  20% * recentForm +
  10% * (1 - opponentK%)
```

- All probabilities are multiplied by `parkFactor` and clamped to `[0,1]`.

---

## Probability to Score

Maps probability `[0-1]` to 1–5 scale:

- `<0.2 → 1`
- `<0.35 → 2`
- `<0.5 → 3`
- `<0.65 → 4`
- `>=0.65 → 5`

---

## Probability to Odds

Converts raw probability to **American betting odds**:

- If probability `p > 0.5` → favorite → negative odds
- If probability `p < 0.5` → underdog → positive odds
- Edge cases: `p=0` or `p=1` → ±1000

Formula:

```ts
p > 0.5 ? Math.round((-100 * p) / (1 - p)) : Math.round((100 * (1 - p)) / p);
```

---

## Notes and Tweaks

- **Normalization:** PA per game is normalized to 5 PAs (`Math.min(paPerGame / 5, 1)`), so extreme PAs don’t dominate probability.
- **Clamping:** All probabilities are clamped to `[0,1]` to prevent invalid odds or scores.
- **Base probability includes OBP:** Prevents undervaluing singles.
- **Adjustable weights:** The contribution of OBP, ISO, PA, recentForm, and oppKpct can be tweaked as needed.
- **Future enhancements:** Incorporate matchup splits, fatigue, pitcher quality, or park-specific splits.

---

## Usage Example

```ts
import { scoreHitterProp, HitterStats } from "./process";

const player: HitterStats = {
	paPerGame: 4,
	obp: 0.35,
	iso: 0.15,
	recentForm: 0.8,
	oppKpct: 0.2,
	parkFactor: 1,
};

const scored = scoreHitterProp(player);
console.log(scored);
```

This returns raw probabilities, 1-5 scores, and American-style odds for hits and bases.
