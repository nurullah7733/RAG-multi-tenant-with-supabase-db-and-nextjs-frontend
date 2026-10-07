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

test("upload session authenticates before exposing request options and never logs the token", async () => {
  const calls = [];
  const logs = [];
  const previousLog = console.log;
  const previousMode = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "development";
    console.log = (...args) => logs.push(args);
    const { sessionRequestOptions } = load("lib/api/session.ts", {
      "next/navigation": { redirect: () => assert.fail("must not redirect") },
      "@/lib/supabase/server": { createClient: async (writable) => {
        assert.equal(writable, true);
        return { auth: {
          getUser: async () => { calls.push("verify"); return {data: {user: {id: "user"}}, error: null}; },
          getSession: async () => { calls.push("session"); return {data: {session: {access_token: "test-only-token"}}, error: null}; },
        }};
      } },
    });
    const options = await sessionRequestOptions(true);
    assert.deepEqual(calls, ["verify", "session"]);
    assert.equal(options.headers.Authorization, "Bearer test-only-token");
    assert.equal(options.cache, "no-store");
    assert.equal(options.redirect, "error");
    assert.deepEqual(logs, []);
  } finally {
    console.log = previousLog;
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
  }
});

test("invalid upload session redirects without obtaining a token", async () => {
  const { sessionRequestOptions } = load("lib/api/session.ts", {
    "next/navigation": { redirect: (path) => { throw new Error(`REDIRECT:${path}`); } },
    "@/lib/supabase/server": { createClient: async () => ({auth: {
      getUser: async () => ({data: {user: null}, error: {}}),
      getSession: async () => assert.fail("must not read invalid session"),
    }}) },
  });
  await assert.rejects(sessionRequestOptions(), /REDIRECT:\/login/);
});

test("upload errors describe size and membership failures without provider details", () => {
  class ApiError extends Error { constructor(status) { super("private details"); this.status = status; } }
  const { describeUploadRejection } = load("lib/api/documents.ts", {
    "@/lib/api/client": {ApiError},
    "@/lib/api/session": {},
  });
  assert.match(describeUploadRejection(new ApiError(413)), /size/);
  assert.match(describeUploadRejection(new ApiError(404)), /access/);
  assert.match(describeUploadRejection(new ApiError(422)), /validation/);
  assert.doesNotMatch(describeUploadRejection(new ApiError(503)), /private details/);
});
