// utils/probability.ts

export type HitterStats = {
	paPerGame: number;
	obp: number;
	iso: number;
	recentForm: number;
	oppKpct: number; // baseline or real data
	parkFactor?: number;
};

export type PlayerGameStats = {
	date: string;
	hits: number;
	bases: number;
	pa: number;
	hr: number;
	k: number;
	bb: number;
};

export type PlayerResult = {
	id: number;
	name: string;
	// ... previous fields ...
	rawHitProbability: number;
	rawBaseProbability: number;
	rawHrProbability: number;
	rawKProbability: number;
	rawBbProbability: number;
	hitScore: number;
	baseScore: number;
	hitOdds: number;
	baseOdds: number;
	trajectory: "up" | "down" | "stable";
	recentGames: PlayerGameStats[];
	last30Games: PlayerGameStats[];
	last50Games: PlayerGameStats[];
	hitDue: boolean;
	baseDue: boolean;
};

// MODIFICATION: Accept optional real Opponent K% data
export async function getPlayerProbability(
	playerId: number,
	realOpponentKPct?: number, // Pass real Pitcher data if available
): Promise<{
	playerResult: PlayerResult | null;
	playerName: string;
	error: string | null;
}> {
	const playerResult: PlayerResult | null = null;
	let playerName = "";
	let error: string | null = null;

	try {
		// --- Fetch player bio ---
		const playerRes = await fetch(
			`https://statsapi.mlb.com/api/v1/people/${playerId}`,
		);
		const playerJson = await playerRes.json();
		const player = playerJson.people?.[0];
		playerName = player?.fullName ?? "Player";

		// Stop here if the position isn't a hitter (basic validation)
		const isPitcher = player?.primaryPosition?.code === "1";
		if (isPitcher) {
			error = "Player is a pitcher; no hitting props calculated.";
			return { playerResult, playerName, error };
		}

		const currentYear = new Date().getFullYear();

		// --- Fetch last 50 game logs for hitting ---
		const gameRes = await fetch(
			`https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=gameLog&group=hitting&gameType=R&season=${currentYear}`,
		);
		const gameJson = await gameRes.json();
		const gameLogs = gameJson.stats?.[0]?.splits ?? [];

		if (!gameLogs.length) {
			error = "No hitting game logs found";
			return { playerResult, playerName, error };
		}

		// --- Standard MLB API parsing from previous prompt ---
		const analyzedGames: PlayerGameStats[] = gameLogs
			.slice(-50)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.map((g: any) => ({
				date: g.date,
				hits: g.stat.hits ?? 0,
				bases: g.stat.totalBases ?? 0,
				pa: g.stat.plateAppearances ?? 0,
				hr: g.stat.homeRuns ?? 0,
				k: g.stat.strikeOuts ?? 0,
				bb: g.stat.baseOnBalls ?? 0,
			}))
			.filter((g: PlayerGameStats) => g.pa > 0);

		// --- Season totals and rates ---
		const totalPa = analyzedGames.reduce((sum, g) => sum + g.pa, 0);
		const totalHits = analyzedGames.reduce((sum, g) => sum + g.hits, 0);
		const totalBases = analyzedGames.reduce((sum, g) => sum + g.bases, 0);
		const totalHr = analyzedGames.reduce((sum, g) => sum + g.hr, 0);
		const totalK = analyzedGames.reduce((sum, g) => sum + g.k, 0);
		const totalBb = analyzedGames.reduce((sum, g) => sum + g.bb, 0);

		const seasonOBP = totalHits / (totalPa || 1);
		const seasonISO = (totalBases - totalHits) / (totalPa || 1);
		const seasonHrRate = totalHr / (totalPa || 1);
		const seasonKRate = totalK / (totalPa || 1);
		const seasonBbRate = totalBb / (totalPa || 1);

		// --- Recent 3 games (Form) ---
		const recentGames = analyzedGames.slice(-3);
		const recentHits = recentGames.reduce((sum, g) => sum + g.hits, 0);
		const recentBases = recentGames.reduce((sum, g) => sum + g.bases, 0); // Added this back
		const recentPa = recentGames.reduce((sum, g) => sum + g.pa, 0);

		const recentOBP = recentHits / (recentPa || 1);
		const recentISO = (recentBases - recentHits) / (recentPa || 1); // Added this back
		const recentForm = recentOBP / (seasonOBP || 1);

		// --- Baseline comparison (Due) ---
		const hitDue = recentOBP < seasonOBP;
		const baseDue = seasonISO > seasonISO; // Adjust as needed

		// --- Trend (Trajectory) ---
		const last7Games = analyzedGames.slice(-7);
		let trajectory: "up" | "down" | "stable" = "stable";
		if (last7Games.length >= 2) {
			const hitsTrend =
				last7Games[last7Games.length - 1].hits - last7Games[0].hits;
			if (hitsTrend > 0) trajectory = "up";
			else if (hitsTrend < 0) trajectory = "down";
		}

		// --- Compute scores ---
		const hitterStats: HitterStats = {
			paPerGame: totalPa / (analyzedGames.length || 1),
			obp: seasonOBP,
			iso: seasonISO,
			recentForm,
			// Use real K% if available, otherwise fallback to user's baseline 0.22
			oppKpct: realOpponentKPct ?? 0.22,
			parkFactor: 1, // Will integrate stadium later
		};
		const scored = scoreHitterProp(hitterStats);

		return {
			playerResult: {
				id: playerId,
				name: playerName,
				rawHitProbability: recentOBP,
				rawBaseProbability: recentISO,
				rawHrProbability: seasonHrRate,
				rawKProbability: seasonKRate,
				rawBbProbability: seasonBbRate,
				hitScore: scored.score,
				baseScore: scored.score,
				hitOdds: scored.americanOdds,
				baseOdds: scored.americanOdds,
				trajectory,
				recentGames: last7Games,
				last30Games: analyzedGames.slice(-30),
				last50Games: analyzedGames,
				hitDue,
				baseDue,
			},
			playerName,
			error,
		};
	} catch (err) {
		console.error(err);
		error = "Failed to fetch player stats";
	}

	return { playerResult, playerName, error };
}

function clamp01(v: number) {
	return Math.max(0, Math.min(1, v));
}

export function scoreHitterProp(stats: HitterStats) {
	const park = stats.parkFactor ?? 1.0;

	const normPA = clamp01(stats.paPerGame / 6);
	const normOBP = clamp01(stats.obp / 0.5);
	const normISO = clamp01(stats.iso / 0.4) * park;
	const normRecent = clamp01((stats.recentForm - 0.8) / 0.4);

	// Scorer relies heavily on Opponent K%
	const normOppK = clamp01(1 - stats.oppKpct / 0.35);

	// Weights (tweakable)
	const wPA = 0.2;
	const wOBP = 0.25;
	const wISO = 0.3;
	const wRecent = 0.15;
	const wOppK = 0.1;

	let raw =
		wPA * normPA +
		wOBP * normOBP +
		wISO * normISO +
		wRecent * normRecent +
		wOppK * normOppK;

	raw = clamp01(raw);

	// map to 1-5
	let score = 1;
	if (raw >= 0.8) score = 5;
	else if (raw >= 0.6) score = 4;
	else if (raw >= 0.4) score = 3;
	else if (raw >= 0.2) score = 2;
	else score = 1;

	// convert to American odds
	let americanOdds: number;
	if (raw === 0 || raw === 1) americanOdds = 0;
	else if (raw >= 0.5) americanOdds = -Math.round((raw / (1 - raw)) * 100);
	else americanOdds = Math.round(((1 - raw) / raw) * 100);

	return { rawProbability: raw, score, americanOdds };
}
