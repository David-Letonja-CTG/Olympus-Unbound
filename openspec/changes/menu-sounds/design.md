# Design

## Unlocking (engine/audio/unlock.ts)

`unlockOnGesture(ctx, wanted)`:
- **Listening:** it listens for `keydown`, `pointerdown`, `pointerup`, `mousedown`, `touchend` and `click`.
- **Trying:** on each one, if `wanted()`, it calls `resume()`, and removes its listeners once the context reports `running`.
- **Why this fixes it:** a gesture the browser does not count (a touch's `pointerdown`) no longer uses up the unlock.

Callers:
- `SoundPlayer` uses it with `wanted` always true.
- The menus pass whether they want sound now, so a gesture during a run cannot wake the suspended menu context.

## Menu audio (engine/audio/menu-audio.ts)

`createMenuAudio({ musicVolume, sfxVolume })` replaces `createHallMusic`:
- **One context:** it makes one `SoundPlayer` on first use (its own `AudioContext`, unlocked as above).
- **The theme:** the Hall theme's `MusicPlayer` runs on the same context, so it fades in and out, suspends during runs, and follows the Music volume as before.
- **`cue('select' | 'confirm')`:** plays the new `SoundPlayer` cues `menuSelect` and `menuConfirm` on the `ui` bus, centred, at the Sound effects volume.
  - **First press:** if the context is not running yet (the press that unlocks it), the cue waits for `resume()` and then plays.
- **`menuSelect`:** a short triangle pluck near A5 with a soft high overtone.
- **`menuConfirm`:** two rising plucks, D5 then A5, with a little reverb.

## Angular (app/core/menu-sound.ts)

`MenuMusic` becomes `MenuSound`:
- **Routes and volumes:** the same route rule, now passing both the Music and the Sound effects volumes.
- **Clicks:** a capture-phase `click` listener on the document plays `confirm` for an enabled `.btn-primary`, and `select` for any other enabled `button`, `a[href]`, `[role=radio]`, `[role=tab]` or `[role=checkbox]`.
- **During a run:** no cue plays on `/play`, which has its own interface sounds.

## Tests

- **Unlock:** a fake context that refuses the first resume and accepts the second. The unlock keeps listening and stops once running.
- **Service:** clicks on a primary button, an ordinary button and a disabled one; none on `/play`.
- **Cues:** both exist on the `ui` bus.
- **Browser:** checked as before, plus the click cues.
