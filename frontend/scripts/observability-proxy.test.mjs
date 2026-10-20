import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const config = fs.readFileSync(new URL("../next.config.mjs", import.meta.url), "utf8");

test("metrics are proxied to the backend without publishing port 8000", () => {
  assert.match(config, /source:\s*['"]\/metrics['"]/);
  assert.match(config, /destination:\s*`\$\{backend\}\/metrics`/);
});

test("metrics stay behind the backend operator token gate", () => {
  const observability = fs.readFileSync(new URL("../../backend/observability.py", import.meta.url), "utf8");
  assert.match(observability, /METRICS_TOKEN/);
  assert.match(observability, /hmac\.compare_digest/);
  assert.match(observability, /never profile IDs/i);
  assert.match(observability, /request bodies/i);
});
