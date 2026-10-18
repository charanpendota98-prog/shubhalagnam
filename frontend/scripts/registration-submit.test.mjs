import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/app/register/page-client.tsx"),
  "utf8",
);

test("registration submit has a synchronous double-click lock and releases it in finally", () => {
  assert.match(source, /submitLockRef\.current \|\| busy \|\| result/);
  assert.match(source, /submitLockRef\.current = true/);
  assert.match(source, /submitLockRef\.current = false/);
  assert.match(source, /finally\s*\{[\s\S]*submitLockRef\.current = false/);
  assert.match(source, /disabled=\{busy \|\| photoPreparing\}/);
});

test("registration retries use an opaque key and XHR progress without fabricating success", () => {
  assert.match(source, /shubhalagnam_registration_request_v1/);
  assert.match(source, /fd\.append\("registration_key", registrationKey\)/);
  assert.match(source, /xhr\.upload\.onprogress/);
  assert.match(source, /status < 200 \|\| status >= 300/);
  assert.match(source, /cardUrl = tsap \? String\(result\.card_url \|\| ""\)/);
});

test("referral success copy requires the server's nested attachment result", () => {
  assert.match(source, /const joined_with = result\.referral\?\.joined_with/);
  assert.match(source, /\{joined_with\?\.ok && \(/);
  assert.doesNotMatch(source, /result\.joined_with\?\.ok \|\| refLocked/);
});
