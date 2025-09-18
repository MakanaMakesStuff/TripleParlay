/* eslint-disable @typescript-eslint/no-explicit-any */
export type Team = {
	springLeague: {
		id: number;
		name: string;
		link: string;
		abbreviation: string;
	};
	allStarStatus: string;
	id: number;
	name: string;
	link: string;
	season: number;
	venue: {
		id: number;
		name: string;
		link: string;
	};
	springVenue: {
		id: number;
		link: string;
	};
	teamCode: string;
	fileCode: string;
	abbreviation: string;
	teamName: string;
	locationName: string;
	firstYearOfPlay: string;
	league: {
		id: number;
		name: string;
		link: string;
	};
	division: {
		id: number;
		name: string;
		link: string;
	};
	sport: {
		id: number;
		link: string;
		name: string;
	};
	shortName: string;
	franchiseName: string;
	clubName: string;
	active: boolean;
};

export async function getTeams() {
	try {
		const res = await fetch(
			"https://statsapi.mlb.com/api/v1/teams?sportId=1&season=2025"
		);

		const { teams = [] } = (await res.json()) as { teams: Team[] };

		return { status: 200, teams };
	} catch (error) {
		console.error("Failed to get teams:", error);
		return { status: 500, error };
	}
}

export type GameDate = {
	date: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	events: any[];
	games: Game[];
	totalEvents: number;
	totalGamesInProgress: number;
	totalItems: number;
};

export type Game = {
	gamePk: number;
	gameGuid: string;
	link: string;
	gameType: string; // e.g. "S" for Spring
	season: string;
	gameDate: string; // ISO date string
	officialDate: string; // YYYY-MM-DD
	status: {
		abstractGameState: string;
		codedGameState: string;
		detailedState: string;
		statusCode: string;
		startTimeTBD: boolean;
		abstractGameCode: string;
	};
	teams: {
		away: {
			leagueRecord: {
				wins: number;
				losses: number;
				pct: string;
			};
			score: number;
			team: {
				id: number;
				name: string;
				link: string;
			};
			isWinner: boolean;
			splitSquad: boolean;
			seriesNumber: number;
		};
		home: {
			leagueRecord: {
				wins: number;
				losses: number;
				pct: string;
			};
			score: number;
			team: {
				id: number;
				name: string;
				link: string;
			};
			isWinner: boolean;
			splitSquad: boolean;
			seriesNumber: number;
		};
	};
	venue: {
		id: number;
		name: string;
		link: string;
	};
	content: {
		link: string;
	};
	isTie: boolean;
	gameNumber: number;
	publicFacing: boolean;
	doubleHeader: string;
	gamedayType: string;
	tiebreaker: string;
	calendarEventID: string;
	seasonDisplay: string;
	dayNight: string;
	scheduledInnings: number;
	reverseHomeAwayStatus: boolean;
	inningBreakLength: number;
	gamesInSeries: number;
	seriesGameNumber: number;
	seriesDescription: string;
	recordSource: string;
	ifNecessary: string;
	ifNecessaryDescription: string;
};

export async function getGames(teamId: number, season = 2025) {
	try {
		const res = await fetch(
			`https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${teamId}&season=${season}`
		);

		const { dates = [] } = (await res.json()) as { dates: GameDate[] };

		return { status: 200, dates };
	} catch (error) {
		console.error(`Failed to get game history for team id: ${teamId}.`, error);

		return { status: 500, error };
	}
}

export async function getPlayerStatsForSeason(teamId: number, season = 2025) {
	try {
		const { dates } = await getGames(teamId, season);
		const completedGames =
			dates?.flatMap((d) =>
				d.games.filter((g) => g.status.abstractGameState === "Final")
			) ?? [];

		const playerMap: Record<number, PlayerStats> = {};

		for (const game of completedGames) {
			const res = await fetch(
				`https://statsapi.mlb.com/api/v1/game/${game.gamePk}/boxscore`
			);

			if (!res.ok)
				throw new Error(`Failed to fetch boxscore for game ${game.gamePk}`);

			const data = await res.json();

			const teamKey = teamId === data.teams.home.team.id ? "home" : "away";
			const roster = data.teams[teamKey].players;

			for (const p of Object.values(roster)) {
				const person = (p as any).person;
				const batting = (p as any).stats?.batting;
				if (!batting) continue;

				if (!playerMap[person.id]) {
					playerMap[person.id] = {
						id: person.id,
						name: person.fullName,
						hits: 0,
						strikeouts: 0,
						bases: 0,
					};
				}

				playerMap[person.id].hits += batting.hits ?? 0;
				playerMap[person.id].strikeouts += batting.strikeOuts ?? 0;
				playerMap[person.id].bases +=
					(batting.doubles ?? 0) * 2 +
					(batting.triples ?? 0) * 3 +
					(batting.homeRuns ?? 0) * 4;
			}
		}

		return { status: 200, players: Object.values(playerMap) };
	} catch (error) {
		console.error(`Failed to get season stats for team id: ${teamId}`, error);
		return { status: 500, error };
	}
}

export async function getPlayersForGame(teamId: number, gamePk: number) {
	try {
		const res = await fetch(
			`https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`
		);
		if (!res.ok) throw new Error("Failed to fetch boxscore");

		const data = await res.json();

		const teamKey = teamId === data.teams.home.team.id ? "home" : "away";
		const roster = data.teams[teamKey].players;

		// Map to player IDs
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return Object.values(roster).map((p: any) => p.person.id);
	} catch (error) {
		console.error("Failed to fetch players for game:", error);
		return [];
	}
}

export type PlayerStats = {
	id: number;
	name: string;
	hits: number;
	strikeouts: number;
	bases: number;
	normalizedScore?: number;
};

/**
 * Fetch player stats for a specific game between teamA and teamB
 */
export async function getPlayerStatsForGame(
	teamPlayerIds: number[],
	gamePk: number
) {
	try {
		const players: PlayerStats[] = [];

		for (const playerId of teamPlayerIds) {
			const res = await fetch(
				`https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=gameLog&group=hitting&gameType=R&season=2025`
			);

			if (!res.ok) {
				console.error(
					`Failed to fetch stats for player ${playerId}`,
					res.statusText
				);
				continue;
			}

			const data = await res.json();
			const gameLog = data?.stats?.[0]?.splits || [];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const gameStats = gameLog.find((g: any) => g.game?.gamePk === gamePk);

			console.log(gameLog);
			if (!gameStats) continue;

			players.push({
				id: playerId,
				name: gameStats.player?.fullName || "Unknown",
				hits: gameStats.stat?.hits ?? 0,
				strikeouts: gameStats.stat?.strikeOuts ?? 0,
				bases:
					(gameStats.stat?.doubles ?? 0) * 2 +
					(gameStats.stat?.triples ?? 0) * 3 +
					(gameStats.stat?.homeRuns ?? 0) * 4,
			});
		}

		return { status: 200, players };
	} catch (error) {
		console.error("Failed to get player stats:", error);
		return { status: 500, error };
	}
}

export async function getPlayerGameLog(
	playerId: number,
	season = 2025,
	n = 10
) {
	try {
		const res = await fetch(
			`https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=gameLog&group=hitting&season=${season}&gameType=R`
		);

		if (!res.ok)
			throw new Error(`Failed to fetch gameLog for player ${playerId}`);

		const data = await res.json();
		const splits = data?.stats?.[0]?.splits || [];
		const lastNGames = splits.slice(-n);

		const hits = lastNGames.map((g: any) => g.stat?.hits ?? 0);
		const strikeouts = lastNGames.map((g: any) => g.stat?.strikeOuts ?? 0);
		const games = lastNGames.map((g: any) => ({
			gamePk: g.game?.gamePk,
			date: g.game?.date,
			stat: g.stat,
		}));

		return { status: 200, games, hits, strikeouts };
	} catch (error) {
		console.error(`Failed to get gameLog for player ${playerId}`, error);
		return {
			status: 500,
			error,
			games: [],
			hits: Array(n).fill(0),
			strikeouts: Array(n).fill(0),
		};
	}
}
