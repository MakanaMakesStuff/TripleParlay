export type HitterStats = {
	paPerGame: number; // e.g. 4.2
	obp: number; // e.g. 0.350
	iso: number; // slg - avg, e.g. 0.200
	recentForm: number; // multiplier, e.g. 1.05 (season baseline = 1.0)
	oppKpct: number; // opponent pitcher's K%, e.g. 0.22
	parkFactor?: number; // 1.0 neutral, >1 boosts power
};

export type PlayerGameStats = {
	date: string;
	hits: number;
	bases: number;
	pa: number;
};

export type PlayerResult = {
	id: number;
	name: string;
	rawHitProbability: number;
	rawBaseProbability: number;
	hitScore: number;
	baseScore: number;
	hitOdds: number;
	baseOdds: number;
	trajectory: "up" | "down" | "stable";
	recentGames: PlayerGameStats[];
	hitDue: boolean;
	baseDue: boolean;
};

export async function getPlayerProbability(playerId: number): Promise<{
	playerResult: PlayerResult | null;
	playerName: string;
	error: string | null;
}> {
	let playerResult: PlayerResult | null = null;
	let playerName = "";
	let error: string | null = null;

	try {
		// --- Fetch player info ---
		const playerRes = await fetch(
			`https://statsapi.mlb.com/api/v1/people/${playerId}`
		);
		const playerJson = await playerRes.json();
		const player = playerJson.people?.[0];
		playerName = player?.fullName ?? "Player";

		// --- Fetch last 50 game logs for hitting ---
		const gameRes = await fetch(
			`https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=gameLog&group=hitting&gameType=R&season=2025`
		);
		const gameJson = await gameRes.json();
		const gameLogs = gameJson.stats?.[0]?.splits ?? [];

		if (!gameLogs.length) {
			error = "No game logs found";
			return { playerResult, playerName, error };
		}

		const analyzedGames: PlayerGameStats[] = gameLogs
			.slice(-50)
			.map((g: any) => ({
				date: g.date,
				hits: g.stat.hits,
				bases: g.stat.totalBases,
				pa: g.stat.plateAppearances,
			}));

		// --- Season totals ---
		const totalPa = analyzedGames.reduce((sum, g) => sum + g.pa, 0);
		const totalHits = analyzedGames.reduce((sum, g) => sum + g.hits, 0);
		const totalBases = analyzedGames.reduce((sum, g) => sum + g.bases, 0);

		const seasonOBP = totalHits / (totalPa || 1);
		const seasonISO = (totalBases - totalHits) / (totalPa || 1);

		// --- Recent 3 games ---
		const recentGames = analyzedGames.slice(-3);
		const recentHits = recentGames.reduce((sum, g) => sum + g.hits, 0);
		const recentBases = recentGames.reduce((sum, g) => sum + g.bases, 0);
		const recentPa = recentGames.reduce((sum, g) => sum + g.pa, 0);

		const recentOBP = recentHits / (recentPa || 1);
		const recentISO = (recentBases - recentHits) / (recentPa || 1);

		// --- Recent form multiplier (hot/cold streak) ---
		const recentForm = recentOBP / (seasonOBP || 1);

		// --- Determine if player is 'due' ---
		const hitDue = recentOBP < seasonOBP;
		const baseDue = recentISO < seasonISO;

		// --- Trajectory (trend over last 7 games) ---
		const last7Games = analyzedGames.slice(-7);
		let trajectory: "up" | "down" | "stable" = "stable";
		if (last7Games.length >= 2) {
			const hitsTrend =
				last7Games[last7Games.length - 1].hits - last7Games[0].hits;
			const basesTrend =
				last7Games[last7Games.length - 1].bases - last7Games[0].bases;
			if (hitsTrend > 0 || basesTrend > 0) trajectory = "up";
			else if (hitsTrend < 0 || basesTrend < 0) trajectory = "down";
		}

		// --- Compute scores using scoring function ---
		const hitterStats: HitterStats = {
			paPerGame: totalPa / (analyzedGames.length || 1),
			obp: seasonOBP,
			iso: seasonISO,
			recentForm,
			oppKpct: 0.22,
			parkFactor: 1,
		};
		const scored = scoreHitterProp(hitterStats);

		return {
			playerResult: {
				id: playerId,
				name: playerName,
				rawHitProbability: recentOBP,
				rawBaseProbability: recentISO,
				hitScore: scored.score,
				baseScore: scored.score,
				hitOdds: scored.americanOdds,
				baseOdds: scored.americanOdds,
				trajectory,
				recentGames: last7Games,
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
	const normISO = clamp01(stats.iso / 0.4) * park; // apply park boost to power
	const normRecent = clamp01((stats.recentForm - 0.8) / 0.4); // maps 0.8..1.2 -> 0..1
	const normOppK = clamp01(1 - stats.oppKpct / 0.35); // lower opp K => higher normOppK

	// weights (tweakable)
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

	// convert to American odds (fair odds)
	let americanOdds: number;
	if (raw === 0) americanOdds = 100000; // arbitrarily large
	else {
		if (raw >= 0.5) {
			americanOdds = -Math.round((raw / (1 - raw)) * 100);
		} else {
			americanOdds = Math.round(((1 - raw) / raw) * 100);
		}
	}

	return { rawProbability: raw, score, americanOdds };
}
