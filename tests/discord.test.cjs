const test = require("node:test");
const assert = require("node:assert/strict");
require("../dice.js");
require("../discord.js");
const D = globalThis.TOR_DICE, DC = globalThis.TOR_DISCORD;
const seq = (...xs) => { let i = 0; return () => xs[i++]; };
const FEAT = (f) => D.FEAT_FACES.indexOf(f);

test("three lines: who rolled, the degree in big letters, then the dice", () => {
  const r = D.roll({ dice: 2, tn: 14 }, seq(FEAT(8), 5, 1)); // 8 + 6 + 2
  const msg = DC.buildMessage(r, { player: "Bilbo", label: "Strength" });
  const text = msg.components[0].components[0].content;
  assert.equal(text, "-# **Bilbo** rolled Strength (TN 14) and got a\n## GREAT SUCCESS!\n8  +  6ᛏ · 2  =  **16**");
  assert.equal(msg.components[0].accent_color, DC.COLORS.great);
  assert.deepEqual(msg.allowed_mentions, { parse: [] });
});

test("custom emoji replace the runes; kept Feat Die first, dropped in parentheses, weary dice →0", () => {
  const r = D.roll({ dice: 1, tn: 20, mode: "favored", weary: true }, seq(FEAT("eye"), FEAT("rune"), 1));
  const line = DC.diceLine(r, { eye: "<:e:1>", gandalf: "<:g:2>", elf: "<:t:3>" });
  assert.equal(line, "<:g:2> (<:e:1>)  +  2→0  =  **0**");
  const fav = D.roll({ dice: 4, tn: 15, mode: "favored", weary: true }, seq(FEAT(9), FEAT(10), 5, 0, 1, 3));
  assert.equal(DC.diceLine(fav), "10 (9)  +  6ᛏ · 1→0 · 2→0 · 4  =  **20**");
  const msg = DC.buildMessage(r, { player: "Sam", label: null });
  assert.match(msg.components[0].components[0].content, /^-# \*\*Sam\*\* rolled against TN 20 while Weary and with Favor and got a\n## SUCCESS!/);
  assert.equal(msg.components[0].components.length, 1); // no footer line
});

test("the intro says how the roll was made", () => {
  const intro = (opts) => DC.lines(D.roll({ tn: 15, ...opts }, seq(FEAT(5), FEAT(5))), { player: "Narniel", label: "Wits" }).intro;
  assert.equal(intro({}), "**Narniel** rolled Wits (TN 15) and got a");
  assert.equal(intro({ mode: "favored" }), "**Narniel** rolled Wits (TN 15) with Favor and got a");
  assert.equal(intro({ mode: "ill" }), "**Narniel** rolled Wits (TN 15) with Ill-Favor and got a");
  assert.equal(intro({ weary: true }), "**Narniel** rolled Wits (TN 15) while Weary and got a");
  assert.equal(intro({ miserable: true, mode: "favored" }), "**Narniel** rolled Wits (TN 15) while Miserable and with Favor and got a");
  assert.equal(intro({ weary: true, miserable: true, mode: "ill" }), "**Narniel** rolled Wits (TN 15) while Weary, Miserable, and with Ill-Favor and got a");
  assert.equal(intro({ weary: true, miserable: true }), "**Narniel** rolled Wits (TN 15) while Weary and Miserable and got a");
});

test("recognises webhook links", () => {
  assert.ok(DC.isWebhookUrl("https://discord.com/api/webhooks/123/abc-DEF_9"));
  assert.ok(!DC.isWebhookUrl("https://example.com/api/webhooks/123/abc"));
});
