# Design

## The score (engine/audio/music-score.ts)

- `hallBarNotes(bar)` is pure, like `barNotes`. It returns a 16-bar loop at `HALL_BPM` = 76.
  - **Harmony:** D minor – B♭ – C – A | D minor – G minor – B♭ – A.
  - **Melody:** an 8-bar lyre melody over a quieter lyre arpeggio and a choir pad.
  - **Second pass:** bars 8–15 add a soft frame drum on 1 and 3, and the bass on half notes.
- Tests check that it loops (bar 16 = bar 0), that the second pass is fuller, and that every pitch is in the range the instruments are tuned for.

## The player (engine/audio/music-player.ts)

`MusicPlayer` takes a `piece`, either `'battle'` (today's, driven by `setTier`) or `'hall'`, and an optional fade-in. Its instruments, scheduling, mix and `end()` fade are shared.

## The Hall's own audio (engine/audio/hall-music.ts)

`HallMusic` is exported through `engine/index.ts` as `createHallMusic(volume)`:
- `play()` makes one `AudioContext` the first time it is needed, resumes it, and starts a fresh `MusicPlayer('hall')` with a 2 s fade-in.
- `stop()` fades the player out (`end()`) and suspends the context afterwards, so a run's audio has the device to itself.
- `setVolume()` follows the setting.
- **Autoplay:** browsers keep a new context suspended until a gesture, so the same first keydown, pointerdown or touchend unlock the sound player uses resumes it.
- **No audio:** without Web Audio (tests, old browsers) it is silent and never throws.

## Angular (app/core/menu-music.ts)

`MenuMusic` is a root service, started from `App`:
- **Routes:** on every `NavigationEnd` it plays unless the URL is `/play` or `/intro`, and stops otherwise.
- **Volume:** an effect passes `Progression.settings().musicVolume` to it.
- Angular imports only `createHallMusic` from the engine's index (D2/D3). The `/play` and `/intro` screens keep their own audio.

## Tests

- **Score:** the loop, the fuller second pass, and the pitch range.
- **Service:** with a fake `HallMusic`, routes start and stop it and volume changes reach it.
- **Playtest:** heard in the browser.
