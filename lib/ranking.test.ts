import { test } from "node:test";
import assert from "node:assert/strict";
import { rankRows } from "./ranking.ts";

test("standard competition ranking 1,1,3", () => {
  const r = rankRows([
    { id: "c", score: 5, total_time_ms: 9000 },
    { id: "a", score: 10, total_time_ms: 5000 },
    { id: "b", score: 10, total_time_ms: 5000 },
    { id: "d", score: 10, total_time_ms: 4000 },
  ]);
  assert.deepEqual(r.map((x) => [x.id, x.rank]), [["d", 1], ["a", 2], ["b", 2], ["c", 4]]);
});

test("time breaks score ties", () => {
  const r = rankRows([
    { id: "slow", score: 3, total_time_ms: 2000 },
    { id: "fast", score: 3, total_time_ms: 1000 },
  ]);
  assert.deepEqual(r.map((x) => x.rank), [1, 2]);
  assert.equal(r[0].id, "fast");
});
