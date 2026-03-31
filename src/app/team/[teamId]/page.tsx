"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getPlayerProbability, PlayerResult } from "@/utils/probability";
import { ArrowUpCircle, ArrowDownCircle, MinusCircle } from "lucide-react";
import Image from "next/image";

// 1. Added new sort options
type SortOption = "hit" | "base" | "hr" | "k" | "bb";
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
					`https://statsapi.mlb.com/api/v1/teams/${teamId}`,
				);
				const teamJson = await teamRes.json();
				setTeamName(teamJson.teams?.[0]?.name || "Team");
				setTeamLogo(
					`https://www.mlbstatic.com/team-logos/${teamJson.teams?.[0]?.id}.svg`,
				);

				const rosterRes = await fetch(
					`https://statsapi.mlb.com/api/v1/teams/${teamId}/roster`,
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
							innerErr,
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

	// 2. Updated sorting logic to account for the new stats
	const sortedResults = useMemo(() => {
		return [...results].sort((a, b) => {
			let valA = 0;
			let valB = 0;

			switch (sortOption) {
				case "hit":
					valA = a.rawHitProbability;
					valB = b.rawHitProbability;
					break;
				case "base":
					valA = a.rawBaseProbability;
					valB = b.rawBaseProbability;
					break;
				case "hr":
					valA = a.rawHrProbability;
					valB = b.rawHrProbability;
					break;
				case "k":
					valA = a.rawKProbability;
					valB = b.rawKProbability;
					break;
				case "bb":
					valA = a.rawBbProbability;
					valB = b.rawBbProbability;
					break;
			}

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
						{/* 3. Added new drop down options */}
						<option value="hit">Hit Probability</option>
						<option value="base">Base Probability</option>
						<option value="hr">HR Rate</option>
						<option value="k">Strikeout Rate</option>
						<option value="bb">Walk Rate</option>
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
						className="cursor-pointer rounded-xl p-6 text-center bg-neutral-50 shadow hover:shadow-lg hover:scale-105 transition-transform flex flex-col justify-between"
					>
						<div>
							<strong className="text-xl">{p.name}</strong>

							<hr className="border-gray-300 mt-2 mb-4" />

							<p className="text-lg font-semibold">
								Hit Probability:{" "}
								<span className="font-mono text-gray-800">
									{p.rawHitProbability.toFixed(3)}
								</span>
								{p.hitDue && (
									<span className="text-green-500 ml-2 text-sm">(Due)</span>
								)}
							</p>

							<p className="text-lg font-semibold mt-1">
								Base Probability:{" "}
								<span className="font-mono text-gray-800">
									{p.rawBaseProbability.toFixed(3)}
								</span>
								{p.baseDue && (
									<span className="text-orange-500 ml-2 text-sm">(Due)</span>
								)}
							</p>

							<p className="text-md font-semibold mt-2 text-gray-600 flex items-center justify-center">
								Trajectory: {getTrajectoryIcon(p.trajectory)}
							</p>
						</div>

						{/* 4. Formatted HR, K, and BB as percentages for readability */}
						<div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-gray-200">
							<div className="text-center">
								<div className="text-xs text-gray-400 uppercase tracking-wider">
									HR Rate
								</div>
								<div className="font-mono text-sm font-semibold text-gray-700">
									{(p.rawHrProbability * 100).toFixed(1)}%
								</div>
							</div>
							<div className="text-center border-l border-r border-gray-200">
								<div className="text-xs text-gray-400 uppercase tracking-wider">
									K Rate
								</div>
								<div className="font-mono text-sm font-semibold text-gray-700">
									{(p.rawKProbability * 100).toFixed(1)}%
								</div>
							</div>
							<div className="text-center">
								<div className="text-xs text-gray-400 uppercase tracking-wider">
									BB Rate
								</div>
								<div className="font-mono text-sm font-semibold text-gray-700">
									{(p.rawBbProbability * 100).toFixed(1)}%
								</div>
							</div>
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}
