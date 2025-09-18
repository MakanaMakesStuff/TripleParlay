/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
	getPlayerStatsForSeason,
	getPlayerGameLog,
	getTeams,
	type PlayerStats,
} from "@/utils/endpoints";
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

const computeTrend = (last3: number[], last7: number[], last10: number[]) => {
	const avg = (arr: number[]) =>
		arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
	const avg3 = avg(last3);
	const avg7 = avg(last7);
	const avg10 = avg(last10);
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

export default function BreakdownPage() {
	const searchParams = useSearchParams();
	const teamAId = useMemo(
		() => Number(searchParams.get("teamA")),
		[searchParams]
	);
	const teamBId = useMemo(
		() => Number(searchParams.get("teamB")),
		[searchParams]
	);
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

		async function fetchStats() {
			setLoading(true);

			try {
				// 1) Season totals via endpoints
				const seasonA = await getPlayerStatsForSeason(teamAId, 2025);
				const seasonB = await getPlayerStatsForSeason(teamBId, 2025);

				if (seasonA.status !== 200 || seasonB.status !== 200) {
					throw new Error("Failed to load season stats");
				}

				const playersA: PlayerStats[] = seasonA.players ?? [];
				const playersB: PlayerStats[] = seasonB.players ?? [];

				// 2) Normalize across both teams (so normalizedScore != 0)
				const allPlayers = [...playersA, ...playersB];
				const hitsMax = Math.max(...allPlayers.map((p) => p.hits), 1);
				const strikeoutsMax = Math.max(
					...allPlayers.map((p) => p.strikeouts),
					1
				);
				const basesMax = Math.max(...allPlayers.map((p) => p.bases), 1);

				const normalize = (p: PlayerStats) => ({
					...p,
					normalizedScore:
						(p.hits / hitsMax +
							(1 - p.strikeouts / strikeoutsMax) +
							p.bases / basesMax) /
						3,
				});

				const normalizedA = playersA.map(normalize);
				const normalizedB = playersB.map(normalize);

				// 3) Resolve team names via getTeams (keeps fetching inside endpoints file)
				const teamsRes = await getTeams();
				let teamAName = `Team ${teamAId}`;
				let teamBName = `Team ${teamBId}`;
				if (teamsRes.status === 200) {
					const foundA = (teamsRes.teams || []).find(
						(t: any) => t.id === teamAId
					);
					const foundB = (teamsRes.teams || []).find(
						(t: any) => t.id === teamBId
					);
					if (foundA) teamAName = foundA.name;
					if (foundB) teamBName = foundB.name;
				}

				// 4) For each player, fetch their last N games using new helper
				const addTrend = async (
					players: (PlayerStats & { normalizedScore?: number })[]
				) =>
					Promise.all(
						players.map(async (p) => {
							const lg = await getPlayerGameLog(p.id, 2025, 10);
							const hits = Array.isArray(lg.hits) ? lg.hits : [];
							const strikeouts = Array.isArray(lg.strikeouts)
								? lg.strikeouts
								: [];

							const last10 = hits.slice(-10);
							const last7 = hits.slice(-7);
							const last3 = hits.slice(-3);

							const last10Strikeouts = strikeouts.slice(-10);
							const last7Strikeouts = strikeouts.slice(-7);
							const last3Strikeouts = strikeouts.slice(-3);

							const trend = computeTrend(last3, last7, last10);
							const dueHit = computeDueHit(last7, 2);

							return {
								...p,
								normalizedScore: p.normalizedScore || 0,
								last10Games: last10,
								last7Games: last7,
								last3Games: last3,
								last10Strikeouts,
								last7Strikeouts,
								last3Strikeouts,
								trend,
								showGraph: false,
								dueHit,
							} as PlayerWithTrend;
						})
					);

				// run concurrently for both teams
				const [trendA, trendB] = await Promise.all([
					addTrend(normalizedA),
					addTrend(normalizedB),
				]);

				if (!cancelled) {
					setTeamAInfo({
						id: teamAId,
						name: teamAName,
						logoUrl: `https://www.mlbstatic.com/team-logos/${teamAId}.svg`,
						playerIds: normalizedA.map((p) => p.id),
					});
					setTeamBInfo({
						id: teamBId,
						name: teamBName,
						logoUrl: `https://www.mlbstatic.com/team-logos/${teamBId}.svg`,
						playerIds: normalizedB.map((p) => p.id),
					});

					setTeamAPlayers(
						trendA
							.map((p) => ({ ...p, placementScore: computePlacementScore(p) }))
							.sort((a, b) => (b.placementScore || 0) - (a.placementScore || 0))
					);
					setTeamBPlayers(
						trendB
							.map((p) => ({ ...p, placementScore: computePlacementScore(p) }))
							.sort((a, b) => (b.placementScore || 0) - (a.placementScore || 0))
					);
				}
			} catch (error) {
				console.error("Failed to fetch stats:", error);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		fetchStats();
		return () => {
			cancelled = true;
		};
	}, [teamAId, teamBId, gamePks]);

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
							<Line type="monotone" dataKey="hits" />
							<Line type="monotone" dataKey="strikeouts" stroke="red" />
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
