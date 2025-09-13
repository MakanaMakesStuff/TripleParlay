"use client";
import logo from "../../public/logo.png";
import Image from "next/image";

export default function Logo() {
	return (
		<Image
			src={logo.src}
			alt="Triple Parlay Logo"
			width={120}
			height={100}
			className="m-auto"
		/>
	);
}
