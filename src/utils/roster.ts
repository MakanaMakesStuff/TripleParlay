export async function getTeamRoster(teamId: number) {
	const res = await fetch(
		`https://statsapi.mlb.com/api/v1/teams/${teamId}/roster`
	);
	if (!res.ok) throw new Error("Failed to fetch roster");
	const data = await res.json();
	return data.roster.map((p: any) => ({
		id: p.person.id,
		name: p.person.fullName,
		position: p.position.abbreviation,
	}));
}
