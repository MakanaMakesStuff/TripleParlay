// /pages/api/playerGameLog.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { playerId } = req.query;

	const url = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats/gameLog?season=2025&gameType=R&hydrate=${encodeURIComponent(
		"stats(group=[hitting],type=gameLog)"
	)}`;

	try {
		const response = await fetch(url);
		const data = await response.json();
		res.status(200).json(data);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (err: any) {
		res.status(500).json({ error: err.message });
	}
}
