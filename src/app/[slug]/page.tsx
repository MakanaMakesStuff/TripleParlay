import Team from "@/components/Team";
import { getGames } from "@/utils/endpoints";

export default async function TeamPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	// fetch all games for this team
	const { dates } = await getGames(Number(slug), new Date().getFullYear());

	const today = new Date();

	// flatten games for easier sorting/filtering
	const allGames = dates
		?.filter((game) => {
			const gameDate = new Date(game.date);
			return gameDate <= today; // only include games on or before today
		})
		?.flatMap((date) =>
			date.games.map((game) => ({
				...game,
				date: date.date,
			}))
		)
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return allGames && <Team slug={slug} allGames={allGames} />;
}
