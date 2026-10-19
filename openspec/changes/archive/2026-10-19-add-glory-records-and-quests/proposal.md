# Proposal

## Why

The owner asked (2026-10-19) for high scores for solo and co-op play, daily quests, achievements, and an admin mode that shows statistics and makes reports to decide which features to build next. Today a run leaves behind gold, a codex entry and four lifetime numbers; nothing tells a player how good a run was, gives them something to chase today, or shows the owner how the game is actually played.

D1 rules out a server: every record, quest and report lives in this browser's save, and the admin mode reports on this browser's runs (plus runs it simulates itself).

## What Changes

- **Glory score** for every run: kills + 2 per second survived + 10 per level + 1,000 per realm cleared.
- **High scores:** the ten best runs, kept separately for solo and co-op, shown in a new **Hall of Glory** screen with a filter per god. The run summary says when a run made the table and at which place.
- **Achievements:** a set of goals (data, like all content) such as "Clear a realm", "Slay 10,000 foes in all", "Clear a realm with every god", "Survive 15 minutes in one run", "Clear a realm in co-op". Each pays gold once. The Hall shows them all, unlocked or with progress.
- **Daily quests:** three quests a day, the same for everyone on the same date (picked by the date, no server), e.g. "Slay 600 foes today", "Survive 8 minutes as Poseidon", "Clear a realm". Progress adds up over the day's runs; each pays gold once; new quests at local midnight. Shown in the Hall and as a line on the main menu.
- **Run summary:** the score, a new high score, achievements unlocked and quests completed, with their gold.
- **Admin mode** (only at the address `/admin`, no button anywhere, behind a password whose hash alone is in the build; changed with `node scripts/admin-password.mjs`): a statistics screen of this browser's runs: totals, a table per god, where runs ended, which weapons are taken and how much damage they do, the scores of the last runs as a chart, and **export** of the run history as JSON or CSV. A **balance report** plays chosen gods for a few minutes each with the bot, right in the page, and tabulates how far they got, so balance can be compared across gods without playing.
- **Save format 4:** run history (the last 100 runs), high scores, achievements and their progress, and the day's quests. Older saves keep everything and start with empty records.
- The run result tells how many players were in the party, so a run counts as solo or co-op.

## Capabilities

### New Capabilities

- `glory`: score, high scores, achievements, daily quests and the Hall of Glory.
- `run-statistics`: admin mode, statistics, exports and the balance report.

### Modified Capabilities

- `meta-progression`: save format 4.
- `run-outcome`: the summary shows score, records, achievements and quests.

## Non-goals

- Online leaderboards or comparing with other players (D1).
- Weekly quests, quest rerolls, cosmetic rewards (later, as data).
- Protecting quests against changing the computer's clock: the honour system is acceptable for a single-player record.
