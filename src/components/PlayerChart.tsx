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
	Legend,
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

	// --- DYNAMIC ASSESSMENT LOGIC ---
	// We base the written assessment on the last 7 games to keep it highly relevant to their current form
	const last7 = allRecentGames?.slice(-7) || [];
	const totalHits7 = last7.reduce((sum, g) => sum + g.hits, 0);
	const totalPa7 = last7.reduce((sum, g) => sum + g.pa, 0);
	const totalK7 = last7.reduce((sum, g) => sum + g.k, 0);
	const totalHr7 = last7.reduce((sum, g) => sum + g.hr, 0);

	// Format batting average without the leading zero (e.g., .275)
	const avg7 =
		totalPa7 > 0
			? (totalHits7 / totalPa7).toFixed(3).replace(/^0+/, "")
			: ".000";

	let contactText = "";
	if (nextHitProb >= 0.3) contactText = "excellent contact potential";
	else if (nextHitProb >= 0.22) contactText = "solid chances to get a hit";
	else contactText = "a cold streak at the plate";

	let powerText = "";
	if (nextBaseProb >= 0.4) powerText = "strong extra-base upside";
	else if (nextBaseProb >= 0.25) powerText = "moderate power potential";
	else powerText = "limited extra-base projections";

	let plateDisciplineText = "";
	if (totalK7 > 7)
		plateDisciplineText = `Swing-and-miss is a concern right now with ${totalK7} strikeouts in their last ${last7.length} games.`;
	else if (totalK7 <= 3 && totalPa7 > 10)
		plateDisciplineText = `They are showing excellent plate discipline, striking out just ${totalK7} times in their last ${last7.length} games.`;
	else
		plateDisciplineText = `Strikeout rates remain steady (${totalK7} Ks in last ${last7.length} games).`;

	let hrText = "";
	if (totalHr7 > 1)
		hrText = ` Keep an eye on their power, as they've smashed ${totalHr7} home runs in this short span.`;
	else if (totalHr7 === 1)
		hrText = ` They've also recorded 1 home run in this span.`;

	return (
		<div className="w-full max-w-2xl bg-gray-800 rounded-xl shadow p-4 pb-6 border border-gray-700 mt-6 flex flex-col h-full">
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
					Hit Odds: {hitPercent}%
				</p>
				<p className="text-orange-400 font-semibold text-lg">
					Base Odds: {basePercent}%
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
							borderRadius: "8px",
						}}
						itemStyle={{ color: "#fff" }}
					/>
					<Legend wrapperStyle={{ paddingTop: "10px" }} />

					<Line
						type="monotone"
						dataKey="hits"
						name="Hits"
						stroke="#00ff00"
						strokeWidth={2}
					/>
					<Line
						type="monotone"
						dataKey="bases"
						name="Total Bases"
						stroke="#ff9900"
						strokeWidth={2}
					/>
					<Line
						type="monotone"
						dataKey="hr"
						name="Home Runs"
						stroke="#ef4444"
						strokeWidth={2}
					/>
					<Line
						type="monotone"
						dataKey="k"
						name="Strikeouts"
						stroke="#3b82f6"
						strokeWidth={2}
					/>
					<Line
						type="monotone"
						dataKey="bb"
						name="Walks"
						stroke="#a855f7"
						strokeWidth={2}
					/>
				</LineChart>
			</ResponsiveContainer>

			{/* --- AI/Data Assessment Box --- */}
			<div className="mt-8 bg-gray-900/50 rounded-lg p-5 border border-gray-700">
				<h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">
					Performance Assessment
				</h4>
				<p className="text-gray-300 leading-relaxed text-sm sm:text-base">
					Based on the latest data, expect <strong>{contactText}</strong> and{" "}
					<strong>{powerText}</strong> in the upcoming matchup. Over the last 7
					games, they are hitting <strong>{avg7}</strong>. {plateDisciplineText}
					{hrText}
				</p>
			</div>
		</div>
	);
}
