# Design

## Next goal (Angular only)

- `nextGoal(save, content, now, trial?)` in `app/core/next-goal.ts` is a pure function. It returns `{ text, detail?, route }` or nothing.
- The candidates come in the spec's order:
  1. **The trial** (step 3): `trial.playedToday` is false.
  2. **An affordable blessing:** the cheapest next level of a permanent upgrade within the player's gold.
  3. **The nearest daily quest:** today's quests not done, by progress ÷ target from `dailyOf(save, now)`, ties to the first.
  4. **The nearest achievement:** among achievements with known progress (added-up goals, and every-god goals counted in gods), by progress ÷ target, above 0.
- The main menu shows it as a gold-ruled line in place of "Daily quests: n / 3 done", and the line is a link.

## Run rules and variants (engine)

- `RunConfig` gains two fields:
  - `rules?: RunRules`, which changes how the run plays. It is deterministic data, carried to a room's guests with the config.
  - `variant?: RunVariant`: `{ kind: 'quick' } | { kind: 'daily'; date; twistId } | { kind: 'challenge'; twistId? }`. The engine does not interpret it; it echoes it in `RunResult.variant`, so the result knows where it belongs (Glory). The guest's result copies it from the config.
- `RunRules` has three fields:
  - `pace?`: the realm clock's speed. `RunSimulation.step` adds `dt * pace` to `realmTime`, and the merchant's arrival check uses the same step. The spawn director's rates stay per real second.
  - `modifiers?`: stat modifiers added to every seat of the party in `RunState`, bots included.
  - `enemies?: { health?, damage?, speed?, spawnRate? }`: multipliers applied where an enemy is created (health, damage, speed) and to the director's spawn rate.
- A quick run is `rules: { pace: 2, modifiers: [{ stat: 'xpGain', flat: 1 }] }` with `variant: { kind: 'quick' }`.
- A twist is content (`content/daily.ts`): `{ id, name, description, rules }`, checked by `validateContent` (known stats, positive multipliers). Twists use only `modifiers` and `enemies`, never `pace`.

## Quick runs (step 2)

- `RunSetup.quick` is a signal. Realm selection shows a Full / Quick switch above Begin. `PlayScreen.soloRun` adds the rules and variant, and Play again keeps them.
- Rooms do not offer it.
- Glory:
  - `GloryMode` gains `'quick'`; a result with `variant.kind === 'quick'` goes to `highScores.quick`.
  - The Hall gets a **Quick** tab. The summary's "New high score" names the Quick table.
  - Save v7 (`highScores.quick`, empty on migration).

## Daily Trial (step 3)

- `dailyTrialFor(date, content)` in `app/core/daily-trial.ts` picks the trial from the date (FNV-1a of the date into a small LCG, like `questsFor`): a god, a realm, a twist, and a seed (`hash >>> 0`). The first realm of the chain is preferred one day in three, so new players often meet Olympus.
- Route `/daily`, the `DailyTrial` screen: date, god (icon and name), realm, twist, best today, and a **Begin** button. Begin sets up `RunSetup` (god, realm, seed, `trial`) and opens `/play`; the run's variant is `daily`, a solo full run.
- The loading screen and the summary show the twist.
- Save v8 holds `dailyTrial: { date, attempts, best?: { score, timeSeconds, kills, level, realmsCleared } }`. `applyGlory` routes a `daily` result there: today's record is updated, and a record from another day is replaced. Achievements, quests and stats count as usual.
- The Hall of Glory has a "Daily Trial" panel (today's trial, best today, a Play link). The main menu has a **Daily Trial** button, marked by a gold dot until played today.

### Share card and challenge link

- `ShareCard` (`app/core/share-card.ts`) draws a 1200 × 630 PNG on a canvas. It has:
  - the starry dark background and gold frame of the UI;
  - the god's sprite from the item icons;
  - the realm, time, kills, level and score;
  - the trial's date and twist, or "Quick run";
  - the address.

  Fonts are the UI's loaded fonts (`document.fonts.ready`).

- The challenge link is `<base>challenge?g=<god>&r=<realm>&s=<seed>&q=1&t=<twist>&b=<score>`. It is built from the result and the run's variant; the trial's twist travels as `t`.
- The summary's **Share** button:
  - `navigator.canShare({ files })` → `navigator.share({ files, text, url })`;
  - otherwise it downloads the PNG and copies the link to the clipboard;
  - a status line says what happened, and cancelling the share sheet is not an error.
- Route `/challenge` (the `Challenge` screen) parses and validates the parameters against content. Unknown parts redirect to `/`. It shows the challenge and **Accept**, which starts it: solo, with `variant: { kind: 'challenge', twistId? }`, rules from the twist and the quick flag, and the score to beat kept in `RunSetup`.
- Glory: a challenge with a twist enters no table, and one without a twist is scored by its length (quick or solo). The summary compares the score with the score to beat.
- Link preview: `index.html` gets Open Graph and Twitter card tags:
  - title and description;
  - `og:image` as an absolute URL on the GitHub Pages site (`og-image.jpg`, 1200 × 630, rendered by the docs-media script from a run);
  - `og:url`.

  The zip release keeps pointing at the Pages image, which is harmless.

## Testing

- **Unit:**
  - `nextGoal` (each candidate, order, nothing left).
  - Run rules: pace (boss at half time, merchant), xp, enemy multipliers, determinism, guests echo the variant.
  - `validateContent` for twists.
  - `dailyTrialFor` (stable, varies by day, valid ids).
  - Glory routing (quick table, daily best, challenge tables) and the save v7 and v8 migrations.
  - Share link building and challenge parsing.
  - Screens: menu goal and button, realm length switch, the Daily Trial screen, the Challenge screen, the Hall's Quick tab and trial panel, the summary's Share.
- **E2E:**
  - Quick run: the boss arrives at about 3:30 (`skipTo` 209 in realm time ×2…), the Quick table.
  - Daily Trial: start from the menu, the summary shows "Best today", the Hall shows the best.
  - A challenge link starts the right run.
  - Share falls back to download and copy in Chromium (clipboard permission granted in the test).
