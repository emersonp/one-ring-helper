// Run with: node --test tests/*.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
require("../dice.js");
const D = globalThis.TOR_DICE;

// An rng that hands out faces in order: feat faces are FEAT_FACES indexes, success dice are value - 1.
const seq = (...xs) => { let i = 0; return () => xs[i++]; };
const FEAT = (f) => D.FEAT_FACES.indexOf(f);

test("sums the Feat Die and Success Dice against the TN", () => {
  const r = D.roll({ dice: 2, tn: 14 }, seq(FEAT(8), 3, 2)); // 8 + 4 + 3
  assert.equal(r.total, 15);
  assert.equal(r.degree, "success");
  assert.equal(D.roll({ dice: 2, tn: 16 }, seq(FEAT(8), 3, 2)).degree, "failure");
});

test("the Eye counts as zero; the rune always succeeds", () => {
  assert.equal(D.roll({ dice: 1, tn: 3 }, seq(FEAT("eye"), 3)).total, 4);
  const rune = D.roll({ dice: 0, tn: 30 }, seq(FEAT("rune")));
  assert.equal(rune.passed, true);
  assert.equal(rune.reason, "rune");
});

test("elf runes set the degree of success, but not of failure", () => {
  assert.equal(D.roll({ dice: 1, tn: 5 }, seq(FEAT(1), 5)).degree, "great");
  assert.equal(D.roll({ dice: 2, tn: 5 }, seq(FEAT(1), 5, 5)).degree, "extraordinary");
  assert.equal(D.roll({ dice: 2, tn: 30 }, seq(FEAT(1), 5, 5)).degree, "failure");
});

test("favored keeps the better Feat Die, ill-favored the worse", () => {
  const fav = D.roll({ mode: "favored", tn: 5 }, seq(FEAT("eye"), FEAT(7)));
  assert.equal(fav.feat, 7); assert.equal(fav.kept, 1);
  const ill = D.roll({ mode: "ill", tn: 5 }, seq(FEAT("rune"), FEAT(2)));
  assert.equal(ill.feat, 2); assert.equal(ill.kept, 1);
  assert.equal(D.roll({ mode: "favored", tn: 99 }, seq(FEAT(10), FEAT("rune"))).passed, true);
  assert.equal(D.roll({ mode: "ill", tn: 0 }, seq(FEAT(10), FEAT("eye"))).feat, "eye");
});

test("miserable: the Eye fails even when the TN is met", () => {
  const r = D.roll({ dice: 3, tn: 5, miserable: true }, seq(FEAT("eye"), 5, 5, 5));
  assert.equal(r.total, 18);
  assert.equal(r.passed, false);
  assert.equal(r.degree, "failure");
});

test("weary: Success Dice of 1-3 count as zero", () => {
  const r = D.roll({ dice: 3, tn: 5, weary: true }, seq(FEAT(4), 0, 2, 5)); // 4 + (1→0) + (3→0) + 6
  assert.equal(r.total, 10);
  assert.deepEqual(r.success.map((d) => d.counts), [0, 0, 6]);
  assert.equal(r.degree, "great");
});

test("TN is 20 minus the attribute; pools are clamped", () => {
  assert.equal(D.tnFor(6), 14);
  assert.equal(D.tnFor(""), null);
  assert.equal(D.clampDice(99), D.MAX_DICE);
  assert.equal(D.clampDice(-2), 0);
});

test("randInt stays in range", () => {
  for (let i = 0; i < 2000; i++) { const n = D.randInt(12); assert.ok(n >= 0 && n < 12); }
});
