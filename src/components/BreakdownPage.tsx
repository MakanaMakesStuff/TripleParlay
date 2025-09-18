/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getPlayerStatsForGame, PlayerStats } from "@/utils/endpoints";
import Image from "next/image";
import {
	ResponsiveContainer,
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
} from "recharts";
import { TrendingUp, TrendingDown, BarChart } from "lucide-react";

type TeamInfo = {
	id: number;
	name: string;
	logoUrl: string;
	playerIds: number[];
};

type PlayerWithTrend = PlayerStats & {
	last10Games: number[];
	last7Games: number[];
	last3Games: number[];
	last10Strikeouts: number[];
	last7Strikeouts: number[];
	last3Strikeouts: number[];
	trend: "up" | "down" | "neutral";
	showGraph: boolean;
	dueHit: boolean;
	placementScore?: number;
};

const combineStats = (statsArray: PlayerStats[][]): PlayerStats[] => {
	const combined: Record<number, PlayerStats> = {};
	for (const stats of statsArray) {
		for (const player of stats) {
			if (!combined[player.id]) combined[player.id] = { ...player };
			else
				combined[player.id] = {
					...combined[player.id],
					hits: (combined[player.id].hits || 0) + (player.hits || 0),
					strikeouts:
						(combined[player.id].strikeouts || 0) + (player.strikeouts || 0),
					bases: (combined[player.id].bases || 0) + (player.bases || 0),
				};
		}
	}
	return Object.values(combined);
};

const normalizeCombined = (teamA: PlayerStats[], teamB: PlayerStats[]) => {
	const allPlayers = [...teamA, ...teamB];
	const hitsMax = Math.max(...allPlayers.map((p) => p.hits), 1);
	const strikeoutsMax = Math.max(...allPlayers.map((p) => p.strikeouts), 1);
	const basesMax = Math.max(...allPlayers.map((p) => p.bases), 1);

	const normalize = (players: PlayerStats[]) =>
		players.map((p) => ({
			...p,
			normalizedScore:
				(p.hits / hitsMax +
					(1 - p.strikeouts / strikeoutsMax) +
					p.bases / basesMax) /
				3,
		}));

	return { teamA: normalize(teamA), teamB: normalize(teamB) };
};

export default function BreakdownPage() {
	const searchParams = useSearchParams();

	const teamAId = useMemo(() => searchParams.get("teamA"), [searchParams]);
	const teamBId = useMemo(() => searchParams.get("teamB"), [searchParams]);

	const rawGamePks = useMemo(() => searchParams.get("gamePks"), [searchParams]);
	const gamePks: number[] = useMemo(() => {
		try {
			return JSON.parse(rawGamePks ?? "[]");
		} catch {
			return [];
		}
	}, [rawGamePks]);

	const [teamAInfo, setTeamAInfo] = useState<TeamInfo | null>(null);
	const [teamBInfo, setTeamBInfo] = useState<TeamInfo | null>(null);
	const [teamAPlayers, setTeamAPlayers] = useState<PlayerWithTrend[]>([]);
	const [teamBPlayers, setTeamBPlayers] = useState<PlayerWithTrend[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!teamAId || !teamBId || !gamePks.length) return;

		let cancelled = false;

		const computeTrend = (
			last3: number[],
			last7: number[],
			last10: number[]
		) => {
			const avg3 = last3.reduce((a, b) => a + b, 0) / Math.max(last3.length, 1);
			const avg7 = last7.reduce((a, b) => a + b, 0) / Math.max(last7.length, 1);
			const avg10 =
				last10.reduce((a, b) => a + b, 0) / Math.max(last10.length, 1);
			if (avg3 > avg7 && avg7 > avg10) return "up";
			if (avg3 < avg7 && avg7 < avg10) return "down";
			return "neutral";
		};

		const computeDueHit = (last7: number[], avgZeroStreak: number) => {
			let zeroStreak = 0;
			for (let i = last7.length - 1; i >= 0; i--) {
				if (last7[i] === 0) zeroStreak++;
				else break;
			}
			return zeroStreak >= avgZeroStreak;
		};

		const computePlacementScore = (player: PlayerWithTrend) => {
			const base = player.normalizedScore || 0;
			const trendFactor =
				player.trend === "up" ? 1.1 : player.trend === "down" ? 0.9 : 1.0;
			const dueHitFactor = player.dueHit ? 1.05 : 1.0;
			return base * trendFactor * dueHitFactor;
		};

		const fetchLastNGames = async (playerId: number, n = 10) => {
			try {
				const res = await fetch(
					`https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=gameLog&group=hitting&gameType=R&season=2025`
				);
				if (!res.ok) throw new Error("Failed to fetch player stats");

				const data = await res.json();
				const splits = data?.stats?.[0]?.splits || [];
				const lastNGames = splits.slice(-n);
				const hits = lastNGames.map((g: any) => g.stat?.hits ?? 0);
				const strikeouts = lastNGames.map((g: any) => g.stat?.strikeOuts ?? 0);
				return { hits, strikeouts };
			} catch (error) {
				console.error("Failed to fetch last N games", error);
				return {
					hits: Array(n).fill(0),
					strikeouts: Array(n).fill(0),
				};
			}
		};

		async function fetchStats() {
			setLoading(true);
			setTeamAPlayers([]);
			setTeamBPlayers([]);

			try {
				const allAStats: PlayerStats[][] = [];
				const allBStats: PlayerStats[][] = [];
				let teamAInfoSet: TeamInfo | null = null;
				let teamBInfoSet: TeamInfo | null = null;

				const chunkSize = 3;
				for (let i = 0; i < gamePks.length; i += chunkSize) {
					const chunk = gamePks.slice(i, i + chunkSize);

					await Promise.all(
						chunk.map(async (gamePk) => {
							const res = await fetch(
								`https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`
							);
							const data = await res.json();
							const homeTeam = data.teams.home;
							const awayTeam = data.teams.away;

							const getPlayerIds = (team: any) =>
								Object.values(team.players).map((p: any) => p.person.id);

							const teamAIsHome = Number(teamAId) === homeTeam.team.id;
							const teamAPlayersIds = teamAIsHome
								? getPlayerIds(homeTeam)
								: getPlayerIds(awayTeam);
							const teamBPlayersIds = teamAIsHome
								? getPlayerIds(awayTeam)
								: getPlayerIds(homeTeam);

							const [aStatsRes, bStatsRes] = await Promise.all([
								getPlayerStatsForGame(teamAPlayersIds, Number(gamePk)),
								getPlayerStatsForGame(teamBPlayersIds, Number(gamePk)),
							]);

							allAStats.push(aStatsRes.players ?? []);
							allBStats.push(bStatsRes.players ?? []);

							if (!teamAInfoSet || !teamBInfoSet) {
								const getTeamInfo = (team: any): TeamInfo => ({
									id: team.team.id,
									name: team.team.name,
									logoUrl: `https://www.mlbstatic.com/team-logos/${team.team.id}.svg`,
									playerIds: Object.values(team.players).map(
										(p: any) => p.person.id
									),
								});

								teamAInfoSet = teamAIsHome
									? getTeamInfo(homeTeam)
									: getTeamInfo(awayTeam);
								teamBInfoSet = teamAIsHome
									? getTeamInfo(awayTeam)
									: getTeamInfo(homeTeam);
							}
						})
					);

					if (!cancelled) {
						const combinedA = combineStats(allAStats);
						const combinedB = combineStats(allBStats);

						const { teamA: normalizedA, teamB: normalizedB } =
							normalizeCombined(combinedA, combinedB);

						const addTrend = async (
							players: PlayerStats[]
						): Promise<PlayerWithTrend[]> =>
							Promise.all(
								players.map(async (p) => {
									const last10 = await fetchLastNGames(p.id, 10);
									const last7 = last10.hits.slice(-7);
									const last3 = last10.hits.slice(-3);

									const last10Strikeouts = last10.strikeouts;
									const last7Strikeouts = last10.strikeouts.slice(-7);
									const last3Strikeouts = last10.strikeouts.slice(-3);

									const trend = computeTrend(last3, last7, last10.hits);

									const avgZeroStreak = 2;
									const dueHit = computeDueHit(last7, avgZeroStreak);

									return {
										...p,
										normalizedScore: p.normalizedScore || 0,
										last10Games: last10.hits,
										last7Games: last7,
										last3Games: last3,
										last10Strikeouts,
										last7Strikeouts,
										last3Strikeouts,
										trend,
										showGraph: false,
										dueHit,
									};
								})
							);

						const trendA = await addTrend(normalizedA);
						const trendB = await addTrend(normalizedB);

						setTeamAInfo(teamAInfoSet);
						setTeamBInfo(teamBInfoSet);

						setTeamAPlayers(
							trendA
								.map((p) => ({
									...p,
									placementScore: computePlacementScore(p),
								}))
								.sort(
									(a, b) => (b.placementScore || 0) - (a.placementScore || 0)
								)
						);
						setTeamBPlayers(
							trendB
								.map((p) => ({
									...p,
									placementScore: computePlacementScore(p),
								}))
								.sort(
									(a, b) => (b.placementScore || 0) - (a.placementScore || 0)
								)
						);
					}
				}
			} catch (error) {
				console.error("Failed to fetch player stats:", error);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		fetchStats();

		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [teamAId, teamBId, gamePks.join(",")]);

	const toggleGraph = (playerId: number, team: "A" | "B") => {
		const updatePlayers = (players: PlayerWithTrend[]) =>
			players.map((p) => ({
				...p,
				showGraph: p.id === playerId ? !p.showGraph : false,
			}));

		if (team === "A") setTeamAPlayers((prev) => updatePlayers(prev));
		if (team === "B") setTeamBPlayers((prev) => updatePlayers(prev));
	};

	const renderPlayer = (player: PlayerWithTrend, team: "A" | "B") => (
		<div key={player.id} className="flex flex-col border-b border-neutral-300">
			<div className="flex justify-between p-2 items-center">
				<div className="flex items-center gap-2">
					<span>{player.name}</span>
				</div>
				<div className="flex items-center gap-2">
					{player.trend === "up" && <TrendingUp className="text-green-500" />}
					{player.trend === "down" && <TrendingDown className="text-red-500" />}
					{player.dueHit && (
						<span className="text-yellow-500 cursor-pointer" title="Hit likely">
							🔥
						</span>
					)}
					<span>{(player.placementScore || 0).toFixed(2)}</span>
					<button
						className="p-2 bg-blue-500 text-white rounded"
						onClick={() => toggleGraph(player.id, team)}
					>
						<BarChart className="w-4 h-4" />
					</button>
				</div>
			</div>

			{player.showGraph && (
				<div className="p-2">
					<ResponsiveContainer width="100%" height={150}>
						<LineChart
							data={player.last7Games.map((hits, idx) => ({
								game: idx + 1,
								hits,
								strikeouts: player.last7Strikeouts?.[idx] ?? 0,
							}))}
						>
							<XAxis dataKey="game" />
							<YAxis />
							<Tooltip />
							<Line type="monotone" dataKey="hits" stroke="#4ade80" />
							<Line type="monotone" dataKey="strikeouts" stroke="#f87171" />
						</LineChart>
					</ResponsiveContainer>
				</div>
			)}
		</div>
	);

	if (loading && !teamAPlayers.length && !teamBPlayers.length)
		return <div className="text-center mt-8">Loading...</div>;

	return (
		<div className="flex flex-col items-center p-4">
			<h1 className="text-xl font-bold mb-6">Matchup Player Breakdown</h1>

			<br />

			<div className="flex w-full md:flex-row flex-col max-w-[1000px] gap-6">
				<div className="flex-1">
					{teamAInfo && (
						<div className="flex items-center gap-2 mb-2">
							<Image
								src={teamAInfo.logoUrl}
								alt={`${teamAInfo.name} Logo`}
								width={50}
								height={50}
								className="w-8 h-8"
							/>
							<h2 className="text-lg font-semibold">{teamAInfo.name}</h2>
						</div>
					)}
					{teamAPlayers.map((p) => renderPlayer(p, "A"))}
				</div>

				<div className="flex-1">
					{teamBInfo && (
						<div className="flex items-center gap-2 mb-2">
							<Image
								src={teamBInfo.logoUrl}
								alt={`${teamBInfo.name} Logo`}
								width={50}
								height={50}
								className="w-8 h-8"
							/>
							<h2 className="text-lg font-semibold">{teamBInfo.name}</h2>
						</div>
					)}
					{teamBPlayers.map((p) => renderPlayer(p, "B"))}
				</div>
			</div>

			{loading && <p className="mt-4 text-gray-400">Loading more games…</p>}
		</div>
	);
}
