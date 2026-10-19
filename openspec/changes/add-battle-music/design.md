# Design

Music is presentation: it lives in `engine/audio/` next to the sound player and reads the world frame and HUD the views already get. No gameplay rule changes, and the simulation does not know about it (D2, D5).

## Modules

| Module | Pure? | Does |
|---|---|---|
| `audio/music-intensity.ts` | yes | `musicIntensity({ realmTime, bossAt, depth, enemiesNear, bossAwake })` → 0–1, and `TierTracker` (smoothing: rises over ~1 s, falls over ~8 s; hysteresis 0.06) → tier 0–4 |
| `audio/music-score.ts` | yes | the composition: `TIERS` (tempo, swing-free 4/4, which parts play) and `barNotes(tier, bar)` → notes `{ part, beat, length, pitch, velocity }` for one bar, over a 4-bar progression in D minor (Dm – B♭ – C – A) |
| `audio/music-player.ts` | Web Audio | a look-ahead scheduler (timer every 25 ms, schedules 120 ms ahead) that asks the score for each bar at the current tier and plays the notes with synthesized instruments; its own gain (music volume) into the shared context's destination, so sound-effect and music volumes are apart |

Intensity: `base = 0.55 × min(1, realmTime / bossAt)`, `+ min(0.45, 0.15 × depth)`, `+ min(0.3, enemiesNear / 40 × 0.3)` (foes within 420 of the local god), then 1 while a boss is awake. Tiers by thresholds 0.2 / 0.4 / 0.62 / 0.95; without a boss the intensity is capped just below 0.95, so Titan (tier 4) plays only while a boss is awake.

Instruments (all synthesized per note, nodes released after use):

- kick: sine 150→45 Hz drop;
- snare: band-passed noise plus a 190 Hz triangle;
- hi-hat: high-passed noise, 40 ms;
- frame drum and toms: sine drops;
- bass: sawtooth through a low-pass;
- guitar: two detuned saws plus a fifth (power chord) through a waveshaper and a 3.2 kHz "cabinet" low-pass; palm-muted notes are short with a lower cutoff;
- lyre: a plucked triangle with a fast decay;
- choir: five detuned saws through a vowel band-pass with a slow attack.

## Wiring

- `SoundPlayer` exposes its `AudioContext` (created and unlocked as today). `startPhaserSession` creates the `MusicPlayer` on it, so the music outlives the scene, which restarts every realm.
- `ArenaScene.update` computes the intensity from `driver.world` (enemies near `driver.focus()`, boss) and the HUD's new `realmTime`, the realm's `boss.at` and `world.depth`, and calls `music.setIntensity`. It also calls `music.setPaused(driver.paused)` and `music.end()` on `runEnded`.
- `HudSnapshot.realmTime` is added (guests get it from the host's HUD).
- Settings: `GameSettings.musicVolume` (default 0.5), `updateSettings` → `music.setVolume`. Save v6 migration and parsing. A slider in `settings-controls`.

## Risks

- CPU: about 30–60 short-lived nodes per bar at Fury/Titan. That is small for Web Audio, and they are released with `onended`.
- Taste: synthesized metal is "retro". The tiers are data in `music-score.ts`, so they can be retuned without touching the player.
