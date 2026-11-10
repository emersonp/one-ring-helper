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
  assert.equal(text, "-# Bilbo rolled Strength (TN 14) and got a\n## GREAT SUCCESS!\n8  +  6ᛏ · 2  =  **16**");
  assert.equal(msg.components[0].accent_color, DC.COLORS.great);
  assert.deepEqual(msg.allowed_mentions, { parse: [] });
});

test("custom emoji replace the runes; dropped and weary dice are struck", () => {
  const r = D.roll({ dice: 1, tn: 20, mode: "favored", weary: true }, seq(FEAT("eye"), FEAT("rune"), 1));
  const line = DC.diceLine(r, { eye: "<:e:1>", gandalf: "<:g:2>", elf: "<:t:3>" });
  assert.equal(line, "~~<:e:1>~~ <:g:2>  +  ~~2~~  =  **0**");
  const msg = DC.buildMessage(r, { player: "Sam", label: null });
  assert.match(msg.components[0].components[0].content, /^-# Sam rolled against TN 20 and got a\n## SUCCESS!/);
  assert.equal(msg.components[0].components[1].content, "-# Favored · Weary");
});

test("recognises webhook links", () => {
  assert.ok(DC.isWebhookUrl("https://discord.com/api/webhooks/123/abc-DEF_9"));
  assert.ok(!DC.isWebhookUrl("https://example.com/api/webhooks/123/abc"));
});
