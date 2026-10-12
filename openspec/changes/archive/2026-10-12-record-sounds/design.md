# Design

- **Files:** `client/public/assets/sounds/`:
  - `kenney/` (OGG, an unmodified selection);
  - `spells/` and `thunder/` (cut, faded, normalized and resampled to 22 kHz mono 16-bit WAV in Chromium with an `OfflineAudioContext`; about 1.5 MB in all).
  - Each is a `sound` file in `content/assets.ts`. `AssetFile.type` gains `sound`, which a sprite may not use, and `npm run assets:check` covers them.
- **`engine/audio/recorded.ts`:**
  - `RECORDED` gives each cue its layers: a file id, or several variants picked at random; a gain, delay and playback rate.
  - `recordedIds()` lists every file used; `soundFiles()` reads the manifest.
- **`SoundPlayer.load(files)`** fetches and decodes in the background.
  - `play` uses a cue's recordings when every layer has a decoded variant, otherwise its synthesized voices.
  - Recordings pass through the same placement chain, bus voice limits, reverb send and limiter, and pitch variation scales their playback rate.
- Both sessions (the game and the intro) load the files. The engine still never imports content: the manifest arrives with the content (D2).
- **Tests:** every recording a cue uses is a sound file in the manifest; the abilities use their storm, water, ice and fire recordings. In the browser, every sound file loads (HTTP 200) and decodes.
