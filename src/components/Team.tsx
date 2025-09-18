"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
	calculateAllTeamPerformances,
	normalizeAllPerformances,
} from "@/utils/teams";

export default function Team({
	slug,
	allGames,
}: {
	slug: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	allGames: any[];
}) {
	const [opponentFilter, setOpponentFilter] = useState<string>("all");
	const [resultFilter, setResultFilter] = useState<"all" | "win" | "loss">(
		"all"
	);
	const [teamPerformance, setTeamPerformance] = useState<
		Record<string, number>
	>({});
	const [showAnalysis, setShowAnalysis] = useState(false);

	// all unique opponents
	const opponents = useMemo(() => {
		const oppSet = new Set<string>();
		allGames.forEach((game) => {
			const isHome = game.teams.home.team.id === Number(slug);
			const oppName = isHome
				? game.teams.away.team.name
				: game.teams.home.team.name;
			oppSet.add(oppName);
		});
		return ["all", ...Array.from(oppSet)];
	}, [allGames, slug]);

	const processedGames = useMemo(() => {
		return allGames.filter((g) => {
			const isHome = g.teams.home.team.id === Number(slug);
			const teamSide = isHome ? g.teams.home : g.teams.away;
			const opponentSide = isHome ? g.teams.away : g.teams.home;

			// filter by opponent
			if (
				opponentFilter !== "all" &&
				opponentSide.team.name !== opponentFilter
			) {
				return false;
			}

			// filter by result
			if (resultFilter !== "all") {
				if (resultFilter === "win" && !teamSide.isWinner) return false;
				if (resultFilter === "loss" && teamSide.isWinner) return false;
			}

			return true;
		});
	}, [allGames, opponentFilter, resultFilter, slug]);

	const handleAnalyze = () => {
		// calculate performance for all teams
		const allPerformances = calculateAllTeamPerformances(allGames);
		const normalized = normalizeAllPerformances(allPerformances);

		// get the selected team's actual name
		const teamName =
			allGames.find(
				(g) =>
					g.teams.home.team.id === Number(slug) ||
					g.teams.away.team.id === Number(slug)
			)?.teams.home.team.id === Number(slug)
				? allGames.find(
						(g) =>
							g.teams.home.team.id === Number(slug) ||
							g.teams.away.team.id === Number(slug)
				  )!.teams.home.team.name
				: allGames.find(
						(g) =>
							g.teams.home.team.id === Number(slug) ||
							g.teams.away.team.id === Number(slug)
				  )!.teams.away.team.name;

		let performanceData: Record<string, number> = {};

		if (opponentFilter === "all") {
			// all matchups sorted descending
			performanceData = { ...normalized[teamName] };
			performanceData = Object.fromEntries(
				Object.entries(performanceData).sort(([, a], [, b]) => b - a)
			);
		} else {
			// single matchup
			const score = normalized[teamName]?.[opponentFilter];
			if (score !== undefined) performanceData = { [opponentFilter]: score };
		}

		setTeamPerformance(performanceData);
		setShowAnalysis(true);
	};

	return (
		<div className="flex flex-col justify-center p-4 w-full max-w-[900px] m-auto">
			{/* Header */}
			<div className="flex flex-col justify-center items-center mb-4">
				<Image
					src={`https://www.mlbstatic.com/team-logos/${slug}.svg`}
					alt={`${slug} Logo`}
					width={40}
					height={40}
					className="w-max h-12 object-cover"
				/>
				<h2 className="text-center mt-2 text-lg font-semibold">
					Previous Games
				</h2>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap gap-4 justify-center mb-6">
				<select
					value={opponentFilter}
					onChange={(e) => setOpponentFilter(e.target.value)}
					className="border rounded-md px-3 py-1 text-sm"
				>
					{opponents.map((opp) => (
						<option key={opp} value={opp}>
							{opp === "all" ? "All Opponents" : opp}
						</option>
					))}
				</select>

				<select
					value={resultFilter}
					onChange={(e) =>
						setResultFilter(e.target.value as "all" | "win" | "loss")
					}
					className="border rounded-md px-3 py-1 text-sm"
				>
					<option value="all">All Results</option>
					<option value="win">Wins Only</option>
					<option value="loss">Losses Only</option>
				</select>
			</div>

			{/* Analyze Button */}
			<div className="flex justify-center mb-6">
				<button
					className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
					onClick={handleAnalyze}
				>
					Analyze
				</button>
			</div>

			{showAnalysis && Object.keys(teamPerformance).length > 0 && (
				<div className="w-fill">
					<h3 className="text-center font-semibold mb-4">
						Team Matchup Performance
					</h3>

					<table className="w-full border-collapse border border-neutral-300">
						<thead>
							<tr className="bg-neutral-100">
								<th className="border px-2 py-1 text-left">Opponent</th>
								<th className="border px-2 py-1 text-left">Normalized Score</th>
							</tr>
						</thead>
						<tbody>
							{Object.entries(teamPerformance).map(([opp, score]) => (
								<tr key={opp}>
									<td className="border px-2 py-1">{opp}</td>
									<td className="border px-2 py-1">{score.toFixed(2)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<br />

			<div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-2 grid-cols-1 gap-3 m-auto mb-6 w-full">
				{processedGames.map((game, i) => {
					const isHome = game.teams.home.team.id === Number(slug);
					const teamSide = isHome ? game.teams.home : game.teams.away;
					const opponentSide = isHome ? game.teams.away : game.teams.home;

					const formattedDate = new Date(game.date).toLocaleDateString(
						"en-US",
						{
							month: "short",
							day: "numeric",
							year: "numeric",
						}
					);

					const teamAId = teamSide.team.id;
					const teamBId = opponentSide.team.id;

					return (
						<Link
							key={i}
							href={
								opponentFilter == "all"
									? ""
									: `/breakdown?teamA=${teamAId}&teamB=${teamBId}&gamePks=${encodeURIComponent(
											JSON.stringify(processedGames?.map((g) => g.gamePk))
									  )}`
							}
							className={`flex flex-col w-full p-3 gap-2 rounded-md shadow-sm bg-neutral-50 hover:scale-[1.02] transition-transform border-2 ${
								teamSide.isWinner ? "border-green-500" : "border-red-500"
							}`}
						>
							<span className="text-xs text-neutral-500">{formattedDate}</span>

							<div className="flex justify-between items-center text-sm font-medium gap-2">
								<div className="flex items-center gap-2">
									<Image
										src={`https://www.mlbstatic.com/team-logos/${slug}.svg`}
										alt={`${slug} Logo`}
										width={20}
										height={20}
										className="h-5 w-5"
									/>
									{teamSide.team.name}
								</div>
								<span className="text-base font-bold">{teamSide.score}</span>
							</div>

							<div className="flex justify-between items-center text-sm font-medium gap-2">
								<div className="flex items-center gap-2">
									<Image
										src={`https://www.mlbstatic.com/team-logos/${opponentSide.team.id}.svg`}
										alt={`${opponentSide.team.name} Logo`}
										width={20}
										height={20}
										className="h-5 w-5"
									/>
									{opponentSide.team.name}
								</div>
								<span className="text-base font-bold">
									{opponentSide.score}
								</span>
							</div>

							<div className="flex justify-between items-center mt-1">
								<span
									className={`text-xs ml-auto mr-0 font-semibold ${
										teamSide.isWinner ? "text-green-500" : "text-red-500"
									}`}
								>
									{teamSide.isWinner ? "Win" : "Loss"}
								</span>
							</div>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
