import { ArrowUpCircle, ArrowDownCircle, MinusCircle } from "lucide-react";
import PlayerChart from "@/components/PlayerChart";
import { getPlayerProbability } from "@/utils/probability";
import Link from "next/link";

type Props = {
	params: Promise<{
		teamId: string;
		playerId: string;
	}>;
};

export default async function PlayerPage({ params }: Props) {
	const { playerId, teamId } = await params;

	const data = await getPlayerProbability(parseInt(playerId));

	if (!data) return null;

	const { playerName, playerResult } = data;

	if (!playerResult) return null;

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
		<div className="flex flex-col items-center justify-start min-h-screen p-8 gap-8 bg-gray-900">
			<h1 className="text-3xl font-bold text-gray-50">{playerName}</h1>

			<Link
				href={`/team/${teamId}`}
				className="bg-gray-700 text-gray-50 px-4 py-2 rounded hover:bg-gray-600"
			>
				← Back to Team
			</Link>

			<div className="bg-gray-800 rounded-xl shadow p-6 w-full max-w-md flex flex-col gap-4 mt-4 border border-gray-700">
				<p className="text-gray-50 text-lg font-semibold">
					Hit Probability:{" "}
					<span className="font-mono">
						{playerResult.rawHitProbability.toFixed(3)}
					</span>
					{playerResult.hitDue && (
						<span className="text-green-400 ml-2">(Due)</span>
					)}
				</p>

				<p className="text-gray-50 text-lg font-semibold">
					Base Probability:{" "}
					<span className="font-mono">
						{playerResult.rawBaseProbability.toFixed(3)}
					</span>
					{playerResult.baseDue && (
						<span className="text-orange-400 ml-2">(Due)</span>
					)}
				</p>

				<p className="text-gray-50 text-lg font-semibold">
					Trajectory: {getTrajectoryIcon()}
				</p>
			</div>

			<PlayerChart
				recentGames={playerResult.recentGames}
				nextHitProb={playerResult.rawHitProbability}
				nextBaseProb={playerResult.rawBaseProbability}
			/>
		</div>
	);
}
