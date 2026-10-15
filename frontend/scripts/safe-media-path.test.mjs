import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const helperPath = fileURLToPath(new URL("../src/lib/safe-media-path.ts", import.meta.url));
const helperSource = fs.readFileSync(helperPath, "utf8");
const helperJavaScript = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const helperUrl = `data:text/javascript;base64,${Buffer.from(helperJavaScript).toString("base64")}`;
const { isSafeRootRelativePath, isSafeSameOriginPath } = await import(helperUrl);
const origin = "https://preview.example";

test("accepts only well-formed root-relative service paths", () => {
  assert.equal(isSafeRootRelativePath("/api/health"), true);
  for (const path of ["//attacker.example/path", "/\\attacker.example/path", "https://example.test/api", "", null]) {
    assert.equal(isSafeRootRelativePath(path), false, String(path));
  }
});

test("accepts root-relative same-origin media and protected API paths", () => {
  for (const path of [
    "/photos/member-photo.jpg",
    "/cards/PROFILE-123.png",
    "/api/admin/photos/PROFILE-123/content?kind=photo",
  ]) {
    assert.equal(isSafeSameOriginPath(path, origin), true, path);
  }
});

test("rejects paths that could send custom auth headers off-origin", () => {
  for (const path of [
    "//attacker.example/collect",
    "///attacker.example/collect",
    "/\\attacker.example/collect",
    "/./\\attacker.example/collect",
    "https://attacker.example/collect",
    "data:image/png;base64,AAAA",
    "javascript:alert(1)",
    " /photos/member-photo.jpg",
    "/photos/member photo.jpg",
    "",
    null,
  ]) {
    assert.equal(isSafeSameOriginPath(path, origin), false, String(path));
  }
});

test("rejects non-web and malformed origins", () => {
  assert.equal(isSafeSameOriginPath("/photos/member-photo.jpg", "file:///tmp/app"), false);
  assert.equal(isSafeSameOriginPath("/photos/member-photo.jpg", "not-an-origin"), false);
});
