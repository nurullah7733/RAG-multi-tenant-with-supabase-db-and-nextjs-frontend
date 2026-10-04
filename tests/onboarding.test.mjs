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

class ApiError extends Error { constructor(status) { super("private provider detail"); this.status = status; } }
const redirect = (path) => { throw new Error(`REDIRECT:${path}`); };
function input() {
  const form = new FormData();
  for (const [key, value] of Object.entries({name: " Example ", organization_type: "Custom", country_code: "BD", timezone: "Asia/Dhaka", default_language: "en", currency_code: "BDT", user_id: "attacker", role: "owner"})) form.set(key, value);
  return form;
}
function actions(create) {
  return load("app/dashboard/onboarding/actions.ts", {
    "next/navigation": { redirect },
    "@/lib/api/client": { ApiError },
    "@/lib/api/organizations": { organizationApi: async () => ({ create }) },
  });
}
test("onboarding forwards only metadata and redirects to the returned organization", async () => {
  let calls = 0;
  const { onboard } = actions(async (body) => {
    calls++;
    assert.equal(body.name, "Example");
    assert.equal(Object.keys(body).length, 6);
    assert.equal(body.user_id, undefined);
    return { id: "created-org" };
  });
  await assert.rejects(onboard({}, input()), /REDIRECT:\/dashboard\/organizations\/created-org\/knowledge/);
  assert.equal(calls, 1);
});
test("onboarding rejects missing metadata before mutation", async () => {
  const { onboard } = actions(async () => assert.fail("must not create"));
  const form = input(); form.delete("timezone");
  assert.ok((await onboard({}, form)).error);
});
test("creation failures retain input, are safe, and are not automatically retried", async () => {
  for (const status of [422, 503, null]) {
    let calls = 0;
    const { onboard } = actions(async () => { calls++; throw status ? new ApiError(status) : new Error("secret"); });
    const result = await onboard({}, input());
    assert.equal(result.values.name, "Example");
    assert.ok(result.error);
    assert.doesNotMatch(result.error, /private provider detail|secret/);
    assert.equal(calls, 1);
  }
  await assert.rejects(actions(async () => { throw new ApiError(401); }).onboard({}, input()), /REDIRECT:\/login/);
});
test("server action authenticates even when directly invoked", async () => {
  const { onboard } = load("app/dashboard/onboarding/actions.ts", {
    "next/navigation": { redirect }, "@/lib/api/client": { ApiError },
    "@/lib/api/organizations": { organizationApi: async () => redirect("/login") },
  });
  await assert.rejects(onboard({}, input()), /REDIRECT:\/login/);
});
test("dashboard routes first-time users to onboarding and fails closed on outages", async () => {
  for (const failure of [false, true]) {
    const { default: dashboard } = load("app/dashboard/page.tsx", {
      "next/navigation": { redirect }, "@/lib/api/client": { ApiError },
      "@/components/auth/logout-button": { LogoutButton: () => null },
      "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({data: {user: {id: "user"}}, error: null}) } }) },
      "@/lib/api/organizations": { organizationApi: async () => ({list: async () => { if (failure) throw new Error("outage"); return []; }}) },
    });
    await assert.rejects(dashboard({}), failure ? /outage/ : /REDIRECT:\/dashboard\/onboarding/);
  }
});
test("knowledge entry requires backend membership authorization for modified IDs", async () => {
  const { default: page } = load("app/dashboard/organizations/[organizationId]/knowledge/page.tsx", {
    "next/navigation": { redirect, notFound: () => { throw new Error("NOT_FOUND"); } },
    "@/lib/api/client": { ApiError },
    "@/lib/api/organizations": { organizationApi: async () => ({get: async (id) => { assert.equal(id, "another-tenant"); throw new ApiError(404); }}) },
  });
  await assert.rejects(page({params: Promise.resolve({organizationId: "another-tenant"})}), /NOT_FOUND/);
});
