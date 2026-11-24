import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = fs.readFileSync(new URL("../src/lib/verification-label.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { VERIFICATION_EMOJI, verificationLabel } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("strips every known leading icon, optional spacing and icon-only labels", () => {
  assert.equal(VERIFICATION_EMOJI.length, 11);
  for (const icon of VERIFICATION_EMOJI) {
    for (const gap of ["", " ", "  ", "\t", "\n"]) {
      assert.equal(verificationLabel(`${icon}${gap}Label`), "Label");
      assert.equal(verificationLabel(`${icon}${gap}`), "");
    }
  }
});

test("strips actual phone, photo and ID labels in both languages", () => {
  for (const [input, expected] of [
    ["📱 Phone number access confirmed by OTP", "Phone number access confirmed by OTP"],
    ["📱 ఫోన్ OTP ద్వారా ధృవీకరించబడింది", "ఫోన్ OTP ద్వారా ధృవీకరించబడింది"],
    ["📸 Photo reviewed and approved by staff", "Photo reviewed and approved by staff"],
    ["📸 ఫోటోను బృందం సమీక్షించి ఆమోదించింది", "ఫోటోను బృందం సమీక్షించి ఆమోదించింది"],
    ["🪪 Government ID manually reviewed by staff", "Government ID manually reviewed by staff"],
    ["🪪 ప్రభుత్వ ID ను బృందం మాన్యువల్‌గా సమీక్షించింది", "ప్రభుత్వ ID ను బృందం మాన్యువల్‌గా సమీక్షించింది"],
    ["✍️ About", "About"],
  ]) assert.equal(verificationLabel(input), expected);
});

test("preserves mid-label icons, unknown icons, plain text and unmatched variation forms", () => {
  for (const input of ["Text 📱 label", "🌟 Unknown", "తెలుగు", "Latin", "123", "! Label", " 📱 Leading space", "✍ Bare pen", "", "No check recorded"]) {
    assert.equal(verificationLabel(input), input);
  }
  assert.equal(verificationLabel("📱 📸 Second icon"), "📸 Second icon");
});

test("handles absent and non-string values without throwing", () => {
  for (const input of [null, undefined]) assert.equal(verificationLabel(input), "");
  assert.equal(verificationLabel(42), "42");
  assert.equal(verificationLabel(false), "false");
  assert.equal(verificationLabel({}), "[object Object]");
});
