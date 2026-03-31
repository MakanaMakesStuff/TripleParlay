// utils/pitching.ts

export type StartingPitcher = {
	id: number;
	name: string;
	teamId: number;
	teamName: string;
	k9: number; // Strikeouts per 9 innings
	bb9: number; // Walks per 9 innings
	era: number;
	whip: number;
	kPct: number; // Strikeout Rate (what your hitter scoring needs)
};

export async function getStartingPitcherStats(
	playerId: number,
): Promise<StartingPitcher | null> {
	try {
		const currentYear = new Date().getFullYear();

		// --- Fetch season pitching stats ---
		const statsRes = await fetch(
			`https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season&group=pitching&gameType=R&season=${currentYear}`,
		);
		const statsJson = await statsRes.json(); // Fixed typo here
		const statSplit = statsJson.stats?.[0]?.splits?.[0];

		// If no stats found for current year (e.g. injured, rookie)
		if (!statSplit) return null;

		// --- Fetch player bio to get team info ---
		const peopleRes = await fetch(
			`https://statsapi.mlb.com/api/v1/people/${playerId}`,
		);
		const peopleJson = await peopleRes.json();
		const playerBio = peopleJson.people?.[0];

		// --- Calculate rates not natively provided in standard season stats ---
		const strikeouts = statSplit.stat.strikeOuts ?? 0;
		const walks = statSplit.stat.baseOnBalls ?? 0;
		const battersFaced = statSplit.stat.battersFaced ?? 0;

		// K% is key for your scoring algorithm
		const kPct = battersFaced > 0 ? strikeouts / battersFaced : 0;

		return {
			id: playerId,
			name: playerBio?.fullName ?? "Pitcher",
			teamId: playerBio?.currentTeam?.id ?? 0,
			teamName: playerBio?.currentTeam?.name ?? "Team",
			k9: parseFloat(statSplit.stat.strikeOutsPer9Inn ?? 0),
			bb9: parseFloat(statSplit.stat.baseOnBallsPer9Inn ?? 0),
			era: parseFloat(statSplit.stat.era ?? 0),
			whip: parseFloat(statSplit.stat.whip ?? 0),
			kPct,
		};
	} catch (err) {
		console.error(`Failed to fetch stats for pitcher ${playerId}`, err);
		return null;
	}
}
