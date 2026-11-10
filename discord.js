// Turns a roll (from TOR_DICE.roll) into a Discord webhook message: a container with an accent bar,
// a small intro line, the result in big letters, and the dice (with runes) underneath.
// Plain script (no modules) so the page also works when opened straight from disk.
(function (root) {
  const COLORS = { failure: 0x8a2a22, success: 0x5b7a3a, great: 0xb8862b, extraordinary: 0xd9a93a };
  const FALLBACK = { eye: "👁️", gandalf: "ᚠ", elf: "ᛏ" };
  const NO_PINGS = { parse: [] };
  const DEGREE_TEXT = { failure: "FAILURE", success: "SUCCESS!", great: "GREAT SUCCESS!", extraordinary: "EXTRAORDINARY SUCCESS!" };

  const runes = (emoji = {}) => ({
    eye: emoji.eye || FALLBACK.eye,
    gandalf: emoji.gandalf || FALLBACK.gandalf,
    elf: emoji.elf || FALLBACK.elf,
  });
  const strike = (s) => `~~${s}~~`;
  // Player names are typed by hand; keep Discord markdown from mangling them.
  const plain = (s) => String(s ?? "").replace(/([\\*_~`|>#])/g, "\\$1");

  function featText(face, r) {
    return face === "eye" ? r.eye : face === "rune" ? r.gandalf : String(face);
  }

  // The dice line: Feat Die (both, with the dropped one struck) + each Success Die, then the total.
  function diceLine(roll, emoji) {
    const r = runes(emoji);
    const feats = roll.feats.map((f, i) => (i === roll.kept ? featText(f, r) : strike(featText(f, r)))).join(" ");
    const success = roll.success.map((d) => {
      const s = d.elf ? `6${r.elf}` : String(d.value);
      return d.counts === 0 ? strike(s) : s;
    });
    const dice = success.length ? `${feats}  +  ${success.join(" · ")}` : feats;
    return `${dice}  =  **${roll.total}**`;
  }

  function lines(roll, { player, label }) {
    const flags = [
      roll.mode === "favored" && "Favored",
      roll.mode === "ill" && "Ill-Favored",
      roll.weary && "Weary",
      roll.miserable && "Miserable",
    ].filter(Boolean);
    return {
      intro: `${plain(player) || "Someone"} rolled ${label ? `${plain(label)} (TN ${roll.tn})` : `against TN ${roll.tn}`} and got a`,
      result: DEGREE_TEXT[roll.degree],
      detail: flags.length ? `${flags.join(" · ")}` : "",
    };
  }

  function buildMessage(roll, { player, label, emoji } = {}) {
    const l = lines(roll, { player, label });
    return {
      allowed_mentions: NO_PINGS,
      flags: 1 << 15, // IS_COMPONENTS_V2
      components: [{
        type: 17, // container
        accent_color: COLORS[roll.degree],
        components: [
          { type: 10, content: `-# ${l.intro}\n## ${l.result}\n${diceLine(roll, emoji)}` },
          ...(l.detail ? [{ type: 10, content: `-# ${l.detail}` }] : []),
        ],
      }],
    };
  }

  // A Discord webhook address: https://discord.com/api/webhooks/<id>/<token> (discordapp.com, ptb. and canary. work too).
  const isWebhookUrl = (value) =>
    /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/(?:v\d+\/)?webhooks\/\d+\/[\w-]+\/?$/.test(String(value ?? "").trim());

  async function send(webhookUrl, payload) {
    const url = new URL(webhookUrl.trim());
    url.searchParams.set("wait", "true");
    url.searchParams.set("with_components", "true"); // webhooks only render components when asked
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`Discord said ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  }

  root.TOR_DISCORD = { COLORS, FALLBACK, diceLine, lines, buildMessage, isWebhookUrl, send };
})(globalThis);
