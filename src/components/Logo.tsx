"use client";
import Link from "next/link";
import logo from "../../public/logo.png";
import Image from "next/image";

export default function Logo() {
	return (
		<Link href="/">
			<Image
				src={logo.src}
				alt="Triple Parlay Logo"
				width={120}
				height={100}
				className="m-auto"
			/>
		</Link>
	);
}
