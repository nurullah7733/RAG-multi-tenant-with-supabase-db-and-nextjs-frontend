export type AuthState = { error?: string; message?: string };

export function readCredentials(data: FormData, signup: boolean) {
  const fullName = data.get("fullName");
  const email = data.get("email");
  const password = data.get("password");

  const normalizedName = typeof fullName === "string" ? fullName.trim() : "";

  if (
    signup &&
    (typeof fullName !== "string" ||
      normalizedName.length < 2 ||
      normalizedName.length > 30)
  ) {
    return null;
  }

  if (typeof email !== "string" || typeof password !== "string") return null;
  const normalizedEmail = email.trim();
  if (
    normalizedEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  )
    return null;
  if (password.length < (signup ? 8 : 1) || password.length > 128) return null;
  return {
    display_name: normalizedName,
    email: normalizedEmail,
    password,
  };
}
