// app/breakdown/page.tsx
import { Suspense } from "react";
import BreakdownPage from "@/components/BreakdownPage";

export default function Page() {
	return (
		<Suspense fallback={<div className="text-center mt-8">Loading breakdown...</div>}>
			<BreakdownPage />
		</Suspense>
	);
}
