import assert from "node:assert/strict";
import test from "node:test";
import { mergeMatchPages } from "../src/lib/match-results.mjs";

test("appends later search pages while suppressing duplicate profile IDs", () => {
  const first = [{ tsap_id: "MV-001", age: 28 }, { tsap_id: "MV-002", age: 30 }];
  const next = [{ tsap_id: "MV-002", age: 30 }, { tsap_id: "MV-003", age: 32 }];

  assert.deepEqual(mergeMatchPages(first, next), [
    { tsap_id: "MV-001", age: 28 },
    { tsap_id: "MV-002", age: 30 },
    { tsap_id: "MV-003", age: 32 },
  ]);
});

test("keeps rows without profile IDs instead of dropping possibly valid API results", () => {
  const emptyIdRow = { full_name: "Legacy profile without a public ID" };
  assert.deepEqual(mergeMatchPages([], [emptyIdRow, emptyIdRow]), [emptyIdRow, emptyIdRow]);
});
