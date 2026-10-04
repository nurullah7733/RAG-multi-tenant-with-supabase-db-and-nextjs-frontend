"use client";

import Link from "next/link";

export default function DashboardError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-2xl space-y-4 px-6 py-12">
    <h1 className="text-xl font-semibold">Workspace temporarily unavailable</h1>
    <p>We could not load your organizations. Please try again.</p>
    <button onClick={reset} className="underline">Try again</button>
    <Link href="/dashboard" className="ml-4 underline">Dashboard</Link>
  </main>;
}
