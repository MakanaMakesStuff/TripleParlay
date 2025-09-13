"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Team = {
	id: number;
	name: string;
	abbreviation: string;
	logoUrl?: string;
};

export default function Home() {
	const [teams, setTeams] = useState<Team[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchTeams() {
			try {
				const res = await fetch(
					"https://statsapi.mlb.com/api/v1/teams?sportId=1&season=2025"
				);
				const json = await res.json();
				setTeams(
					json.teams.map((t: any) => ({
						id: t.id,
						name: t.name,
						abbreviation: t.abbreviation,
						logoUrl:
							t.teamLogoUrl ||
							`https://www.mlbstatic.com/team-logos/${t.id}.svg`,
					}))
				);
			} catch (err: any) {
				console.error(err);
				setError("Failed to load teams");
			} finally {
				setLoading(false);
			}
		}
		fetchTeams();
	}, []);

	if (loading) return <p className="text-gray-400">Loading teams...</p>;
	if (error) return <p className="text-red-500">{error}</p>;

	return (
		<div className="flex flex-col items-center justify-start min-h-screen p-8 gap-8 bg-gray-900">
			<h1 className="text-3xl font-bold text-gray-50 mb-4">
				Triple Parlay — Select a Team
			</h1>

			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 w-full max-w-6xl">
				{teams.map((team) => (
					<Link key={team.id} href={`/team/${team.id}`}>
						<div className="cursor-pointer rounded-xl p-6 text-center bg-gray-800 shadow hover:shadow-lg hover:scale-105 transition-transform border border-gray-700">
							{team.logoUrl && (
								<img
									src={team.logoUrl}
									alt={team.name}
									className="mx-auto h-16 w-16 object-contain mb-2"
								/>
							)}
							<p className="text-xl font-bold text-gray-50">
								{team.abbreviation}
							</p>
							<p className="mt-1 text-sm text-gray-400">{team.name}</p>
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}
