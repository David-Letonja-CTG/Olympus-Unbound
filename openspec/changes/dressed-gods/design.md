## Context

Characters are pre-rendered in Blender from the Flare and CC0 models (`art/blender/`, D15). `flare_render.py` renders whole frames, `pack-sheet.mjs` packs them into 8-column sheets, and `assets.ts` names the frame ranges (`humanoid()`: idle 0–3 at 4 fps, walk 4–11 at 10 fps, swing 12–15, death 18–23). `world-view.ts` draws each player as one pooled sprite from `god.visual.sprite`, with only idle and walk. The player's gear is in `player.loadout` (weapons with level and evolution, armour `{def, level}`, relics). Guests get players through the snapshot (`net/snapshot.ts`) without the loadout. Sheets can already be recoloured at load (`recolor`, Kronos).

## Goals / Non-Goals

**Goals:** twice the frames on every character, and a god's armour, weapon, evolutions, relics, crown and skin visible in the run, in rooms and in the menus. The cost of adding content stays low: a new armour needs no rendering, a new weapon one layer per base body, a new skin one colour.

**Non-goals:** new models or rigs, combinations rendered per god × gear, changes to the rules, skins for enemies.

## Decisions

**1. In-between frames come from the rigs, not from interpolating images.** After each source frame `flare_render.py` renders the pose halfway to the next one, blending the evaluated bone and object transforms (lerp, and slerp for rotation). Subframes were rejected because the creatures' poses are baked with constant interpolation, where a subframe shows no motion. Each source animation is a range on one action timeline, so a loop's last in-between blends back to the loop's first frame (`LOOPS`, default idle 1–4 and walk 5–12). Source frame f is sheet frame 2f. One-shots (swing, death) use `2n − 1` frames. `humanoid()` and `beast()` get the doubled ranges and fps. *Alternative rejected:* optical-flow tweening of the PNGs, which blurs limbs and adds a tool. The cost is one full re-render of the cast; sheets double in frame count.

**2. A god is three layers on one frame index.** For each god, look and frame there is:
- **Body:** the god empty-handed (`<god>_body`, the god's own script with `EMPTY_HANDED`). The armed sheet stays for portraits, cutscenes and as the fallback while the body loads.
- **Armour look:** looks 1–3 as one layer per base body (`armour_hero_<n>`, `armour_heroine_<n>`): flared shoulder plates; then a crested helm, a cuirass and a skirt of strips; then a long cape. Rendered in matte neutral grey, they are multiplied by the worn armour's colour at draw time. So any armour, existing or future, colours the look without rendering. This replaces the earlier plan of a full body sheet per look plus a trim layer: 6 sheets instead of 12 + 6, and the user chose bold outlines over subtle trims.
- **Weapon:** each weapon rendered once per base body (`hero` for Zeus, Hades and Poseidon, `heroine` for Athena) on Flare's own layer file for that kind of weapon, where it is already in the hand and the figure is a holdout. That is 10 weapons × 2 bodies = 20 sheets. The god's content names its body (`figure`).

In every layer the figure is a holdout that casts no shadow. The view sets each layer to the body's current frame on every draw, so they cannot drift. The look's change pose is the Flare cast (frames 24–27, the `cast` animation of god figures).

**3. The look is derived, never stored.** A pure engine function `playerLook(loadout)` returns `{ look, armourColor, weapon, evolutionColor, relicColors }`:
- `look` comes from the armour level: 0 without armour, 1 at level 1, 2 from level 2, 3 at the armour's last level.
- `weapon` is the highest level, and the earliest taken on a tie (loadout order).
- `relicColors` holds up to 6 colours.

It lives in the simulation layer (no Phaser) so it is unit-tested and shared by the view and the snapshot. It reads state and writes nothing (D5). Thresholds are rules about drawing, not content per god, so they need no data (D4).

**4. View state for the transitions.** `world-view.ts` keeps per-player view state: last look (for the column of light), the swing (started when `abilityTimer` jumps up), knockback offset, and the evolution trail (the weapon layer's last 3 positions, pooled). The swing starts when the player's `casts` counter changes (the simulation counts ability casts, wrapping at 256). That works the same for a guest's snapshot, which has no ability timer. The dash lean uses `dashTime`, which guests get as one flag bit. The knockback direction needs the hit's direction, so `damagePlayer` takes where the blow came from and records `hurtX/hurtY` (a unit vector). Without a source it uses the god's back. These fields are deterministic and are in the snapshot (format 9). A walk already starts from its first frame, a step, so no `walkStart` field is needed.

**5. Head anchors.** The render script projects the head bone into the frame for every frame (`world_to_camera_view`) and writes `anchors.json`. `render-all.mjs` keeps them in `art/blender/anchors/`, and they ship with the god looks once crowns need them (PR 3). Crowns sit on the anchor. The last phase's eye light sits at a fixed height on the figure, which needs no data. The crowns are code-drawn (`engine/art/`), so there is no extra render per god.

**6. Skins are recolours, unlocks reuse existing records.** A `SkinDefinition { id, god, name, recolor, unlock: { achievement } | { eventReward } }` lives in content (`content/skins.ts`). Recolour reuses the `recolor` path and applies to body sheets only; trim and weapon keep their colours. `EventRewardDefinition.effect` gains `{ type: 'skin'; skin }`. Unlocks are derived from `achievements` and `eventRewards` already in the save, so only the choice is new. First skins: one per god from its god achievement (`zeus_tempest` ← `storm_lord`, `hades_ash` ← `lord_of_the_dead`, `poseidon_deep` ← `earth_shaker`, `athena_owl` ← `grey_eyed`) and `hades_shroud` from the Night of Hecate's shop.

**7. Save v12** (D8). `skins: Record<godId, skinId>` and `crowns: Record<godId, 'laurel' | 'gold'>`. Crowns are granted in the existing run-reward path, so they are idempotent per run ID. A crown is only ever raised. Migration from v11: empty maps. Loading drops unknown gods and skins. The run outcome has to say whether a boss (and which) was beaten; it already reports bosses, so the app maps that to the god played.

**8. Skin and crown travel as player profile.** `createGameSession` gets each player's `{ skin, crown }` beside the name. `Player` keeps them read-only, and the rules never read them. In rooms, guests send them in their join message, and the host includes them in the roster. The snapshot carries each player's derived look: the look number, the armour colour, the held weapon's id (name table), the evolution colour and up to 6 relic colours (snapshot format 10) (D16: the host's state is the truth; the guest only draws it).

**9. Loading.** A run loads up front every non-character file, plus the character sheets it needs: its gods' bodies and armed sheets, the gear layers of their body types, and the realm's monsters (timeline and events) and boss (`engine/data/run-files.ts`). Any other character sheet loads the first time the view draws it, and the code-drawn art stands in until then. A layer not yet loaded is not drawn. This also brings PR 1's doubled sheets back down: a run no longer loads every realm's monsters. The codex gets a Gods tab whose entry shows the four looks. It composites the body's idle frame with each armour layer, tinted in the god's colour.

**10. Readability (D13).** Motes, trims and glows draw at the player's depth, under enemy projectiles, telegraphs and pickups. They are checked at Low and High. The column of light is short and does not use the full-screen flash reserved for lightning.

## State ownership

| State | Owner |
|---|---|
| Loadout, armour level, weapon levels, evolutions, relics, `hurtX/Y` | Simulation |
| Derived look | Simulation function, recomputed each draw, not stored |
| Player profile (skin, crown) | Set by the app through `createGameSession`, read-only in the simulation, sent in the roster |
| Last look, swing, knockback, trail, motes' angle | Phaser world view |
| Chosen skins, crowns | App save (v12) |
| Skin and unlock definitions | Content |

## Decisions relied on

D2/D3 (layers: Phaser only draws), D4 (data-driven: skins, base bodies), D5 (determinism: the look is derived; the swing is drawn only), D8 (save v12), D9/D12 (original art from the existing licensed bases), D13 (readable darkness), D15 (one render source), D16 (host authority in rooms).

## Risks / Trade-offs

- **Texture memory on phones.** Doubled frames plus 4 looks, trims and the weapon layers. Mitigation: sheets for a run's gods only, and measure with `scripts/perf/phone.mjs`. If needed, the in-between frames are dropped on Low (frames from every other column, at the old fps).
- **NLA loop rendering** may show a hitch at the loop seam on some Flare actions. Check every looping sheet in `/dev/art`, and render the seam frame with `STEP` off where needed.
- **Holdout layers** can leave a one-pixel halo. Render the layers with the same filter size and premultiplied alpha.
- **Re-render time.** The whole cast once, about 20 + 20 + 12 new sheets. It needs Blender and `FLARE_SOURCES` on the machine; tasks start by checking both.
- **Old saves** get no crowns for past bosses, which is accepted: crowns count from version 12 on.

## Migration Plan

Three PRs, each releasable:
1. In-between frames, body language and the boss's last phase.
2. Gear on the god (looks, trims, weapon layers, motes, the change moment, codex looks, snapshot and protocol bump).
3. Skins, crowns and save v12.

Rollback is a revert. The save migration only adds fields, so a v12 save loaded by an older build is treated as newer (the existing rule).

## Open Questions

None blocking. The exact gear per look is chosen per god while rendering, and recorded in `art/blender/README.md`.
