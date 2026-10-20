# Proposal

## Why

The owner wants to attract new players and keep them playing every day (2026-10-20). From the options discussed, they chose three:

- **A next goal on the main menu**, so there is always a reason to press Play.
- **Quick runs** that fit a short break on a phone.
- **A Daily Trial** that everyone plays the same way each day. Its share card and challenge link spread the game, and a link preview makes a shared link look like a game.

Everything stays static and in the browser (D1). The trial's daily selection is computed from the date, so every browser agrees without a server. Scores are compared by sharing, not by a global leaderboard.

## What Changes

Delivered as three pull requests, in this order:

1. **Next goal.** The main menu shows one line naming the nearest unfinished thing. It is one of: an affordable blessing, the daily quest closest to done, or the achievement closest to done. After step 3, an unplayed Daily Trial comes first. The line links to the screen where the goal lives, and replaces the menu's "Daily quests: n / 3 done" line.
2. **Quick runs.**
   - Realm selection offers **Full** (the boss comes at 7:00) or **Quick** (the realm's clock runs twice as fast: phases, events, the merchant, enemy growth and the boss at 3:30).
   - Gods gain double experience in a quick run, so builds keep pace.
   - Quick runs have their own high-score table in the Hall of Glory.
   - They count for achievements and daily quests like any run. Play again keeps the choice.
   - Rooms keep full runs.
3. **Daily Trial.**
   - Each local day has one trial, chosen from the date alone: a god, a realm, a seed and a **twist** (a rule for the day, such as faster enemies or a glass god).
   - Its screen shows the day's trial and your best score today.
   - Every attempt counts; the best is kept and shown in the Hall of Glory.
   - After any run, **Share** makes a picture of the result and offers the share sheet, or saves the picture. It also copies a **challenge link** that starts the same god, realm, seed and rules, with the score to beat.
   - The site gets a **link preview** (title, description, image) for chat apps and social sites.

## Capabilities

### New Capabilities

- `quick-runs`: the quick pace and its table.
- `daily-trial`: the daily trial, twists, sharing, challenge links, link previews.

### Modified Capabilities

- `run-setup`: the main menu's next goal and Daily Trial entry; realm selection's run length.
- `glory`: the Quick high-score table; the daily best in the Hall of Glory.
- `meta-progression`: save format versions 7 (quick table) and 8 (daily trial).

## Non-goals

- A global leaderboard or anything stored online (D1). A parked plan exists for that.
- Notifications or streak rewards (possible later).
- Quick runs and Daily Trials in rooms.
