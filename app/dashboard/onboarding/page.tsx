import Link from "next/link";
import { organizationApi } from "@/lib/api/organizations";
import { OnboardingForm } from "@/components/organizations/onboarding-form";

export default async function OnboardingPage() {
  await organizationApi();
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-12">
      <Link href="/dashboard" className="text-sm underline">Back to dashboard</Link>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Create your organization</h1>
        <p className="text-muted-foreground">Start with a few essentials. Your documents will provide your business knowledge.</p>
      </header>
      <OnboardingForm />
    </main>
  );
}
