import { getTeams } from "@/utils/endpoints";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
	const { teams } = await getTeams();

	return (
		<div className="flex flex-col justify-center p-4">
			<h2 className="text-center">Select a team</h2>

			<br />

			<div className="grid lg:grid-cols-4 md:grid-cols-3 grid-cols-2 gap-4 w-full max-w-[800px] m-auto">
				{teams?.map((team, i) => (
					<Link
						href={`/${team.id}`}
						className="flex flex-col w-full h-auto min-h-max aspect-square m-auto justify-center items-center p-4 gap-4 rounded-md shadow-md bg-neutral-50 hover:scale-105 transition-transform"
						key={i}
					>
						<Image
							src={`https://www.mlbstatic.com/team-logos/${team.id}.svg`}
							alt={`${team.teamName} Logo`}
							width={25}
							height={25}
							className="w-max h-24 object-cover"
						/>

						<span>{team.teamName}</span>
					</Link>
				))}
			</div>
		</div>
	);
}
