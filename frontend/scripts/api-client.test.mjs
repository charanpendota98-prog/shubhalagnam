import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8");

test("API client never retries a mutation by default", () => {
  assert.match(source, /retries:\s*requestedRetries/);
  assert.match(source, /requestedRetries\s*\?\?\s*\(method\s*===\s*"GET"\s*\?\s*1\s*:\s*0\)/);
  assert.doesNotMatch(source, /retries\s*=\s*1\s*[,}]/);
});

test("API client parses empty and non-JSON responses defensively", () => {
  assert.match(source, /const text = await response\.text\(\)/);
  assert.match(source, /if \(!text\.trim\(\)\)/);
  assert.match(source, /JSON\.parse\(text\)/);
  assert.match(source, /server returned an unreadable response/);
  assert.match(source, /apiDisplayMessage\(data, true, ""\)/);
  assert.doesNotMatch(source, /String\(d\.message_telugu \|\| d\.detail \|\| d\.error/);
});

test("logout clears the member id together with both token stores", () => {
  const clear = source.slice(source.indexOf("export function clearAuth"), source.indexOf("type Opts"));
  assert.match(clear, /localStorage\.removeItem\(TOKEN_KEY\)/);
  assert.match(clear, /localStorage\.removeItem\(TSAP_KEY\)/);
  assert.match(clear, /sessionStorage\.removeItem\(TOKEN_KEY\)/);
  assert.match(clear, /sessionStorage\.removeItem\(TSAP_KEY\)/);
});

test("expired sessions clear both stale token and stale profile id", () => {
  const auth = fs.readFileSync(new URL("../src/lib/auth.ts", import.meta.url), "utf8");
  assert.match(auth, /if \(result\.status === 401\) clearAuth\(\)/);
});

test("protected downloads use auth headers rather than query-string credentials", () => {
  assert.match(source, /export async function downloadAuthenticatedFile/);
  assert.match(source, /fetch\(path, \{ headers: authHeaders\(true\), credentials: "same-origin" \}\)/);
  assert.doesNotMatch(source, /[?&]token=\$\{encodeURIComponent/);
});
