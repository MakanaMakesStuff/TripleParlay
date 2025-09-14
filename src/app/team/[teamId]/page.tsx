"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getPlayerProbability, PlayerResult } from "@/utils/probability";
import { ArrowUpCircle, ArrowDownCircle, MinusCircle } from "lucide-react";
import Image from "next/image";

type SortOption = "hit" | "base";
type SortOrder = "asc" | "desc";

export default function TeamPage() {
	const params = useParams();
	const teamId = params.teamId;

	const [teamName, setTeamName] = useState<string>("");
	const [teamLogo, setTeamLogo] = useState<string | null>(null);

	const [results, setResults] = useState<PlayerResult[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [sortOption, setSortOption] = useState<SortOption>("hit");
	const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

	useEffect(() => {
		async function fetchTeamAndRoster() {
			setLoading(true);
			try {
				const teamRes = await fetch(
					`https://statsapi.mlb.com/api/v1/teams/${teamId}`
				);
				const teamJson = await teamRes.json();
				setTeamName(teamJson.teams?.[0]?.name || "Team");
				setTeamLogo(
					`https://www.mlbstatic.com/team-logos/${teamJson.teams?.[0]?.id}.svg`
				); // MLB API might use "teamLogo" or "logo" field, adjust accordingly

				const rosterRes = await fetch(
					`https://statsapi.mlb.com/api/v1/teams/${teamId}/roster`
				);
				const rosterJson = await rosterRes.json();
				const roster = rosterJson.roster ?? [];

				const playerResults: PlayerResult[] = [];

				for (const player of roster) {
					try {
						const playerId = player.person.id;
						const data = await getPlayerProbability(playerId);
						if (data.playerResult) playerResults.push(data.playerResult);
					} catch (innerErr) {
						console.error(
							`Error fetching stats for ${player.person.fullName}`,
							innerErr
						);
					}
				}

				setResults(playerResults);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} catch (err: any) {
				console.error(err);
				setError("Failed to fetch team or roster");
			} finally {
				setLoading(false);
			}
		}

		fetchTeamAndRoster();
	}, [teamId]);

	const sortedResults = useMemo(() => {
		return [...results].sort((a, b) => {
			const valA =
				sortOption === "hit" ? a.rawHitProbability : a.rawBaseProbability;
			const valB =
				sortOption === "hit" ? b.rawHitProbability : b.rawBaseProbability;
			return sortOrder === "asc" ? valA - valB : valB - valA;
		});
	}, [results, sortOption, sortOrder]);

	const getTrajectoryIcon = (trajectory: PlayerResult["trajectory"]) => {
		switch (trajectory) {
			case "up":
				return <ArrowUpCircle className="inline text-green-400 ml-2" />;
			case "down":
				return <ArrowDownCircle className="inline text-red-400 ml-2" />;
			default:
				return <MinusCircle className="inline text-gray-400 ml-2" />;
		}
	};

	if (loading)
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-100">
				<div className="w-12 h-12 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin"></div>
			</div>
		);
	if (error) return <p className="text-red-500">{error}</p>;

	return (
		<div className="flex flex-col items-center justify-start min-h-screen p-8 gap-8 text-gray-700">
			<h1 className="flex flex-row flex-wrap text-3xl font-bold text-center justify-center items-center gap-4">
				{teamLogo && (
					<Image
						src={teamLogo}
						alt={`${teamName} logo`}
						width={50}
						height={50}
						className="w-12 h-12 object-contain"
					/>
				)}
				{teamName} — Player Stats
			</h1>

			<div className="flex gap-4 flex-wrap w-full max-w-4xl justify-center">
				<Link
					href="/"
					className="text-gray-700 bg-neutral-50 shadow-sm px-4 py-2 rounded"
				>
					← Back to Teams
				</Link>

				<div className="flex gap-4 items-center">
					<label>Sort by:</label>
					<select
						value={sortOption}
						onChange={(e) => setSortOption(e.target.value as SortOption)}
						className="text-gray-700 bg-neutral-50 shadow-sm px-4 py-2 rounded"
					>
						<option value="hit">Hit Probability</option>
						<option value="base">Base Probability</option>
					</select>

					<select
						value={sortOrder}
						onChange={(e) => setSortOrder(e.target.value as SortOrder)}
						className="text-gray-700 bg-neutral-50 shadow-sm px-4 py-2 rounded"
					>
						<option value="desc">Descending</option>
						<option value="asc">Ascending</option>
					</select>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-6xl mt-4">
				{sortedResults.map((p) => (
					<Link
						href={`/team/${teamId}/${p.id}`}
						key={p.id}
						className="cursor-pointer rounded-xl p-6 text-center bg-neutral-50 shadow hover:shadow-lg hover:scale-105 transition-transform"
					>
						<strong className="text-xl">{p.name}</strong>

						<hr className="border-gray-700 mt-1 mb-4" />

						<p className="text-lg font-semibold">
							Hit Probability:{" "}
							<span className="font-mono">
								{p.rawHitProbability.toFixed(3)}
							</span>
							{p.hitDue && <span className="text-green-400 ml-2">(Due)</span>}
						</p>

						<p className="text-lg font-semibold">
							Base Probability:{" "}
							<span className="font-mono">
								{p.rawBaseProbability.toFixed(3)}
							</span>
							{p.baseDue && <span className="text-orange-400 ml-2">(Due)</span>}
						</p>

						<p className="text-lg font-semibold">
							Trajectory: {getTrajectoryIcon(p.trajectory)}
						</p>
					</Link>
				))}
			</div>
		</div>
	);
}
