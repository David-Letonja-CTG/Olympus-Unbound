# Tasks

- [x] 1.1 D1 revised, D16 (host-authoritative rooms), D11 and CLAUDE.md hard rule 1; lint keeps PeerJS out of the engine
- [x] 1.2 `WorldFrame`; views read it instead of `RunState`
- [x] 1.3 `RunSimulation.leave`, `HudSnapshot.waitingFor`, per-slot inputs without mirroring
- [x] 2.1 `net/snapshot.ts` binary snapshots with round-trip tests and size measurements
- [x] 2.2 `net/protocol.ts`, `PeerLink`, memory links for tests, content fingerprint
- [x] 2.3 `RunDriver`: `LocalDriver` (solo, host with `RoomHost`), `GuestDriver` (interpolation, events, prediction, host gone)
- [x] 2.4 `ArenaScene`/`phaser-session` run on a driver; room pause; local-only hurt feedback; camera follows own god or an ally
- [x] 3.1 PeerJS dependency; `RoomNetwork` with PeerJS (lazy) and BroadcastChannel (debug) implementations
- [x] 3.2 `RoomService`: create, join, lobby protocol, start, leave
- [x] 3.3 Co-op screen and main menu entry; route guards
- [x] 3.4 Play screen in a room: party and code on the loading screen, own choices, waiting line, room pause menu, results
- [x] 4.1 Engine and app tests; E2E two-page room run
- [x] 4.2 Docs: architecture, systems, gameplay, README; playtest two tabs over PeerJS
