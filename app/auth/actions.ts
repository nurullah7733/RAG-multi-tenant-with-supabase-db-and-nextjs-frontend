"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthConfig } from "@/lib/auth/config";
import { readCredentials, type AuthState } from "@/lib/auth/validation";

export async function login(
  _previous: AuthState,
  data: FormData,
): Promise<AuthState> {
  const credentials = readCredentials(data, false);
  if (!credentials) return { error: "Enter a valid email and password." };
  try {
    const supabase = await createClient(true);
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error)
      return {
        error:
          "Unable to sign in. Check your credentials and confirm your email, or try again later.",
      };
  } catch {
    return {
      error: "Sign-in is temporarily unavailable. Please try again later.",
    };
  }
  redirect("/dashboard");
}

export async function signup(
  _previous: AuthState,
  data: FormData,
): Promise<AuthState> {
  const credentials = readCredentials(data, true);

  if (!credentials)
    return {
      error:
        "Enter a Full name, valid email and a password between 8 and 128 characters.",
    };
  let signedIn = false;
  try {
    const supabase = await createClient(true);
    const { appUrl } = getAuthConfig();
    const { data: result, error } = await supabase.auth.signUp({
      ...credentials,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
        data: {
          fullName: credentials.display_name,
        },
      },
    });
    if (error) {
      console.log(error?.code);
      return {
        error:
          "Unable to create an account. Check the password requirements or try again later.",
      };
    }

    signedIn = Boolean(result.session);
  } catch {
    return {
      error: "Signup is temporarily unavailable. Please try again later.",
    };
  }
  if (signedIn) redirect("/dashboard");
  return {
    message:
      "Check your email for a confirmation link and open it in this browser. If you already have an account, sign in.",
  };
}

export async function oauth(
  _previous: AuthState,
  data: FormData,
): Promise<AuthState> {
  const provider = data.get("provider");
  if (provider !== "google" && provider !== "facebook")
    return { error: "Unsupported sign-in provider." };
  let destination: string;
  try {
    const supabase = await createClient(true);
    const { appUrl } = getAuthConfig();
    const { data: result, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${appUrl}/auth/callback`,
        skipBrowserRedirect: true,
        ...(provider === "facebook" ? { scopes: "email" } : {}),
      },
    });
    if (error || !result.url)
      return {
        error:
          "This sign-in provider is unavailable. Use email and password or try again later.",
      };
    destination = result.url;
  } catch {
    return {
      error:
        "Provider sign-in is temporarily unavailable. Please try again later.",
    };
  }
  redirect(destination);
}

export async function logout(): Promise<AuthState> {
  try {
    const supabase = await createClient(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { error: "Unable to sign out. Please try again." };
  } catch {
    return { error: "Unable to sign out. Please try again." };
  }
  redirect("/login");
}
