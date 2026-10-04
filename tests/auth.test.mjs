import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";

// Compile the real modules with the existing TypeScript dependency and replace
// only framework/provider boundaries. No test credentials or network required.
const require = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const filename = resolve(path);
  const source = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const compiled = { exports: {} };
  const dependency = (name) => {
    if (name in mocks) return mocks[name];
    if (name === "server-only") return {};
    if (name.startsWith("@/")) return load(name.slice(2), mocks);
    return require(name);
  };
  runInThisContext(`(function(require,module,exports){${source}\n})`, {
    filename,
  })(dependency, compiled, compiled.exports);
  return compiled.exports;
}
const validation = load("lib/auth/validation.ts");
const config = {
  url: "https://auth.example.test",
  key: "sb_publishable_test",
  appUrl: "https://app.example.test",
};
const redirect = (path) => {
  throw new Error(`REDIRECT:${path}`);
};
function actions(auth) {
  return load("app/auth/actions.ts", {
    "@/lib/auth/validation": validation,
    "@/lib/auth/config": { getAuthConfig: () => config },
    "@/lib/supabase/server": { createClient: async () => ({ auth }) },
    "next/navigation": { redirect },
  });
}
function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
const credentials = () =>
  form({
    fullName: "  Rahim Ahmed  ",
    email: " user@example.test ",
    password: "a strong password",
  });

test("credentials validate server-side without trimming passwords", () => {
  assert.equal(
    validation.readCredentials(
      form({ fullName: "Rahim Ahmed", email: "bad", password: "password" }),
      true,
    ),
    null,
  );
  assert.equal(
    validation.readCredentials(
      form({ fullName: "Rahim Ahmed", email: "a@b.test", password: "short" }),
      true,
    ),
    null,
  );
  assert.equal(
    validation.readCredentials(
      form({ email: "a@b.test", password: "x".repeat(129) }),
      false,
    ),
    null,
  );
  assert.deepEqual(
    validation.readCredentials(
      form({
        fullName: "  Rahim Ahmed  ",
        email: " a@b.test ",
        password: "  password  ",
      }),
      true,
    ),
    {
      display_name: "Rahim Ahmed",
      email: "a@b.test",
      password: "  password  ",
    },
  );
});

test("signup requires a text full name between 2 and 30 trimmed characters", () => {
  for (const fullName of [undefined, "", "   ", " A ", "A".repeat(31), new Blob(["Rahim"])]) {
    const input = credentials();
    input.delete("fullName");
    if (fullName !== undefined) input.set("fullName", fullName);
    assert.equal(validation.readCredentials(input, true), null);
  }

  for (const fullName of [" Al ", `  ${"A".repeat(30)}  `, "  রহিম আহমেদ  "]) {
    const input = credentials();
    input.set("fullName", fullName);
    assert.equal(validation.readCredentials(input, true)?.display_name, fullName.trim());
  }
});

test("login accepts credentials without a full name", async () => {
  const input = form({ email: " user@example.test ", password: "a strong password" });
  assert.deepEqual(validation.readCredentials(input, false), {
    display_name: "",
    email: "user@example.test",
    password: "a strong password",
  });
  let calls = 0;
  const api = actions({
    signInWithPassword: async () => {
      calls++;
      return { error: null };
    },
  });
  await assert.rejects(api.login({}, input), /REDIRECT:\/dashboard/);
  assert.equal(calls, 1);
});

test("signup rejects invalid names before calling Supabase", async () => {
  let calls = 0;
  const api = actions({
    signUp: async () => {
      calls++;
      return { data: { session: null }, error: null };
    },
  });
  for (const fullName of [undefined, "   ", "A", "A".repeat(31)]) {
    const input = credentials();
    input.delete("fullName");
    if (fullName !== undefined) input.set("fullName", fullName);
    assert.ok((await api.signup({}, input)).error);
  }
  assert.equal(calls, 0);
});

test("invalid credentials never reach Supabase", async () => {
  assert.ok((await actions({}).login({}, form({ email: "bad" }))).error);
  assert.ok((await actions({}).signup({}, form({}))).error);
});

test("login redirects only after successful authentication", async () => {
  const api = actions({
    signInWithPassword: async (value) => {
      assert.equal(value.email, "user@example.test");
      return { error: null };
    },
  });
  await assert.rejects(api.login({}, credentials()), /REDIRECT:\/dashboard/);
  const failed = actions({
    signInWithPassword: async () => ({
      error: { message: "private provider details" },
    }),
  });
  const result = await failed.login({}, credentials());
  assert.ok(result.error);
  assert.ok(!result.error.includes("private provider details"));
});

test("signup handles email confirmation and immediate sessions", async () => {
  for (const session of [null, { user: {} }]) {
    const api = actions({
      signUp: async (value) => {
        assert.deepEqual(value.options.data, { fullName: "Rahim Ahmed" });
        assert.equal(
          value.options.emailRedirectTo,
          `${config.appUrl}/auth/callback`,
        );
        return { data: { session }, error: null };
      },
    });
    if (session)
      await assert.rejects(
        api.signup({}, credentials()),
        /REDIRECT:\/dashboard/,
      );
    else
      assert.match(
        (await api.signup({}, credentials())).message,
        /Check your email/,
      );
  }
});

test("network failures are reported safely", async () => {
  const failure = async () => {
    throw new Error("private credential");
  };
  const api = actions({
    signInWithPassword: failure,
    signUp: failure,
    signInWithOAuth: failure,
    signOut: failure,
  });
  for (const result of await Promise.all([
    api.login({}, credentials()),
    api.signup({}, credentials()),
    api.oauth({}, form({ provider: "google" })),
    api.logout({}, form({})),
  ])) {
    assert.ok(result.error);
    assert.ok(!result.error.includes("private credential"));
  }
});

test("OAuth allows only Google/Facebook and uses a trusted callback", async () => {
  assert.ok((await actions({}).oauth({}, form({ provider: "github" }))).error);
  for (const provider of ["google", "facebook"]) {
    const api = actions({
      signInWithOAuth: async (value) => {
        assert.equal(value.provider, provider);
        assert.equal(
          value.options.redirectTo,
          `${config.appUrl}/auth/callback`,
        );
        assert.equal(value.options.skipBrowserRedirect, true);
        if (provider === "facebook")
          assert.equal(value.options.scopes, "email");
        return { data: { url: `${config.url}/authorize` }, error: null };
      },
    });
    await assert.rejects(
      api.oauth({}, form({ provider, next: "https://evil.test" })),
      /REDIRECT:https:\/\/auth.example.test/,
    );
  }
});

test("logout revokes the current session and reports revocation failure", async () => {
  const api = actions({
    signOut: async (value) => {
      assert.equal(value.scope, "local");
      return { error: null };
    },
  });
  await assert.rejects(api.logout({}, form({})), /REDIRECT:\/login/);
  assert.ok(
    (
      await actions({ signOut: async () => ({ error: {} }) }).logout(
        {},
        form({}),
      )
    ).error,
  );
});

test("callback fails closed and ignores attacker-controlled redirect destinations", async () => {
  const { NextRequest } = require("next/server");
  let calls = 0;
  const callback = (error) =>
    load("app/auth/callback/route.ts", {
      "@/lib/auth/config": { getAuthConfig: () => config },
      "@/lib/supabase/server": {
        createClient: async () => ({
          auth: {
            exchangeCodeForSession: async (code) => {
              calls++;
              assert.equal(code, "test-code");
              return { error };
            },
          },
        }),
      },
    }).GET;
  for (const query of [
    "",
    "?error=access_denied",
    "?code=test-code&error=access_denied",
  ]) {
    const response = await callback(null)(
      new NextRequest(`https://evil.test/auth/callback${query}`),
    );
    assert.equal(
      response.headers.get("location"),
      `${config.appUrl}/login?error=callback`,
    );
  }
  assert.equal(calls, 0);
  for (const error of [null, { message: "expired code" }]) {
    const response = await callback(error)(
      new NextRequest(
        "https://evil.test/auth/callback?code=test-code&next=//evil.test",
      ),
    );
    assert.equal(
      response.headers.get("location"),
      config.appUrl + (error ? "/login?error=callback" : "/dashboard"),
    );
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  }
});

test("proxy verifies users and preserves refreshed cookies on both pass-through and redirect", async () => {
  const { NextRequest } = require("next/server");
  for (const user of [null, { id: "test-user" }]) {
    const request = new NextRequest(`${config.appUrl}/dashboard`);
    const { proxy } = load("proxy.ts", {
      "@/lib/auth/config": { getAuthConfig: () => config },
      "@supabase/ssr": {
        createServerClient: (_url, _key, options) => ({
          auth: {
            getUser: async () => {
              options.cookies.setAll([
                {
                  name: "session",
                  value: "refreshed",
                  options: { httpOnly: true, path: "/" },
                },
              ]);
              return { data: { user }, error: user ? null : {} };
            },
          },
        }),
      },
    });
    const response = await proxy(request);
    assert.equal(request.cookies.get("session").value, "refreshed");
    assert.equal(response.cookies.get("session").value, "refreshed");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(
      response.headers.get("location"),
      user ? null : `${config.appUrl}/login`,
    );
  }
});

test("dashboard independently denies unauthenticated requests", async () => {
  const { default: dashboard } = load("app/dashboard/page.tsx", {
    "@/lib/supabase/server": {
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: null }, error: {} }) },
      }),
    },
    "@/components/auth/logout-button": { LogoutButton: () => null },
    "next/navigation": { redirect },
  });
  await assert.rejects(dashboard(), /REDIRECT:\/login/);
});

test("configuration rejects secret keys and untrusted URL shapes without exposing values", () => {
  const previous = { ...process.env };
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = config.url;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = config.key;
    process.env.APP_URL = config.appUrl;
    const { getAuthConfig } = load("lib/auth/config.ts");
    assert.equal(getAuthConfig().appUrl, config.appUrl);
    for (const key of [
      "sb_secret_private",
      `header.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`,
    ]) {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key;
      assert.throws(getAuthConfig, /public publishable\/anon key/);
    }
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = config.key;
    for (const url of [
      "https://user:password@app.test",
      "https://app.test/path",
      "javascript:alert(1)",
    ]) {
      process.env.APP_URL = url;
      assert.throws(getAuthConfig);
    }
    delete process.env.APP_URL;
    assert.throws(getAuthConfig, /Configure/);
  } finally {
    for (const name of Object.keys(process.env))
      if (!(name in previous)) delete process.env[name];
    Object.assign(process.env, previous);
  }
});
