# Design

- **`engine/audio/sound-player.ts`** stays the only module that knows how a cue sounds (D9).
  - A cue is a list of voices: an oscillator (wave, pitch glide, optional detuned twin) or filtered noise (filter type, cutoff sweep, Q). Each voice has attack and decay, optional drive (a waveshaper), a delay, and a reverb send.
  - Cues belong to a bus: `weapon`, `impact`, `enemy`, `player` or `ui`. Each bus has its own gain and voice limit, and all buses feed a compressor used as a limiter, then the master volume. The reverb is a convolver with a generated, decaying impulse.
  - `play(cue, at?)` takes an optional world position. `setListener(x, y, halfWidth)` is called by the scene each frame with the camera's view. Pan is the offset from the view's centre over its half-width, clamped to ±0.8. Gain falls off past the view's edge: full inside, gone at two view-widths. A pure function `placement()` computes both and is unit-tested.
  - Pitch varies ±4% per play (cosmetic `Math.random`, outside the simulation, D5 untouched).
- **`phaser/arena-scene.ts`** maps events to cues:
  - weapons and abilities by ID (`ATTACK_SOUNDS`), falling back to their behavior;
  - hits by element; kills by elite or boss;
  - boss attacks by kind; resolved hazards by shape;
  - `gateOpened`, `playerRevived` and `realmEntered`.
  - World events pass their position.
- **Tests:**
  - every weapon and ability in the content has a distinct cue, and every cue has voices;
  - `placement()` pans and attenuates as specified;
  - the existing burst limit is kept.
