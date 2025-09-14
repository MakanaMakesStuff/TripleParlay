"use client";

import { useState } from "react";
import { PlayerGameStats } from "@/utils/probability";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	CartesianGrid,
} from "recharts";

type PlayerChartProps = {
	allRecentGames: PlayerGameStats[]; // should include at least 30
	nextHitProb: number; // fraction
	nextBaseProb: number; // fraction
};

export default function PlayerChart({
	allRecentGames,
	nextHitProb,
	nextBaseProb,
}: PlayerChartProps) {
	const [view, setView] = useState<"7" | "30">("7");

	// Slice the games depending on the toggle
	const recentGames =
		view === "7" ? allRecentGames?.slice(-7) : allRecentGames?.slice(-30);

	const chartData = recentGames.map((g) => ({
		...g,
		formattedDate: new Date(g.date).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		}),
	}));

	const hitPercent = (nextHitProb * 100).toFixed(1);
	const basePercent = (nextBaseProb * 100).toFixed(1);

	return (
		<div className="w-full max-w-2xl bg-gray-800 rounded-xl shadow p-4 pb-10 border border-gray-700 mt-6">
			<h3 className="text-gray-50 font-semibold mb-4 text-center">
				Game Performance
			</h3>

			{/* Toggle buttons */}
			<div className="flex justify-center gap-4 mb-4">
				<button
					onClick={() => setView("7")}
					className={`px-4 py-1 rounded-lg font-medium ${
						view === "7"
							? "bg-green-600 text-white"
							: "bg-gray-700 text-gray-300 hover:bg-gray-600"
					}`}
				>
					Last 7 Games
				</button>
				<button
					onClick={() => setView("30")}
					className={`px-4 py-1 rounded-lg font-medium ${
						view === "30"
							? "bg-green-600 text-white"
							: "bg-gray-700 text-gray-300 hover:bg-gray-600"
					}`}
				>
					Last 30 Games
				</button>
			</div>

			<div className="flex justify-center gap-6 mb-4">
				<p className="text-green-400 font-semibold text-lg">
					Next Game Hit Odds: {hitPercent}%
				</p>
				<p className="text-orange-400 font-semibold text-lg">
					Next Game Base Odds: {basePercent}%
				</p>
			</div>

			<ResponsiveContainer width="100%" height={300}>
				<LineChart
					data={chartData}
					margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
				>
					<CartesianGrid stroke="#444" strokeDasharray="3 3" />
					<XAxis
						dataKey="formattedDate"
						stroke="#aaa"
						tick={{ fontSize: 12 }}
						tickMargin={10}
						height={40}
						padding={{ left: 10, right: 10 }}
					/>
					<YAxis stroke="#aaa" />
					<Tooltip
						contentStyle={{
							backgroundColor: "#222",
							border: "none",
							color: "#fff",
						}}
					/>
					<Line
						type="monotone"
						dataKey="hits"
						stroke="#00ff00"
						strokeWidth={2}
					/>
					<Line
						type="monotone"
						dataKey="bases"
						stroke="#ff9900"
						strokeWidth={2}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
