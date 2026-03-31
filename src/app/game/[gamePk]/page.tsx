/* eslint-disable @typescript-eslint/no-explicit-any */
import Image from "next/image";
import Link from "next/link";
import { getStartingPitcherStats, StartingPitcher } from "@/utils/pitching";
import { getPlayerProbability, PlayerResult } from "@/utils/probability";
import { ArrowRightCircle } from "lucide-react";

type Props = {
	params: Promise<{ gamePk: string }>;
};

// Helper component to display pitcher stats side-by-side
function PitcherCard({
	pitcher,
	label,
}: {
	pitcher: StartingPitcher | null;
	label: string;
}) {
	if (!pitcher)
		return (
			<div className="rounded-xl p-6 bg-gray-50 text-center text-gray-400 border border-gray-200 w-full grow flex items-center justify-center">
				Probable SP Not Listed ({label})
			</div>
		);

	return (
		<div className="rounded-xl p-6 bg-white shadow grow border border-gray-100 flex flex-col justify-between w-full">
			<div>
				<span className="text-xs uppercase text-gray-400 tracking-wider font-bold">
					{label} - {pitcher.teamName}
				</span>
				<h2 className="text-2xl font-bold text-gray-800 mt-1 mb-4">
					{pitcher.name}
				</h2>
				<div className="grid grid-cols-4 gap-4 text-center">
					<div>
						<div className="text-xs text-gray-500">ERA</div>
						<div className="text-xl font-semibold font-mono">
							{pitcher.era.toFixed(2)}
						</div>
					</div>
					<div>
						<div className="text-xs text-gray-500">WHIP</div>
						<div className="text-xl font-semibold font-mono">
							{pitcher.whip.toFixed(2)}
						</div>
					</div>
					<div>
						<div className="text-xs text-gray-500">K Rate</div>
						<div className="text-xl font-semibold font-mono text-green-500">
							{(pitcher.kPct * 100).toFixed(1)}%
						</div>
					</div>
					<div>
						<div className="text-xs text-gray-500">K/9</div>
						<div className="text-xl font-semibold font-mono">
							{pitcher.k9.toFixed(1)}
						</div>
					</div>
				</div>
			</div>
			<Link
				href={`/team/${pitcher.teamId}/${pitcher.id}`}
				className="mt-6 text-sm text-center text-gray-500 hover:text-green-600 block transition-colors"
			>
				View Pitcher Details &rarr;
			</Link>
		</div>
	);
}

// Compact UI card to display probability target results in Matchup View
function TopTargetCard({
	player,
	teamId,
}: {
	player: PlayerResult;
	teamId: string;
}) {
	const hitPercent = (player.rawHitProbability * 100).toFixed(1);
	const hrPercent = (player.rawHrProbability * 100).toFixed(1);

	return (
		<Link
			href={`/team/${teamId}/${player.id}`}
			className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-green-200 transition-all group"
		>
			<div className="flex flex-col">
				<span className="font-bold text-gray-800 text-lg group-hover:text-green-700 transition-colors">
					{player.name}
				</span>
				<div className="flex gap-4 text-sm text-gray-500 mt-1">
					<span className="font-medium text-green-600">Hit: {hitPercent}%</span>
					<span className="font-medium text-red-500">HR: {hrPercent}%</span>
					{player.hitDue && (
						<span className="italic text-gray-400 ml-1">(Due)</span>
					)}
				</div>
			</div>
			<ArrowRightCircle className="text-gray-300 w-6 h-6 group-hover:text-green-500 transition-colors" />
		</Link>
	);
}

export default async function GamePage({ params }: Props) {
	const { gamePk } = await params;

	// --- 1. Fetch Game Context ---
	const gameRes = await fetch(
		`https://statsapi.mlb.com/api/v1/schedule?gamePk=${gamePk}`,
	);
	const gameJson = await gameRes.json();
	const gameData = gameJson.dates?.[0]?.games?.[0];

	if (!gameData)
		return (
			<div className="p-8 text-center text-red-500 font-bold">
				Game data not found.
			</div>
		);

	const stadiumName = gameData.venue?.name;
	const date = new Date(gameData.gameDate);
	const gameTime = date.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
		timeZoneName: "short",
	});

	// --- 2. Identify Probable starting pitchers ---
	const awaySpId = gameData.teams?.away?.probablePitcher?.id;
	const homeSpId = gameData.teams?.home?.probablePitcher?.id;

	const awaySp = awaySpId ? await getStartingPitcherStats(awaySpId) : null;
	const homeSp = homeSpId ? await getStartingPitcherStats(homeSpId) : null;

	// --- 3. Fetch Full Rosters as proxy lineups ---
	const awayTeamId = gameData.teams.away.team.id;
	const homeTeamId = gameData.teams.home.team.id;

	const [awayRosterRes, homeRosterRes] = await Promise.all([
		fetch(`https://statsapi.mlb.com/api/v1/teams/${awayTeamId}/roster`),
		fetch(`https://statsapi.mlb.com/api/v1/teams/${homeTeamId}/roster`),
	]);

	const awayRosterJson = await awayRosterRes.json();
	const homeRosterJson = await homeRosterRes.json();

	// Filter out pitchers (pos code 1) from the rosters
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const awayHitters = (awayRosterJson.roster ?? []).filter(
		(p: any) => p.position.code !== "1",
	);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const homeHitters = (homeRosterJson.roster ?? []).filter(
		(p: any) => p.position.code !== "1",
	);

	// --- 4. Run MATCHUP Probability Algorithm (CONCURRENTLY) ---
	// Away hitters face Home Pitcher, Home hitters face Away Pitcher.
	const awayHitPromises = awayHitters.map((player: any) =>
		getPlayerProbability(player.person.id, homeSp?.kPct),
	);
	const homeHitPromises = homeHitters.map((player: any) =>
		getPlayerProbability(player.person.id, awaySp?.kPct),
	);

	const awayResultsRaw = await Promise.all(awayHitPromises);
	const homeResultsRaw = await Promise.all(homeHitPromises);

	// Filter valid results and sort descending by your custom hitScore
	const awayHitMatches = awayResultsRaw
		.map((res) => res.playerResult)
		.filter((res): res is PlayerResult => res !== null)
		.sort((a, b) => b.hitScore - a.hitScore);

	const homeHitMatches = homeResultsRaw
		.map((res) => res.playerResult)
		.filter((res): res is PlayerResult => res !== null)
		.sort((a, b) => b.hitScore - a.hitScore);

	return (
		<div className="flex flex-col items-center min-h-screen p-8 gap-10 bg-gray-50 text-gray-700">
			<div className="w-full max-w-7xl">
				<Link
					href="/"
					className="text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
				>
					&larr; Back to Schedule
				</Link>
			</div>

			{/* Game Header */}
			<div className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-white rounded-2xl shadow-sm border border-gray-200">
				<div className="flex flex-row items-center gap-8">
					<Image
						src={`https://www.mlbstatic.com/team-logos/${awayTeamId}.svg`}
						alt="Away Logo"
						width={80}
						height={80}
						className="w-24 h-24 object-contain drop-shadow-sm"
					/>
					<span className="text-4xl font-extrabold text-gray-300">@</span>
					<Image
						src={`https://www.mlbstatic.com/team-logos/${homeTeamId}.svg`}
						alt="Home Logo"
						width={80}
						height={80}
						className="w-24 h-24 object-contain drop-shadow-sm"
					/>
				</div>
				<div className="text-center md:text-right">
					<h1 className="text-4xl font-black text-gray-900 tracking-tight">
						{gameData.teams.away.team.name}{" "}
						<span className="text-gray-400 font-medium">at</span>{" "}
						{gameData.teams.home.team.name}
					</h1>
					<p className="text-lg text-gray-500 mt-2 font-medium">
						{stadiumName} &bull; {gameTime}
					</p>
				</div>
			</div>

			{/* Pitcher Duel Comparison */}
			<div className="w-full max-w-7xl flex flex-col md:flex-row gap-6 items-stretch justify-center">
				<PitcherCard pitcher={awaySp} label="Away Pitcher" />
				<div className="flex items-center justify-center text-3xl font-black text-gray-300 px-2 py-4 md:py-0">
					VS
				</div>
				<PitcherCard pitcher={homeSp} label="Home Pitcher" />
			</div>

			{/* Matchup Prop Targets */}
			<div className="w-full max-w-7xl mt-4">
				<h3 className="text-xl font-bold mb-6 text-gray-800 uppercase tracking-tight border-b pb-2">
					Top Matchup Prop Targets
				</h3>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-10">
					{/* Top Away Team Props */}
					<div className="bg-gray-100/50 p-6 rounded-xl border border-gray-200/60">
						<h4 className="flex flex-row items-center gap-3 text-lg font-bold mb-5 text-gray-800">
							<Image
								src={`https://www.mlbstatic.com/team-logos/${awayTeamId}.svg`}
								alt="Away Logo"
								width={24}
								height={24}
								className="w-7 h-7 object-contain"
							/>
							{gameData.teams.away.team.name} Hitters
							<span className="text-xs text-gray-500 font-medium ml-auto bg-white px-2 py-1 rounded shadow-sm">
								vs SP K%:{" "}
								{homeSp?.kPct ? (homeSp?.kPct * 100).toFixed(1) : "22.0"}%
							</span>
						</h4>
						<div className="space-y-3">
							{awayHitMatches.slice(0, 5).map((p) => (
								<TopTargetCard
									player={p}
									teamId={awayTeamId.toString()}
									key={p.id}
								/>
							))}
						</div>
					</div>

					{/* Top Home Team Props */}
					<div className="bg-gray-100/50 p-6 rounded-xl border border-gray-200/60">
						<h4 className="flex flex-row items-center gap-3 text-lg font-bold mb-5 text-gray-800">
							<Image
								src={`https://www.mlbstatic.com/team-logos/${homeTeamId}.svg`}
								alt="Home Logo"
								width={24}
								height={24}
								className="w-7 h-7 object-contain"
							/>
							{gameData.teams.home.team.name} Hitters
							<span className="text-xs text-gray-500 font-medium ml-auto bg-white px-2 py-1 rounded shadow-sm">
								vs SP K%:{" "}
								{awaySp?.kPct ? (awaySp?.kPct * 100).toFixed(1) : "22.0"}%
							</span>
						</h4>
						<div className="space-y-3">
							{homeHitMatches.slice(0, 5).map((p) => (
								<TopTargetCard
									player={p}
									teamId={homeTeamId.toString()}
									key={p.id}
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
