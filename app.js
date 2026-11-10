// One Ring Dice: settings, the Success Dice picker, slot-machine reels, and posting to Discord.
(function () {
  const D = window.TOR_DICE, DC = window.TOR_DISCORD, CONFIG = window.TOR_CONFIG ?? {};
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const KEY = "tor-dice:v1";
  const ATTRS = { strength: "Strength", heart: "Heart", wits: "Wits" };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  // ---------- state ----------
  const defaults = {
    settings: { name: "", webhook: "", strength: "", heart: "", wits: "" },
    prefs: { dice: 0, mode: "regular", weary: false, miserable: false, customTn: 14 },
  };
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      return { settings: { ...defaults.settings, ...s.settings }, prefs: { ...defaults.prefs, ...s.prefs } };
    } catch { return structuredClone(defaults); }
  }
  const state = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ } };

  const score = (attr) => {
    const v = String(state.settings[attr] ?? "").trim();
    return v !== "" && Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;
  };
  const tnOf = (attr) => (score(attr) == null ? null : D.tnFor(score(attr)));
  const ready = () => state.settings.name.trim() && Object.keys(ATTRS).every((a) => score(a) != null);

  // ---------- tabs ----------
  function showTab(name) {
    $$(".tab").forEach((t) => {
      const on = t.dataset.tab === name;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
    });
    $("#panel-dice").hidden = name !== "dice";
    $("#panel-settings").hidden = name !== "settings";
  }
  $$(".tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));
  $(".tabs").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const tabs = $$(".tab"), i = tabs.indexOf(document.activeElement);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    next.focus(); showTab(next.dataset.tab);
  });

  // ---------- die art ----------
  const SVGNS = "http://www.w3.org/2000/svg";
  // A line from a to b with little thorns along it, like a briar.
  function thornyEdge([ax, ay], [bx, by], spacing, len) {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = uy, ny = -ux;
    let d = `M${ax.toFixed(1)} ${ay.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}`;
    const n = Math.max(2, Math.round(L / spacing));
    for (let k = 1; k < n; k++) {
      const t = k / n, px = ax + dx * t, py = ay + dy * t, side = k % 2 ? 1 : -1;
      d += `M${px.toFixed(1)} ${py.toFixed(1)}l${(ux * len * 0.7 + nx * len * side).toFixed(1)} ${(uy * len * 0.7 + ny * len * side).toFixed(1)}`;
    }
    return d;
  }
  const thornyShape = (pts, spacing, len) => pts.map((p, i) => thornyEdge(p, pts[(i + 1) % pts.length], spacing, len)).join("");
  const polygon = (cx, cy, r, sides, rot) =>
    Array.from({ length: sides }, (_, i) => {
      const a = rot + (i * 2 * Math.PI) / sides;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    });

  const D6_ART = `
    <rect class="body" x="3" y="3" width="94" height="94" rx="16"/>
    <path class="thorns" d="${thornyShape([[15, 15], [85, 15], [85, 85], [15, 85]], 9, 3.6)}"/>`;
  const PENT_OUTER = polygon(50, 53, 47, 5, -Math.PI / 2);
  const PENT_INNER = polygon(50, 53, 33, 5, -Math.PI / 2);
  const D12_ART = `
    <polygon class="body" points="${PENT_OUTER.map((p) => p.join(",")).join(" ")}"/>
    <path class="thorns" d="${thornyShape(PENT_INNER, 8, 3)}"/>`;

  const featFace = (f) =>
    f === D.EYE ? `<div class="face"><i class="glyph eye" role="img" aria-label="Eye of Sauron"></i></div>`
    : f === D.RUNE ? `<div class="face"><i class="glyph gandalf" role="img" aria-label="Gandalf rune"></i></div>`
    : `<div class="face"><span class="num solid">${f}</span></div>`;
  const successFace = (v) =>
    `<div class="face"><span class="num ${v <= 3 ? "outline" : "solid"}">${v}</span>${v === 6 ? `<i class="glyph elf" role="img" aria-label="Elf rune"></i>` : ""}</div>`;

  function dieHTML(kind, faces, extra = "") {
    const art = kind === "feat" ? D12_ART : D6_ART;
    return `<div class="die ${kind} ${extra}" data-len="${faces.length}">
      <svg class="frame" viewBox="0 0 100 100" aria-hidden="true">${art}</svg>
      <div class="window"><div class="strip">${faces.join("")}</div></div>
    </div>`;
  }

  // ---------- the picker ----------
  // Buttons 1..6: clicking n rolls n dice; clicking the current n clears; clicking 6 again keeps adding.
  function renderPicker() {
    const n = state.prefs.dice;
    $("#pool-picker").innerHTML = Array.from({ length: 6 }, (_, i) => {
      const k = i + 1, on = k <= n;
      const label = k === 6 && n > 6 ? n : k;
      const title = k === 6 ? (n >= 6 ? `${n} dice; press to add another` : "6 dice") : `${k} ${k === 1 ? "die" : "dice"}`;
      return `<button type="button" class="pip${on ? " on" : ""}${k === 6 && n > 6 ? " over" : ""}" data-n="${k}"
        aria-pressed="${on && k === Math.min(n, 6)}" aria-label="${title}">${label}</button>`;
    }).join("");
    $("#pool-note").textContent = n === 0 ? "Feat Die alone" : `Feat Die and ${n} Success ${n === 1 ? "Die" : "Dice"}`;
  }
  $("#pool-picker").addEventListener("click", (e) => {
    const b = e.target.closest(".pip");
    if (!b) return;
    const k = Number(b.dataset.n), n = state.prefs.dice;
    state.prefs.dice = k === 6 && n >= 6 ? Math.min(D.MAX_DICE, n + 1) : k === n ? 0 : k;
    save(); renderPicker();
    $(`.pip[data-n="${k}"]`)?.focus();
  });

  // ---------- modifiers ----------
  function renderMods() {
    $$(".segmented [data-mode]").forEach((b) => {
      const on = b.dataset.mode === state.prefs.mode;
      b.setAttribute("aria-checked", on);
      b.tabIndex = on ? 0 : -1;
    });
    $("#miserable").checked = state.prefs.miserable;
    $("#weary").checked = state.prefs.weary;
    const notes = [
      state.prefs.mode === "favored" && "Two Feat Dice; the better is kept.",
      state.prefs.mode === "ill" && "Two Feat Dice; the worse is kept.",
      state.prefs.miserable && "The Eye means failure.",
      state.prefs.weary && "Success Dice of 1–3 count for nothing.",
    ].filter(Boolean);
    $("#mods-note").textContent = notes.join(" ");
  }
  $(".segmented").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mode]");
    if (!b) return;
    state.prefs.mode = b.dataset.mode; save(); renderMods();
  });
  $(".segmented").addEventListener("keydown", (e) => {
    const modes = ["regular", "favored", "ill"], i = modes.indexOf(state.prefs.mode);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    state.prefs.mode = modes[(i + step + 3) % 3]; save(); renderMods();
    $(`.segmented [data-mode="${state.prefs.mode}"]`).focus();
  });
  for (const id of ["miserable", "weary"]) {
    $(`#${id}`).addEventListener("change", (e) => { state.prefs[id] = e.target.checked; save(); renderMods(); });
  }

  // ---------- settings ----------
  const form = $("#settings");
  function renderSettings() {
    for (const [k, v] of Object.entries(state.settings)) if (form.elements[k]) form.elements[k].value = v;
    renderDerived();
  }
  function renderDerived() {
    for (const a of Object.keys(ATTRS)) {
      const tn = tnOf(a);
      $$(`[data-tn="${a}"]`).forEach((el) => { el.textContent = tn == null ? "TN —" : `TN ${tn}`; });
      $(`.roll[data-attr="${a}"]`).disabled = tn == null;
    }
    const name = state.settings.name.trim();
    $("#hero-line").textContent = name ? `The dice of ${name}` : "Feat & Success Dice";
    const hook = state.settings.webhook.trim();
    const hint = $("#webhook-hint");
    const bad = hook && !DC.isWebhookUrl(hook);
    hint.classList.toggle("bad", Boolean(bad));
    form.elements.webhook.setAttribute("aria-invalid", bad ? "true" : "false");
    hint.textContent = bad
      ? "That isn’t a Discord webhook link. It should start https://discord.com/api/webhooks/"
      : "A channel webhook: Server Settings → Integrations → Webhooks → Copy Webhook URL. It stays in this browser.";
    $("#to-dice").disabled = !ready();
  }
  form.addEventListener("input", (e) => {
    const k = e.target.name;
    if (!(k in state.settings)) return;
    state.settings[k] = e.target.value;
    save(); renderDerived();
  });
  form.addEventListener("submit", (e) => e.preventDefault());
  $("#to-dice").addEventListener("click", () => { showTab("dice"); $("#tab-dice").focus(); });

  // ---------- custom TN dialog ----------
  const dialog = $("#custom-dialog");
  function openCustom() {
    $("#custom-tn").value = state.prefs.customTn;
    dialog.showModal();
    $("#custom-tn").select();
  }
  $("#custom-cancel").addEventListener("click", () => dialog.close());
  $("#custom-form").addEventListener("submit", (e) => {
    const v = Number($("#custom-tn").value);
    if (!Number.isInteger(v) || v < 1 || v > 40) { e.preventDefault(); $("#custom-tn").setAttribute("aria-invalid", "true"); return; }
    $("#custom-tn").removeAttribute("aria-invalid");
    state.prefs.customTn = v; save();
    queueMicrotask(() => doRoll({ tn: v, label: null }));
  });
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });

  // ---------- rolling ----------
  $("#rolls").addEventListener("click", (e) => {
    const b = e.target.closest(".roll");
    if (!b || b.disabled) return;
    const a = b.dataset.attr;
    if (a === "custom") return openCustom();
    doRoll({ tn: tnOf(a), label: ATTRS[a] });
  });

  let timers = [], rolling = false;
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const setRolling = (on) => {
    rolling = on;
    $$(".roll").forEach((b) => b.classList.toggle("busy", on));
    $("#tray").classList.toggle("spinning", on);
  };

  const randomFeat = () => D.FEAT_FACES[D.randInt(12)];
  const randomD6 = () => D.randInt(6) + 1;

  function doRoll({ tn, label }) {
    if (rolling || tn == null) return;
    const r = D.roll({ dice: state.prefs.dice, tn, mode: state.prefs.mode, weary: state.prefs.weary, miserable: state.prefs.miserable });
    const instant = reduceMotion.matches;
    const spinLen = (i) => (instant ? 1 : 12 + i * 3);

    const feats = r.feats.map((f, i) =>
      dieHTML("feat", [...Array.from({ length: spinLen(i) - 1 }, () => featFace(randomFeat())), featFace(f)],
        r.feats.length > 1 && i !== r.kept ? "dropped" : ""));
    const success = r.success.map((d, i) =>
      dieHTML("d6", [...Array.from({ length: spinLen(i + 1) - 1 }, () => successFace(randomD6())), successFace(d.value)],
        d.counts === 0 ? "void" : ""));

    clearTimers();
    $("#verdict").hidden = true;
    $("#post-status").textContent = "";
    const tray = $("#tray-dice");
    tray.innerHTML = `<div class="feat-row">${feats.join("")}</div>${success.length ? `<div class="success-row">${success.join("")}</div>` : ""}`;

    const dice = $$(".die", tray);
    if (instant) { dice.forEach((d) => d.classList.add("landed")); return finish(r, label); }

    setRolling(true);
    // Each reel stops a little after the last; big pools tighten the gap so the whole roll stays under ~2s.
    const step = Math.min(180, 900 / Math.max(1, dice.length - 1));
    const stopAt = (i) => 750 + i * step;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      dice.forEach((die, i) => {
        const strip = $(".strip", die), len = Number(die.dataset.len);
        strip.style.transition = `transform ${stopAt(i)}ms var(--ease-reel)`;
        strip.style.transform = `translateY(${(-100 * (len - 1)) / len}%)`;
        timers.push(setTimeout(() => die.classList.add("landed"), stopAt(i)));
      });
      timers.push(setTimeout(() => finish(r, label), stopAt(dice.length - 1) + 160));
    }));
  }

  function finish(r, label) {
    setRolling(false);
    const word = $("#verdict-word");
    word.textContent = D.DEGREE_TEXT[r.degree];
    word.dataset.degree = r.degree;
    const feat = r.feat === D.RUNE ? "the Gandalf rune" : r.feat === D.EYE ? "the Eye" : null;
    const why = r.reason === "rune" ? " · the rune prevails" : r.reason === "miserable" ? " · the Eye finds you Miserable" : "";
    $("#verdict-sum").textContent = `${label ? `${label} · ` : ""}rolled ${r.total} against TN ${r.tn}${feat && !why ? ` · ${feat}` : ""}${why}`;
    $("#verdict").hidden = false;
    post(r, label);
  }

  async function post(r, label) {
    const hook = state.settings.webhook.trim(), status = $("#post-status");
    if (!hook) { status.textContent = "Add a Discord Link in Settings to share rolls."; return; }
    if (!DC.isWebhookUrl(hook)) { status.textContent = "The Discord Link in Settings isn’t a webhook."; status.dataset.state = "error"; return; }
    status.dataset.state = "sending";
    status.textContent = "Sending word to Discord…";
    try {
      await DC.send(hook, DC.buildMessage(r, { player: state.settings.name.trim(), label, emoji: CONFIG.emoji }));
      status.dataset.state = "sent";
      status.textContent = "Sent to Discord.";
    } catch (err) {
      status.dataset.state = "error";
      status.textContent = `Couldn’t reach Discord: ${err.message}`;
    }
  }

  // ---------- boot ----------
  renderSettings();
  renderPicker();
  renderMods();
  showTab(ready() ? "dice" : "settings");
})();
