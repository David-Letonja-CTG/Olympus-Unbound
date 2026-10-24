# Design

- **Art:** `engine/art/sprites.ts` gains a `FUSION_CRESTS` table: key → glyphs (one or two existing symbols), tier and colour.
  - The `crest` painter draws a hex with a bronze-and-gold gradient rim and a stone face tinted by the colour.
  - It adds 1–3 gold pips along the top edge.
  - It draws the glyphs: one centred, or two overlapped (the first upper-left, the second lower-right, each at 62% size), with the same worn-metal finish as other icons.
  - New symbol `laurel` (a wreath round a star) for `apotheosis`.
- **Validation:** an engine test asserts that every content fusion's `visual.sprite` is a key of `FUSION_CRESTS`, without the engine importing content.
- **Event:** `applyOffer` emits `{ type: 'fusionTaken', id, name, tier, x, y }` at a fusion's first level, in place of the synergy event, plus the announcement.
  - The view plays a burst of radius 140 × tier and sparks.
  - Tier III also gets a full-screen golden flash and a 900 ms shake.
  - Sound: `synergy` for tiers I–II; a new `apotheosis` cue for tier III (rising brass-like chord and shimmer).
- **Tests:** the event at first level only, carrying the tier; every fusion sprite is a crest; the art gallery (`/dev/art`) shows them.
