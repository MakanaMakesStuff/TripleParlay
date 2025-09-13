import PlayerChart from "@/components/PlayerChart";
import { getPlayerProbability } from "@/utils/probability";

type Props = {
	params: {
		teamId: string;
		playerId: string;
	};
};

export default async function PlayerPage({ params }: Props) {
	const { teamId, playerId } = params;

	const { playerName, playerResult } = await getPlayerProbability(
		parseInt(playerId)
	);

	if (!playerName || !playerResult) return;

	return (
		<div className="flex flex-col items-center justify-start min-h-screen p-8 gap-8 bg-gray-900">
			<h1 className="text-3xl font-bold text-gray-50">{playerName}</h1>

			<div className="bg-gray-800 rounded-xl shadow p-6 w-full max-w-md flex flex-col gap-4 mt-4 border border-gray-700">
				<p className="text-gray-50 text-lg font-semibold">
					Hit Probability:{" "}
					<span className="font-mono">
						{playerResult?.rawHitProbability.toFixed(3)}
					</span>{" "}
					{playerResult.hitDue && (
						<span className="text-green-400 ml-2">(Due for a hit!)</span>
					)}
				</p>
				<p className="text-gray-50 text-lg font-semibold">
					Base Probability:{" "}
					<span className="font-mono">
						{playerResult.rawBaseProbability.toFixed(3)}
					</span>{" "}
					{playerResult.baseDue && (
						<span className="text-orange-400 ml-2">(Due for a base!)</span>
					)}
				</p>
				<p className="text-gray-50 text-lg font-semibold">
					Hit Score:{" "}
					<span className="text-green-600">{playerResult.hitScore}</span>
				</p>
				<p className="text-gray-50 text-lg font-semibold">
					Base Score:{" "}
					<span className="text-orange-600">{playerResult.baseScore}</span>
				</p>
				<p className="text-gray-50 text-lg font-semibold">
					Hit Odds:{" "}
					<span className="font-mono">
						{playerResult.hitOdds > 0
							? `+${playerResult.hitOdds}`
							: playerResult.hitOdds}
					</span>
				</p>
				<p className="text-gray-50 text-lg font-semibold">
					Base Odds:{" "}
					<span className="font-mono">
						{playerResult.baseOdds > 0
							? `+${playerResult.baseOdds}`
							: playerResult.baseOdds}
					</span>
				</p>
				<p className="text-gray-50 text-lg font-semibold">
					Trajectory:{" "}
					<span className="font-mono">
						{playerResult.trajectory.toUpperCase()}
					</span>
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
