// components/BreakdownPage.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
	getPlayersForGame,
	getPlayerStatsForGame,
	PlayerStats,
} from "@/utils/endpoints";
import Image from "next/image";

type TeamInfo = {
	id: number;
	name: string;
	logoUrl: string;
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

	return {
		teamA: normalize(teamA),
		teamB: normalize(teamB),
	};
};

export default function BreakdownPage() {
	const searchParams = useSearchParams();
	const teamAId = searchParams.get("teamA");
	const teamBId = searchParams.get("teamB");
	const gamePk = searchParams.get("gamePk");

	const [teamAPlayers, setTeamAPlayers] = useState<PlayerStats[]>([]);
	const [teamBPlayers, setTeamBPlayers] = useState<PlayerStats[]>([]);
	const [teamAInfo, setTeamAInfo] = useState<TeamInfo | null>(null);
	const [teamBInfo, setTeamBInfo] = useState<TeamInfo | null>(null);
	const [loading, setLoading] = useState(true);

	const getTeamInfo = async (id: string | number): Promise<TeamInfo> => {
		const res = await fetch(`https://statsapi.mlb.com/api/v1/teams/${id}`);
		const data = await res.json();
		const team = data.teams[0];
		return {
			id: team.id,
			name: team.name,
			logoUrl: `https://www.mlbstatic.com/team-logos/${team.id}.svg`,
		};
	};

	useEffect(() => {
		if (!teamAId || !teamBId || !gamePk) return;

		async function fetchStats() {
			setLoading(true);

			try {
				const [aInfo, bInfo] = await Promise.all([
					getTeamInfo(teamAId!),
					getTeamInfo(teamBId!),
				]);
				setTeamAInfo(aInfo);
				setTeamBInfo(bInfo);

				const [teamAPlayerIds, teamBPlayerIds] = await Promise.all([
					getPlayersForGame(Number(teamAId), Number(gamePk)),
					getPlayersForGame(Number(teamBId), Number(gamePk)),
				]);

				if (!teamAPlayerIds.length || !teamBPlayerIds.length) {
					console.warn("No players found for one of the teams");
					setTeamAPlayers([]);
					setTeamBPlayers([]);
					return;
				}

				const [aStatsRes, bStatsRes] = await Promise.all([
					getPlayerStatsForGame(teamAPlayerIds, Number(gamePk)),
					getPlayerStatsForGame(teamBPlayerIds, Number(gamePk)),
				]);

				const { teamA: normalizedA, teamB: normalizedB } = normalizeCombined(
					aStatsRes.players ?? [],
					bStatsRes.players ?? []
				);

				setTeamAPlayers(normalizedA);
				setTeamBPlayers(normalizedB);
			} catch (error) {
				console.error("Failed to fetch player stats:", error);
			} finally {
				setLoading(false);
			}
		}

		fetchStats();
	}, [teamAId, teamBId, gamePk]);

	if (loading) return <div className="text-center mt-8">Loading...</div>;

	return (
		<div className="flex flex-col items-center p-4">
			<h1 className="text-xl font-bold mb-6">Matchup Player Breakdown</h1>

			<div className="flex w-full max-w-[1000px] gap-6">
				{/* Team A */}
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

					{teamAPlayers
						.sort((a, b) => (b.normalizedScore || 0) - (a.normalizedScore || 0))
						.map((player) => (
							<div
								key={player.id}
								className="flex justify-between p-2 border-b border-neutral-300"
							>
								<span>{player.name}</span>
								<span>{(player.normalizedScore || 0).toFixed(2)}</span>
							</div>
						))}
				</div>

				{/* Team B */}
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

					{teamBPlayers
						.sort((a, b) => (b.normalizedScore || 0) - (a.normalizedScore || 0))
						.map((player) => (
							<div
								key={player.id}
								className="flex justify-between p-2 border-b border-neutral-300"
							>
								<span>{player.name}</span>
								<span>{(player.normalizedScore || 0).toFixed(2)}</span>
							</div>
						))}
				</div>
			</div>
		</div>
	);
}
