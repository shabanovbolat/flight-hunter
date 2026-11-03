import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAnswer } from "./normalize.ts";

test("trims, lowercases and collapses spaces", () => {
  assert.equal(normalizeAnswer("  ЖЕТІ   күн "), "жеті күн");
});

test("Kazakh letters lowercase correctly", () => {
  assert.equal(normalizeAnswer("ӘҒҚҢӨҰҮҺІ"), "әғқңөұүһі");
});

test("strips harakat and tatweel, unifies alef", () => {
  assert.equal(normalizeAnswer("بِسْمِ ٱللَّهِ"), normalizeAnswer("بسم الله"));
  assert.equal(normalizeAnswer("كـتـاب"), "كتاب");
  assert.equal(normalizeAnswer("أحمد"), normalizeAnswer("احمد"));
});
