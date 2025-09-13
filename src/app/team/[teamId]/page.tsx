"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getPlayerProbability, PlayerResult } from "@/utils/probability";
import { ArrowUpCircle, ArrowDownCircle, MinusCircle } from "lucide-react";

type SortOption = "hit" | "base";
type SortOrder = "asc" | "desc";

export default function TeamPage() {
	const params = useParams();
	const router = useRouter();
	const teamId = params.teamId;

	const [teamName, setTeamName] = useState<string>("");
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

	if (loading) return <p className="text-gray-400">Loading roster...</p>;
	if (error) return <p className="text-red-500">{error}</p>;

	return (
		<div className="flex flex-col items-center justify-start min-h-screen p-8 gap-8 bg-gray-900">
			<h1 className="text-3xl font-bold text-gray-50">
				{teamName} — Player Probabilities
			</h1>

			<div className="flex gap-4 flex-wrap w-full max-w-4xl justify-center">
				<button
					onClick={() => router.push("/")}
					className="bg-gray-700 text-gray-50 px-4 py-2 rounded hover:bg-gray-600"
				>
					← Back to Teams
				</button>

				<div className="flex gap-4 items-center text-gray-50">
					<label>Sort by:</label>
					<select
						value={sortOption}
						onChange={(e) => setSortOption(e.target.value as SortOption)}
						className="bg-gray-700 text-gray-50 px-2 py-1 rounded"
					>
						<option value="hit">Hit Probability</option>
						<option value="base">Base Probability</option>
					</select>

					<select
						value={sortOrder}
						onChange={(e) => setSortOrder(e.target.value as SortOrder)}
						className="bg-gray-700 text-gray-50 px-2 py-1 rounded"
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
						className="bg-gray-800 rounded-xl shadow p-4 flex flex-col gap-3 border border-gray-700 hover:shadow-lg hover:scale-105 transition-transform"
					>
						<strong className="text-xl text-gray-50">{p.name}</strong>
						<hr className="border-gray-700" />

						<p className="text-gray-50 text-lg font-semibold">
							Hit Probability:{" "}
							<span className="font-mono">
								{p.rawHitProbability.toFixed(3)}
							</span>
							{p.hitDue && <span className="text-green-400 ml-2">(Due)</span>}
						</p>

						<p className="text-gray-50 text-lg font-semibold">
							Base Probability:{" "}
							<span className="font-mono">
								{p.rawBaseProbability.toFixed(3)}
							</span>
							{p.baseDue && <span className="text-orange-400 ml-2">(Due)</span>}
						</p>

						<p className="text-gray-50 text-lg font-semibold">
							Trajectory: {getTrajectoryIcon(p.trajectory)}
						</p>
					</Link>
				))}
			</div>
		</div>
	);
}
