"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, oauth } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function AuthForm({
  mode,
  callbackError = false,
}: {
  mode: "login" | "signup";
  callbackError?: boolean;
}) {
  const isSignup = mode === "signup";
  const [state, action, pending] = useActionState(
    isSignup ? signup : login,
    {},
  );
  const [providerState, providerAction, providerPending] = useActionState(
    oauth,
    {},
  );
  const busy = pending || providerPending;
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className=" text-center">
          <p>
            <Link href="/" className="text-sm text-muted-foreground">
              WhatsApp AI SaaS
            </Link>
          </p>
          <h1 className="text-2xl font-semibold">
            {isSignup ? "Create an account" : "Sign in"}
          </h1>
        </div>
        {callbackError && (
          <p role="alert" className="text-sm text-destructive">
            Sign-in could not be completed. The link may have expired or access
            was declined. Try signing in again in this browser.
          </p>
        )}
        {/* Email and password fields */}
        <form action={action} className="space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium">
                  Full name
                </label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2"
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                className="w-full rounded-md border bg-background px-3 py-2"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                className="w-full rounded-md border bg-background px-3 py-2"
                id="password"
                name="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={isSignup ? 8 : 1}
                maxLength={128}
                required
                aria-describedby={isSignup ? "password-help" : undefined}
              />
              {isSignup && (
                <p id="password-help" className="text-xs text-muted-foreground">
                  Use 8–128 characters. Additional account password requirements
                  may apply.
                </p>
              )}
            </div>
            <Button type="submit" className="w-full">
              {pending
                ? "Please wait…"
                : isSignup
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </fieldset>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.message && (
            <p role="status" className="text-sm">
              {state.message}
            </p>
          )}
        </form>
        {/* OAuth providers */}
        {/* <div className="border-t pt-4">
          <form action={providerAction} className="space-y-3">
            <Button
              className="w-full"
              variant="outline"
              name="provider"
              value="google"
              disabled={busy}
            >
              Continue with Google
            </Button>
            <Button
              className="w-full"
              variant="outline"
              name="provider"
              value="facebook"
              disabled={busy}
            >
              Continue with Facebook
            </Button>
            {providerPending && (
              <p role="status" className="text-sm">
                Connecting…
              </p>
            )}
            {providerState.error && (
              <p role="alert" className="text-sm text-destructive">
                {providerState.error}
              </p>
            )}
          </form>
        </div> */}
        {/* signup button */}
        <p className="text-sm text-muted-foreground">
          {isSignup ? "Already have an account? " : "New here? "}
          <Link className="underline" href={isSignup ? "/login" : "/signup"}>
            {isSignup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>
    </main>
  );
}
