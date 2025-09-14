import { ArrowUpCircle, ArrowDownCircle, MinusCircle } from "lucide-react";
import PlayerChart from "@/components/PlayerChart";
import { getPlayerProbability } from "@/utils/probability";
import Link from "next/link";
import Image from "next/image";

type Props = {
	params: Promise<{
		teamId: string;
		playerId: string;
	}>;
};

export default async function PlayerPage({ params }: Props) {
	const { playerId, teamId } = await params;

	// Stats / probability data
	const data = await getPlayerProbability(parseInt(playerId));
	if (!data) return null;
	const { playerName, playerResult } = data;
	if (!playerResult) return null;

	// Player bio from MLB API
	const res = await fetch(
		`https://statsapi.mlb.com/api/v1/people/${playerId}`,
		{
			next: { revalidate: 60 * 60 }, // cache for 1h
		}
	);

	const json = await res.json();
	const player = json.people?.[0];

	// Calculate Age
	let age: number | null = null;
	if (player?.birthDate) {
		const birth = new Date(player.birthDate);
		const today = new Date();
		age =
			today.getFullYear() -
			birth.getFullYear() -
			(today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
				? 1
				: 0);
	}

	const getTrajectoryIcon = () => {
		switch (playerResult.trajectory) {
			case "up":
				return <ArrowUpCircle className="inline text-green-400 ml-2" />;
			case "down":
				return <ArrowDownCircle className="inline text-red-400 ml-2" />;
			default:
				return <MinusCircle className="inline text-gray-400 ml-2" />;
		}
	};

	return (
		<div className="flex flex-col items-center min-h-screen p-8 gap-8 bg-gray-100">
			<h1 className="text-3xl font-bold text-gray-800 flex flex-row flex-wrap gap-2 justify-center items-center">
				<Image
					src={`https://www.mlbstatic.com/team-logos/${teamId}.svg`}
					alt={`Team of ${playerName}`}
					width={50}
					height={50}
					className="w-12 h-12 object-contain"
				/>
				{playerName}
			</h1>

			<Link
				href={`/team/${teamId}`}
				className="text-gray-700 bg-neutral-50 shadow-sm px-4 py-2 rounded"
			>
				← Back to Team
			</Link>

			{/* New layout */}
			<div className="flex flex-col justify-stretch items-stretch md:flex-row gap-6 w-full max-w-6xl text-gray-700">
				{/* Left column: Bio + Probability */}
				<div className="flex flex-col gap-6 w-full md:w-1/3">
					{/* Bio card */}
					<div className="rounded-xl p-6 bg-white shadow grow">
						<h2 className="text-xl font-semibold mb-4">Player Bio</h2>
						<ul className="space-y-2">
							<li>
								<strong>Full Name:</strong> {player?.fullName}
							</li>
							<li>
								<strong>Position:</strong>{" "}
								{player?.primaryPosition?.abbreviation}
							</li>
							<li>
								<strong>Bats/Throws:</strong> {player?.batSide?.code} /{" "}
								{player?.pitchHand?.code}
							</li>
							<li>
								<strong>Height/Weight:</strong> {player?.height} /{" "}
								{player?.weight} lbs
							</li>
							<li>
								<strong>Birthdate:</strong> {player?.birthDate}
							</li>
							<li>
								<strong>Age:</strong> {age !== null ? age : "—"}
							</li>
						</ul>
					</div>

					{/* Probability card */}
					<div className="rounded-xl p-6 bg-white shadow text-center hover:shadow-lg hover:scale-105 transition-transform flex flex-col justify-center items-center grow">
						<p className="text-lg font-semibold">
							Hit Probability:{" "}
							<span className="font-mono">
								{playerResult.rawHitProbability.toFixed(3)}
							</span>
							{playerResult.hitDue && (
								<span className="text-green-500 ml-2">(Due)</span>
							)}
						</p>

						<p className="text-lg font-semibold mt-2">
							Base Probability:{" "}
							<span className="font-mono">
								{playerResult.rawBaseProbability.toFixed(3)}
							</span>
							{playerResult.baseDue && (
								<span className="text-orange-500 ml-2">(Due)</span>
							)}
						</p>

						<p className="text-lg font-semibold mt-2">
							Trajectory: {getTrajectoryIcon()}
						</p>
					</div>
				</div>

				{/* Right column: Chart */}
				<div className="rounded-xl p-6 bg-white shadow flex-1">
					<h2 className="text-xl font-semibold mb-4">Recent Performance</h2>
					<PlayerChart
						allRecentGames={playerResult.last30Games}
						nextHitProb={playerResult.rawHitProbability}
						nextBaseProb={playerResult.rawBaseProbability}
					/>
				</div>
			</div>
		</div>
	);
}
