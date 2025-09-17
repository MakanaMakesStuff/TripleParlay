// utils/teams.ts

// Calculate performance for all teams vs all opponents
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calculateAllTeamPerformances(allGames: any[]) {
	const performances: Record<string, Record<string, number>> = {};

	allGames.forEach((game) => {
		const homeTeamName = game.teams.home.team.name;
		const awayTeamName = game.teams.away.team.name;

		// simple performance metric: 1 for win, 0 for loss
		const homeScore = game.teams.home.isWinner ? 1 : 0;
		const awayScore = game.teams.away.isWinner ? 1 : 0;

		if (!performances[homeTeamName]) performances[homeTeamName] = {};
		if (!performances[awayTeamName]) performances[awayTeamName] = {};

		if (!performances[homeTeamName][awayTeamName])
			performances[homeTeamName][awayTeamName] = 0;
		if (!performances[awayTeamName][homeTeamName])
			performances[awayTeamName][homeTeamName] = 0;

		// accumulate win counts
		performances[homeTeamName][awayTeamName] += homeScore;
		performances[awayTeamName][homeTeamName] += awayScore;
	});

	return performances;
}

// Normalize across all team matchups
export function normalizeAllPerformances(
	performances: Record<string, Record<string, number>>
) {
	// collect all values
	const allValues: number[] = [];
	Object.values(performances).forEach((oppMap) => {
		Object.values(oppMap).forEach((score) => allValues.push(score));
	});

	const max = Math.max(...allValues);
	const min = Math.min(...allValues);

	const normalized: Record<string, Record<string, number>> = {};

	Object.entries(performances).forEach(([team, oppMap]) => {
		normalized[team] = {};
		Object.entries(oppMap).forEach(([opp, score]) => {
			normalized[team][opp] = max === min ? 0 : (score - min) / (max - min);
		});
	});

	return normalized;
}
