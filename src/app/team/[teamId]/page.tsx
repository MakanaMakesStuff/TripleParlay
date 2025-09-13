"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getPlayerProbability, PlayerResult } from "@/utils/probability";

type SortOption = "hitScore" | "baseScore";
type SortOrder = "asc" | "desc";
type DisplayStat = "hit" | "base";

export default function TeamPage() {
	const params = useParams();
	const router = useRouter();
	const teamId = params.teamId;

	const [teamName, setTeamName] = useState<string>("");
	const [results, setResults] = useState<PlayerResult[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showOddsModal, setShowOddsModal] = useState(false);

	const [sortOption, setSortOption] = useState<SortOption>("hitScore");
	const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
	const [displayStat, setDisplayStat] = useState<DisplayStat>("hit");

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
			const valA = sortOption === "hitScore" ? a.hitScore : a.baseScore;
			const valB = sortOption === "hitScore" ? b.hitScore : b.baseScore;
			return sortOrder === "asc" ? valA - valB : valB - valA;
		});
	}, [results, sortOption, sortOrder]);

	if (loading) return <p className="text-gray-400">Loading roster...</p>;
	if (error) return <p className="text-red-500">{error}</p>;

	return (
		<div className="flex flex-col items-center justify-start min-h-screen p-8 gap-8 bg-gray-900">
			<h1 className="text-3xl font-bold text-gray-50">
				{teamName} — Player Odds
			</h1>

			<div className="flex gap-4 flex-wrap">
				<div className="w-full flex gap-4 justify-center items-center">
					<button
						onClick={() => router.push("/")}
						className="bg-gray-700 text-gray-50 px-4 py-2 rounded hover:bg-gray-600"
					>
						← Back to Teams
					</button>
					<button
						onClick={() => setShowOddsModal(true)}
						className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-500"
					>
						Explain Odds
					</button>
				</div>

				{/* Sort options */}
				<div className="flex gap-4 justify-center items-center text-gray-50 w-full">
					<label>Sort by:</label>
					<select
						value={sortOption}
						onChange={(e) => setSortOption(e.target.value as SortOption)}
						className="bg-gray-700 text-gray-50 px-2 py-1 rounded"
					>
						<option value="hitScore">Hit Score</option>
						<option value="baseScore">Base Score</option>
					</select>

					<select
						value={sortOrder}
						onChange={(e) => setSortOrder(e.target.value as SortOrder)}
						className="bg-gray-700 text-gray-50 px-2 py-1 rounded"
					>
						<option value="desc">Descending</option>
						<option value="asc">Ascending</option>
					</select>

					<label>Display:</label>
					<select
						value={displayStat}
						onChange={(e) => setDisplayStat(e.target.value as DisplayStat)}
						className="bg-gray-700 text-gray-50 px-2 py-1 rounded"
					>
						<option value="hit">Hit</option>
						<option value="base">Base</option>
					</select>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-6xl mt-4">
				{sortedResults.map((p) => (
					<Link
						href={`/team/${teamId}/${p.id}`}
						key={p.name}
						className="bg-gray-800 rounded-xl shadow p-4 flex flex-col gap-2 border border-gray-700 hover:shadow-lg hover:scale-105 transition-transform"
					>
						<strong className="text-xl">{p.name}</strong>
						<hr />
						<p className="text-gray-50 text-lg font-semibold">
							{displayStat === "hit" ? "Hit Probability" : "Base Probability"}:{" "}
							<span className="font-mono">
								{displayStat === "hit"
									? p.rawHitProbability.toFixed(3)
									: p.rawBaseProbability.toFixed(3)}
							</span>{" "}
							{displayStat === "hit" && p.hitDue && (
								<span className="text-green-400 ml-2">(Due for a hit!)</span>
							)}
							{displayStat === "base" && p.baseDue && (
								<span className="text-orange-400 ml-2">(Due for a base!)</span>
							)}
						</p>

						<p className="text-gray-50 text-lg font-semibold">
							Hit Score: <span className="text-green-600">{p.hitScore}</span>
						</p>
						<p className="text-gray-50 text-lg font-semibold">
							Base Score: <span className="text-orange-600">{p.baseScore}</span>
						</p>
						<p className="text-gray-50 text-lg font-semibold">
							Hit Odds:{" "}
							<span className="font-mono">
								{p.hitOdds > 0 ? `+${p.hitOdds}` : p.hitOdds}
							</span>
						</p>
						<p className="text-gray-50 text-lg font-semibold">
							Base Odds:{" "}
							<span className="font-mono">
								{p.baseOdds > 0 ? `+${p.baseOdds}` : p.baseOdds}
							</span>
						</p>
						<p className="text-gray-50 text-lg font-semibold">
							Trajectory:{" "}
							<span className="font-mono">{p.trajectory.toUpperCase()}</span>
						</p>
					</Link>
				))}
			</div>

			{/* Odds Modal */}
			{showOddsModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6 relative">
						<h2 className="text-2xl font-bold mb-4 text-gray-50">
							Understanding the Odds
						</h2>
						<p className="text-gray-400 mb-4">
							The "Hit Probability" and "Base Probability" are calculated using
							player stats like OBP, SLG, plate appearances, and recent form.
							These are converted into a 1–5 score where 1 is less likely and 5
							is most likely. The "Hit Odds" and "Base Odds" represent
							American-style betting odds derived from each probability.
						</p>
						<button
							onClick={() => setShowOddsModal(false)}
							className="absolute top-4 right-4 text-gray-400 hover:text-gray-50 font-bold text-lg"
						>
							×
						</button>
						<button
							onClick={() => setShowOddsModal(false)}
							className="mt-4 bg-gray-700 text-gray-50 px-4 py-2 rounded hover:bg-gray-600"
						>
							Close
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
