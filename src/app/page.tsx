/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Team = {
	id: number;
	name: string;
	abbreviation: string;
	logoUrl?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Game = any; // You can strictly type this later if you want

export default function Home() {
	const [view, setView] = useState<"schedule" | "teams">("schedule");

	const [teams, setTeams] = useState<Team[]>([]);
	const [games, setGames] = useState<Game[]>([]);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchDashboardData() {
			try {
				setLoading(true);
				const currentYear = new Date().getFullYear();

				// 1. Fetch All Teams (Your existing code)
				const teamsRes = await fetch(
					`https://statsapi.mlb.com/api/v1/teams?sportId=1&season=${currentYear}`,
				);
				const teamsJson = await teamsRes.json();

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const parsedTeams = teamsJson.teams.map((t: any) => ({
					id: t.id,
					name: t.name,
					abbreviation: t.abbreviation,
					logoUrl: `https://www.mlbstatic.com/team-logos/${t.id}.svg`,
				}));
				setTeams(parsedTeams);

				// 2. Fetch Today's Schedule (New code)
				const schedRes = await fetch(
					`https://statsapi.mlb.com/api/v1/schedule?sportId=1`,
				);
				const schedJson = await schedRes.json();
				setGames(schedJson.dates?.[0]?.games || []);

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} catch (err: any) {
				console.error(err);
				setError("Failed to load dashboard data");
			} finally {
				setLoading(false);
			}
		}
		fetchDashboardData();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-50">
				<div className="w-12 h-12 border-4 border-gray-300 border-t-green-600 rounded-full animate-spin"></div>
			</div>
		);
	}

	if (error) return <p className="text-red-500 text-center mt-10">{error}</p>;

	return (
		<div className="flex flex-col items-center justify-start min-h-screen p-8 gap-8 bg-gray-50 text-gray-700">
			{/* Header & Toggle */}
			<div className="w-full max-w-6xl flex flex-col items-center gap-6 mb-4">
				<div className="text-center">
					<h1 className="text-4xl font-black text-gray-900 tracking-tight">
						Triple Parlay
					</h1>
					<p className="text-lg text-gray-500 mt-1 font-medium">
						Daily Prop Research
					</p>
				</div>

				<div className="flex bg-gray-200 p-1 rounded-lg">
					<button
						onClick={() => setView("schedule")}
						className={`px-6 py-2 rounded-md font-semibold transition-colors ${
							view === "schedule"
								? "bg-white text-gray-900 shadow-sm"
								: "text-gray-500 hover:text-gray-700"
						}`}
					>
						Today's Games
					</button>
					<button
						onClick={() => setView("teams")}
						className={`px-6 py-2 rounded-md font-semibold transition-colors ${
							view === "teams"
								? "bg-white text-gray-900 shadow-sm"
								: "text-gray-500 hover:text-gray-700"
						}`}
					>
						All Teams
					</button>
				</div>
			</div>

			{/* --- VIEW: TODAY'S GAMES --- */}
			{view === "schedule" && (
				<div className="w-full max-w-6xl">
					{games.length === 0 ? (
						<div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-200 text-center">
							<p className="text-xl text-gray-500 font-medium">
								No games scheduled for today.
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{games.map((game) => {
								const awayTeam = game.teams.away.team;
								const homeTeam = game.teams.home.team;

								const gameTime = new Date(game.gameDate).toLocaleTimeString(
									[],
									{
										hour: "numeric",
										minute: "2-digit",
										timeZoneName: "short",
									},
								);

								const awaySp =
									game.teams.away.probablePitcher?.fullName ?? "TBD";
								const homeSp =
									game.teams.home.probablePitcher?.fullName ?? "TBD";

								return (
									<Link
										href={`/game/${game.gamePk}`}
										key={game.gamePk}
										className="bg-white rounded-xl shadow border border-gray-100 p-5 hover:shadow-lg hover:scale-[1.02] transition-transform flex flex-col justify-between h-full group"
									>
										<div>
											<div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
												<span className="text-xs font-bold uppercase tracking-wider text-gray-400">
													{game.status.abstractGameState}
												</span>
												<span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
													{gameTime}
												</span>
											</div>

											{/* Away Team */}
											<div className="flex items-center justify-between mb-3">
												<div className="flex items-center gap-3">
													<Image
														src={`https://www.mlbstatic.com/team-logos/${awayTeam.id}.svg`}
														alt={awayTeam.name}
														width={30}
														height={30}
														className="w-8 h-8 object-contain drop-shadow-sm"
													/>
													<span className="font-bold text-lg text-gray-800">
														{awayTeam.name}
													</span>
												</div>
											</div>

											{/* Home Team */}
											<div className="flex items-center justify-between mb-4">
												<div className="flex items-center gap-3">
													<Image
														src={`https://www.mlbstatic.com/team-logos/${homeTeam.id}.svg`}
														alt={homeTeam.name}
														width={30}
														height={30}
														className="w-8 h-8 object-contain drop-shadow-sm"
													/>
													<span className="font-bold text-lg text-gray-800">
														{homeTeam.name}
													</span>
												</div>
											</div>
										</div>

										{/* Probable Pitchers Preview */}
										<div className="bg-gray-50 rounded-lg p-3 mt-2 border border-gray-100 group-hover:border-green-200 transition-colors">
											<div className="text-xs text-gray-500 flex justify-between mb-1">
												<span className="truncate pr-2">
													<span className="font-bold text-gray-700">
														AWAY SP:
													</span>{" "}
													{awaySp}
												</span>
											</div>
											<div className="text-xs text-gray-500 flex justify-between">
												<span className="truncate pr-2">
													<span className="font-bold text-gray-700">
														HOME SP:
													</span>{" "}
													{homeSp}
												</span>
											</div>
										</div>
									</Link>
								);
							})}
						</div>
					)}
				</div>
			)}

			{/* --- VIEW: ALL TEAMS --- */}
			{view === "teams" && (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 w-full max-w-6xl">
					{teams.map((team) => (
						<Link key={team.id} href={`/team/${team.id}`}>
							<div className="cursor-pointer rounded-xl p-6 text-center bg-white shadow border border-gray-100 hover:shadow-lg hover:scale-105 transition-transform flex flex-col h-full justify-center items-center">
								{team.logoUrl && (
									<Image
										src={team.logoUrl}
										alt={team.name}
										width={100}
										height={100}
										className="mx-auto h-16 w-16 object-contain mb-3 drop-shadow-sm"
									/>
								)}
								<p className="text-xl font-bold text-gray-800">
									{team.abbreviation}
								</p>
								<p className="mt-1 text-xs text-gray-500 font-medium px-2">
									{team.name}
								</p>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
