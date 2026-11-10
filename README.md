# One Ring Dice

A dice roller for **The One Ring, Second Edition**: one page of HTML and JS, made to run straight off GitHub Pages and to fit a phone.

- **Settings**: Player Name, Discord Link (a channel webhook), Strength, Heart, Wits. Each Target Number is 20 minus the attribute. Settings stay in your browser.
- **Dice**: pick 1–6 Success Dice (tap the sixth again to keep adding), then roll Strength, Heart, Wits, or Custom (asks for a TN).
- **Rules**: Feat Die (1–10, the Eye, the Gandalf rune) plus the Success Dice; meet or beat the TN. The rune always succeeds; the Eye counts as 0. Each 6 carries an Elf rune: one makes a Great Success, two or more an Extraordinary Success.
- **Favored / Ill-Favored**: roll two Feat Dice, keep the better / worse. **Miserable**: the Eye fails. **Weary**: Success Dice of 1–3 count as 0.
- Every roll is posted to Discord when a webhook is set.

## Runes in Discord

Discord shows the runes as plain text (👁️ ᚠ ᛏ) unless you add custom emoji: upload `emoji/tor_eye.png`, `emoji/tor_gandalf.png` and `emoji/tor_elf.png` to your server, send `\:tor_eye:` (etc.) in Discord, and paste what it prints into `config.js`.

## Develop

No build step. Serve the folder (`python -m http.server`) and open it. Tests: `node --test tests/*.cjs`.

The rulebook PDF is git-ignored; keep it local.
