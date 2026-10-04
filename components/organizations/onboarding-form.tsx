"use client";

import Link from "next/link";
import { useActionState } from "react";
import { onboard } from "@/app/dashboard/onboarding/actions";
import { Button } from "@/components/ui/button";

const types = ["Education", "Healthcare", "E-commerce", "Retail", "Restaurant", "Hospitality", "Travel", "Real Estate", "Technology", "Professional Services", "Training", "NGO / Nonprofit", "Local Services", "Other"];
const fields = [
  { name: "name", label: "Organization name", hint: "The name your customers know.", max: 100 },
  { name: "organization_type", label: "Organization type", hint: "Choose a suggestion or enter your own type.", max: 100 },
  { name: "country_code", label: "Country code", hint: "Two-letter ISO code, for example US or BD.", max: 2 },
  { name: "timezone", label: "Timezone", hint: "IANA identifier, for example America/New_York or Asia/Dhaka.", max: 100 },
  { name: "default_language", label: "Default language", hint: "Language tag, for example en or bn-BD. The interface remains English.", max: 35 },
  { name: "currency_code", label: "Currency code", hint: "Three-letter ISO code, for example USD or BDT.", max: 3 },
];

export function OnboardingForm() {
  const [state, action, pending] = useActionState(onboard, {});
  return (
    <form action={action} className="space-y-6">
      <fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">Organization details</legend>
        {fields.map(({ name, label, hint, max }) => (
          <div key={name} className="space-y-2">
            <label htmlFor={name} className="block text-sm font-medium">{label}</label>
            <input id={name} name={name} required maxLength={max}
              defaultValue={state.values?.[name] ?? (name === "default_language" ? "en" : "")}
              list={name === "organization_type" ? "organization-types" : undefined}
              aria-describedby={`${name}-hint`}
              className="h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring" />
            <p id={`${name}-hint`} className="text-xs text-muted-foreground">{hint}</p>
          </div>
        ))}
      </fieldset>
      <datalist id="organization-types">{types.map((type) => <option key={type} value={type} />)}</datalist>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error} <Link href="/dashboard" className="underline">View dashboard</Link></p>}
      <Button disabled={pending} type="submit">{pending ? "Creating organization…" : "Create organization & continue"}</Button>
    </form>
  );
}
