# Design

## Where things live

| Piece | Place | Why |
|---|---|---|
| `Goal`, `AchievementDefinition`, `QuestDefinition` types | `engine/data/types.ts` | content imports only engine types (D2) |
| Achievements and quests | `content/achievements.ts`, `content/quests.ts`, in `GameContent` | data-driven (D4); validated by `validateContent` (god IDs exist, targets positive) |
| `RunResult.players` | engine | a guest's result is made by the host; the app cannot know the party size otherwise |
| Score, high scores, achievements, quests, history | `app/core/save/glory.ts` (pure functions) | meta-progression is the app's, like `rewards.ts`; no gameplay rule moves out of the simulation |
| Applying them | `applyRunResult(save, result, content, now)` | one pure, idempotent step per run ID (D8); `now` is passed in so tests fix the date |
| Hall of Glory | `features/glory/glory-screen.ts`, route `/glory` | |
| Admin | `core/admin-mode.ts` (`?admin` → sessionStorage), `features/admin/admin-screen.ts`, route `/admin` with a guard | works in production builds: it only reads this browser's save |
| Statistics | `features/admin/run-statistics.ts` (pure) | testable without a component |
| Bot and balance report | `engine/analysis/autopilot.ts` (moved from `engine/testing/`, which re-exports it) and `engine/analysis/balance-report.ts`, exported from `engine/index.ts` | the report runs the real simulation; Angular reaches it only through the engine's public surface (D3) |

## Goals

```ts
interface Goal {
  measure: 'kills' | 'timeSeconds' | 'level' | 'realmsCleared' | 'gold' | 'synergies' | 'runs';
  target: number;
  over: 'run' | 'total';   // one run's value, or added up (lifetime for achievements, the day for quests)
  god?: string;             // only runs as this god count
  mode?: 'solo' | 'coop';
  everyGod?: boolean;       // achievements: met once every god has met it
}
```

`runs` counts 1 per run. A run's value of a measure comes from its `RunResult` (`synergies` = `loadout.synergies.length`).

## Save v4

```ts
history: RunRecord[]                  // newest last, at most 100
highScores: { solo: ScoreEntry[]; coop: ScoreEntry[] }   // best first, at most 10, unique runId
achievements: Record<string, string>  // id → ISO date unlocked
achievementProgress: Record<string, number>   // added-up goals
achievementGods: Record<string, string[]>     // everyGod goals
daily: { date: string; progress: Record<string, number>; done: string[] }  // date 'YYYY-MM-DD', local
```

Migration 3 → 4 adds the empty records. Parsing validates entries one by one and drops unknown IDs.

## Daily quests

`questsFor(date, quests)`: FNV-1a of the date string seeds a small LCG; a partial Fisher–Yates over the quest list picks three. Not gameplay randomness, so not the simulation's `Rng` (D5 applies to the simulation). The local date is formatted from `now` (`YYYY-MM-DD`); a different stored date resets progress.

## Balance report

`BalanceReport` holds the queue of runs (gods × runs, seeds 1…n, no permanent upgrades) and plays them in slices: `advance(steps)` runs up to `steps` simulation steps and returns whether work remains, so the screen can call it from `setTimeout` and keep the page responsive. Each run uses the autopilot with weapons-first choices, the same as the headless tests. Same options → same seeds → same report (D5).

## Exports

JSON: the history array. CSV: one row per run (date, god, realm, realm reached, players, outcome, seed, time, level, kills, gold, realms cleared, score, weapons as `id:level:damage` joined by `|`). A Blob and a temporary link download the file; nothing leaves the browser.

## Risks

- Save size: 100 history records are about 40 kB, well within `localStorage`.
- Clock changes can replay daily quests; accepted (non-goal).
