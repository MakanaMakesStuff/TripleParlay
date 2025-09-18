"use client";

import { usePathname } from "next/navigation";
import Logo from "./Logo";

export default function Header() {
	const pathname = usePathname();

	return (
		<>
			<div className="sticky top-0 left-0 px-4 bg-white shadow">
				<div
					className={
						pathname == "/"
							? "flex flex-row justify-center"
							: "grid grid-cols-3 items-center w-full m-auto max-w-[900px]"
					}
				>
					{pathname != "/" && (
						<div className="w-full max-w-[1000px] mb-4">
							<button
								className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 cursor-pointer"
								onClick={() => window.history.back()}
							>
								← Back
							</button>
						</div>
					)}

					<Logo />
				</div>
			</div>
		</>
	);
}
