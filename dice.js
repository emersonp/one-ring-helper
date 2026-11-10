// The One Ring (Second Edition) dice rules.
// - Roll one Feat Die (d12: 1-10, the Eye of Sauron, the Gandalf rune) plus a pool of Success Dice (d6).
// - The Eye counts as zero; the Gandalf rune is an automatic success.
// - Total = Feat Die + Success Dice; total >= TN succeeds.
// - Each 6 on a Success Die carries an Elvish rune: on a success, 0 runes = Success, 1 = Great, 2+ = Extraordinary.
// - Favored: roll two Feat Dice, keep the better. Ill-Favored: keep the worse. (Rune is best, Eye is worst.)
// - Miserable: the Eye is a failure even if the TN is met.
// - Weary: Success Dice showing 1, 2 or 3 count as zero.
// Plain script (no modules) so the page also works when opened straight from disk.
(function (root) {
  const MAX_DICE = 12;
  const EYE = "eye", RUNE = "rune";

  // A whole number from 0 to n - 1, without modulo bias.
  function randInt(n) {
    if (root.crypto?.getRandomValues) {
      const a = new Uint32Array(1), limit = Math.floor(0x100000000 / n) * n;
      do { root.crypto.getRandomValues(a); } while (a[0] >= limit);
      return a[0] % n;
    }
    return Math.floor(Math.random() * n);
  }

  // Feat Die faces in rank order: the Eye is the worst, the rune the best.
  const FEAT_FACES = [EYE, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, RUNE];
  const featRank = (face) => FEAT_FACES.indexOf(face);
  const featValue = (face) => (typeof face === "number" ? face : 0);
  const clampDice = (n) => Math.max(0, Math.min(MAX_DICE, Math.trunc(Number(n) || 0)));

  const rollFeat = (rng) => FEAT_FACES[rng(12)];
  const rollSuccess = (rng) => rng(6) + 1;

  // mode: "regular" | "favored" | "ill". rng(n) returns 0..n-1.
  function roll({ dice = 0, tn, mode = "regular", weary = false, miserable = false } = {}, rng = randInt) {
    const feats = Array.from({ length: mode === "regular" ? 1 : 2 }, () => rollFeat(rng));
    let kept = 0;
    if (feats.length === 2) {
      const [a, b] = feats.map(featRank);
      kept = mode === "favored" ? (b > a ? 1 : 0) : (b < a ? 1 : 0);
    }
    const feat = feats[kept];
    const success = Array.from({ length: clampDice(dice) }, () => {
      const value = rollSuccess(rng);
      return { value, counts: weary && value <= 3 ? 0 : value, elf: value === 6 };
    });
    const total = featValue(feat) + success.reduce((s, d) => s + d.counts, 0);
    const elves = success.filter((d) => d.elf).length;
    const target = Number(tn);
    let passed, reason = null;
    if (miserable && feat === EYE) { passed = false; reason = "miserable"; }
    else if (feat === RUNE) { passed = true; reason = "rune"; }
    else passed = total >= target;
    const degree = !passed ? "failure" : elves >= 2 ? "extraordinary" : elves === 1 ? "great" : "success";
    return { feats, kept, feat, success, total, tn: target, mode, weary, miserable, passed, reason, elves, degree, at: Date.now() };
  }

  const DEGREE_TEXT = { failure: "Failure", success: "Success", great: "Great Success", extraordinary: "Extraordinary Success" };

  // Attribute TN is 20 minus the attribute score.
  const tnFor = (score) => (Number.isFinite(Number(score)) && String(score).trim() !== "" ? 20 - Number(score) : null);

  root.TOR_DICE = { MAX_DICE, EYE, RUNE, FEAT_FACES, randInt, featRank, featValue, clampDice, roll, DEGREE_TEXT, tnFor };
})(globalThis);
