"use client";

import { useActionState } from "react";
import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [state, action, pending] = useActionState(logout, {});
  return <form action={action}>
    <Button variant="outline" disabled={pending}>{pending ? "Signing out…" : "Sign out"}</Button>
    {state.error && <p role="alert" className="mt-2 text-sm text-destructive">{state.error}</p>}
  </form>;
}
