# Design

## Decisions

- **Host-authoritative, not lockstep.** The simulation uses `Math.sin`/`cos`/`hypot`, whose last bits may differ between browsers, so lockstep simulations would drift apart. The host runs the only `RunSimulation`; guests are views with input. This becomes D16.
- **D1 revised.** The game stays static with no server of its own. Rooms connect browsers directly over WebRTC data channels, and the public PeerJS signalling service only introduces them by room code. Nothing is stored online, and the game without rooms is unchanged. CLAUDE.md hard rule 1 and D11 follow.
- **PeerJS** (MIT) is the one new dependency. Only `app/core/rooms/` uses it, and it is loaded lazily when a room is created or joined, so menus and solo runs never load it. The engine never sees it (lint).
- **Room code:** five characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. The host's peer ID is `olympus-unbound-<code>`; if that ID is taken, the host tries another code.
- **Guests rebuild the arena** from the realm and seed with the same deterministic generator. Only cosmetic details could differ, because collisions are decided on the host.
- **Rooms close when their run ends.** A new run means a new room (non-goal: several runs per room).
- **Names live in memory** (RunSetup). No save format change.

## Layers

```
Angular (app)                          Engine (simulation side, no Phaser)          Phaser layer
───────────────────────────────────    ───────────────────────────────────────    ─────────────────────
core/rooms/                            net/link.ts      PeerLink (interface)       phaser-session.ts
  room-network.ts  RoomNetwork  ─────▶ net/protocol.ts  RunMessage, NET_VERSION      picks the driver
  peer-network.ts  PeerJS (lazy)       net/snapshot.ts  encode/decode (binary)     arena-scene.ts
  local-network.ts BroadcastChannel    net/world-frame.ts WorldFrame (views read)    draws driver.world
                   (?debug&net=local)  net/drivers.ts   LocalDriver (solo/host)     world-view, effects
  room-service.ts  lobby protocol,     net/host.ts      RoomHost (relay)              read WorldFrame
                   signals             net/guest.ts     GuestDriver (replica,
features/coop/coop-screen.ts                            prediction, events)
features/game/play-screen.ts ──── createGameSession({ room: { role, links | link, … } })
```

- **`PeerLink`**: a reliable, ordered channel to one browser, with `send`, `onMessage`, `onClose` and `close`. The app adapts PeerJS `DataConnection`s and the debug `BroadcastChannel` to it, and tests use in-memory pairs (`engine/testing/memory-link.ts`).
- **`WorldFrame`**: the read-only shape the views draw (players, enemies, projectiles, hostile projectiles, pickups, hazards, the boss, and `span`, the seconds between previous and current positions). `RunState` satisfies it structurally, with `span = STEP`. A guest's replica builds one from two snapshots. `WorldView.sync` and `Effects.update` take a `WorldFrame` instead of a `RunState`.
- **`RunDriver`**: what `ArenaScene` needs to run a game. It provides `arena`, `realm`, `content`, the local player, `phase`, `advance(dt, input)`, `world` + `alpha`, drained `events()`, `hud()`, `pause`/`resume`, `setView`, and `shared` (a room run, which pause does not stop).
  - `LocalDriver` wraps a `RunSimulation`. It does solo runs and, with a `RoomHost`, a host's run.
  - `GuestDriver` replays the host's world.
  - The scene loses every direct `RunSimulation` reference.

## Protocol (`net/protocol.ts`)

Lobby messages are the app's (`room-service.ts`); run messages are the engine's. Both travel on the same link.

| Direction | Message | When |
|---|---|---|
| guest → host | `input {seq, x, y, ability}` | Every guest step while playing (60 Hz, a few bytes). The ability is a latched tap. |
| guest → host | `choose {choiceId, index}` | When the guest picks an offer. The host checks the choice is that guest's. |
| host → guest | `frame {snapshot: ArrayBuffer, ack, events}` | 20 Hz of real time. `ack` is the guest's last input seq the host has applied. `events` are the visual SimEvents since the last frame. |
| host → guest | `hud {hud, result?}` | 10 Hz, the guest's own HUD. Every 10th carries their current result, so a guest whose host vanishes keeps their earnings. |
| host → guest | `choice {choice}` | The guest's own offer round. |
| host → guest | `ended {result}` | The run ended. This is the guest's own result. |

Room messages (app): `hello {version, name, godId, modifiers}` → `welcome {slot}` or `refused {reason}`. Then `lobby {members, realmId}`, `update {name?, godId?, ready?}`, `start {runId, realmId, seed, party}`, and `leave`. `version` is `NET_VERSION` plus a fingerprint of the content IDs, so different builds refuse each other.

## Snapshot (`net/snapshot.ts`)

The snapshot is binary and little-endian. Its header holds the format version, the phase, the sim time (f32), counts, and a per-snapshot string table (sprite keys, enemy and god IDs).

- **Positions:** u16 at ⅛ px. Arenas are 4096 px, and the range allows 8191.
- **IDs:** u32. The ID counter is shared with projectiles and passes 65535 in a long run.

| Entity | Fields | Bytes |
|---|---|---|
| player | id, x, y, god, radius, moveSpeed, flags (alive, moving, facing left), hurtFlash, invulnerable | ~16 |
| enemy | id, def, x, y, radius, flags (dead, elite, boss, windup, hit flash, stun, burn, shock, slow, facing left), health ratio u8, dash dir i8×2 | ~18 |
| projectile | id, sprite, x, y, angle u8, element + orbit | ~12 |
| hostile projectile | id, sprite, x, y, angle | ~10 |
| pickup | id, kind (xp small/large, chest, heal, gold, …), x, y | ~9 |
| hazard | shape, x, y, x2, y2, radius, width, progress u8 | ~14 |

Worst case (caps 400 / 300 / 120 / 400) is about 17 KB per snapshot, or about 340 KB/s per guest at 20 Hz. A typical fight with 150 enemies, 80 projectiles and 150 pickups is about 5 KB per snapshot (100 KB/s). Measured in tests, not assumed.

## Guest

- **Interpolation:** snapshots are buffered by sim time. Render time advances with real time and is steered toward `latest − 100 ms`, snapping if it is more than 250 ms off. The replica holds the two bracketing snapshots, so `px/py` is the older position, `x/y` the newer, and `alpha` the fraction between them. The views keep their own `lerp`, and `span` makes their speed-based animation rates right.
- **Events** carried by a frame are released when render time reaches that frame, so hits and kills line up with the drawn world. Sound and shake for `playerHurt` happen only for the local player, on host and guest alike.
- **Prediction (own god only):** each guest step moves the predicted position by input × the god's move speed from the snapshot, then resolves collisions against a local `WorldCollision` built from the same arena. Each step's input seq and predicted position are recorded. When a frame acks seq `a` with the host's position `H`, the guest adds the error `H − predicted(a)`, eased over a few frames and snapped if it exceeds 64 px. Dead or not playing: no prediction, and the guest follows the host.
- **Host gone** (link closed): the session ends with the last result received, marked `abandoned`.

## Host

- `RoomHost` keeps each guest slot's latest input and seq, latching ability taps until a step uses them. Every step it builds a per-slot input array (`NO_INPUT` for missing or left slots; this also fixes `inputs[slot] ?? inputs[0]`, which mirrored the host's input).
- After each frame it forwards events, choices and HUDs as above. `choice` events go only to the player they belong to; the host's own UI sees only its own.
- A closed guest link calls `RunSimulation.leave(playerId)`. The player leaves the battle (not alive, `left`), their open choice is dropped (the round completes if they were the last), and an announcement names them.
- `HudSnapshot.waitingFor` lists the names of players who still have an open choice.

## Pause in a room

`LocalDriver.shared`/`GuestDriver` turn pause into a local menu only: the session emits `paused`/`resumed` without stopping the simulation, and the local input is `NO_INPUT` while the menu is open. Auto-pause on blur is off in rooms. The host's *End run for everyone* abandons the run, and every guest receives `ended`. A guest's *Leave room* closes their link and ends their session as abandoned.

## Testing

- **Engine:** snapshot round-trip and sizes; host + guest over memory links (a guest's input moves their god on the host, prediction converges, choices reach only their owner, a guest leaving, the host leaving, ability taps); `leave`; `waitingFor`.
- **App:** room-service lobby protocol over memory links (join, full, version, ready, start), and the coop screen.
- **E2E:** two pages in one browser, with `?debug&net=local` (the BroadcastChannel network), go through create → join by code → ready → start. Both load the same run with two players, the guest moves, the host sees it, and the guest leaves.
- **Playtest:** two tabs over real PeerJS.

## Risks

- **Background tabs:** browsers throttle a hidden host tab, which slows the run for everyone. This is documented, and the host should keep the game visible.
- **NAT:** PeerJS's default STUN/TURN covers most home networks, and failure is reported as *Could not connect*.
- **Bandwidth at caps:** measured. If needed, fewer pickups would be sent, or the rate would drop to 15 Hz.
