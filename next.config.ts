import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https", // optional but recommended
				hostname: "www.mlbstatic.com",
				pathname: "/**", // allows all paths under this host
			},
		],
	},
};

export default nextConfig;
