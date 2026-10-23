## ADDED Requirements

### Requirement: Observing the run
The Director SHALL observe the run at a fixed interval of simulation time without changing it: the living gods' health against their maximum (fallen gods count as empty, gods who left are ignored), damage taken since the last observation, threats near living gods (monsters, elites and champions, the boss, warned hazards, hostile projectiles), kills per second over the last half minute, how far each god has moved in the last 20 seconds, the encounters under way, the realm state and the time since the last major encounter. It SHALL combine them into a pressure from 0 to 1 as a weighted sum of named factors whose weights and scales are content (`balance.director`).

#### Scenario: Pressure rises in a crowd
- **WHEN** 60 monsters surround a god at full health in `mount_olympus`
- **THEN** the threat factor is at its maximum and the pressure is above the threshold for major encounters

#### Scenario: Observation changes nothing
- **WHEN** two runs with the same seed and inputs are stepped, one of them also reporting the Director's state every step
- **THEN** both runs are identical

### Requirement: Pacing and recovery
The Director SHALL consider starting an encounter once per second of simulation time, never before a realm's first quiet stretch has passed, and never within a gap after the last encounter ended (a longer gap after a major one). The chance to start SHALL grow with the quiet time after the gap and fall with the pressure. Major encounters SHALL NOT start while the pressure is above the major threshold; no encounter but a blessing SHALL start while the boss is awake. Pressure above the high threshold for a sustained time SHALL open a recovery window during which no major encounter starts and relief encounters are favoured. At most two encounters SHALL run at once, at most one of them major.

#### Scenario: No pile-up
- **WHEN** an invasion is active
- **THEN** no other major encounter starts until it has ended and the major gap has passed

#### Scenario: Recovery
- **WHEN** the pressure has stayed above the high threshold for 10 seconds
- **THEN** for the next 30 seconds no major encounter starts, and a shrine is weighted up

#### Scenario: The boss's realm
- **WHEN** the boss of `mount_olympus` is awake
- **THEN** only a shrine may start, and an encounter still giving its warning is cancelled

### Requirement: Deterministic selection
The Director SHALL choose among eligible encounters by weight using its own seeded random stream (`chaos`), so the same seed, content and inputs give the same encounters at the same steps. An encounter SHALL be eligible only when its realm list (if any) includes the current realm, the realm's time is past its start, the depth is at least its minimum, its cooldown has passed, it has not reached its count for this realm, the pressure is within its band, the realm state meets its requirements, and no conflicting encounter is under way. Encounters offered only by contracts SHALL never be chosen on their own. Each rejection SHALL have a reason the debug report can show.

#### Scenario: Same seed, same story
- **WHEN** two runs of `zeus` in `mount_olympus` with seed 7 are played by the same autopilot for six minutes
- **THEN** both start the same encounters at the same steps with the same outcomes

#### Scenario: Realm restriction
- **WHEN** an encounter is limited to `the_underworld`
- **THEN** it is never eligible in `mount_olympus`, with the reason "realm"

#### Scenario: Cooldown
- **WHEN** a `roaming_elite` ended 30 seconds ago and its cooldown is 120 seconds
- **THEN** it is not eligible, with the reason "cooldown"

### Requirement: Encounter lifecycle
Every encounter SHALL pass through *telegraph* (announced and marked, not yet dangerous), *active*, *resolving* (its outcome announced, its entities and effects cleaned up) and end *completed* or *failed*; it MAY be *cancelled* from any phase before it ends. Any other transition SHALL be refused. Rewards and realm-state changes SHALL apply exactly once, when it completes or fails; a cancelled encounter SHALL give no reward, change no realm state and leave no marker, modifier, hunter or champion behind. Passing a gate SHALL cancel every encounter under way; the end of a run SHALL leave nothing for the next run.

#### Scenario: Refused transition
- **WHEN** an encounter in its telegraph is asked to complete
- **THEN** the request is refused and it stays in its telegraph

#### Scenario: Rewarded once
- **WHEN** an invasion is repelled and its ending is applied twice
- **THEN** its gold and chest appear once

#### Scenario: Through the gate mid-encounter
- **WHEN** the party passes a gate during an eclipse
- **THEN** the eclipse is cancelled, the next realm has normal light and monster speed, and no reward is given

### Requirement: Realm state
A run SHALL keep a realm state of corruption (0–100) and a grudge (0–2), starting at 0. Encounter outcomes SHALL change them by content-defined amounts, clamped to their ranges. Entering a deeper realm SHALL add a set amount of corruption. Encounters MAY require minimum or maximum values. The state SHALL last for one run.

#### Scenario: Clamped
- **WHEN** corruption is 95 and an invasion is overrun (+20)
- **THEN** corruption is 100

### Requirement: Monster Invasion
An invasion SHALL mark a rift away from the gods (not inside any god's view when possible) and announce it with its direction, then after its warning spawn invaders around the rift in stages, choosing kinds from the realm's current spawn phase unless the content names them, never within a safe distance of a living god; a stage SHALL follow when the previous one is mostly defeated or after a set time; the last stage MAY bring an elite of the realm. Stage sizes SHALL scale with the party and depth within configured limits. It SHALL be repelled when every invader is defeated, and overrun when its time runs out with invaders left (they stay as ordinary monsters).

#### Scenario: Repelled
- **WHEN** the party defeats every invader of `monster_invasion` before its time runs out
- **THEN** "The invasion is repelled" is announced, gold and a treasure chest appear where the last invader fell, and corruption falls by 10

#### Scenario: Overrun
- **WHEN** invaders are still alive when its time runs out
- **THEN** it fails, they keep fighting, and corruption rises by 20

### Requirement: Eclipse of Olympus
An eclipse SHALL need corruption of at least 25. Its warning SHALL darken the realm gradually; while it is active, monsters SHALL move faster and arrive more often by content multipliers, and after a set time a champion (an elite of the realm, marked) SHALL arrive after its own arrival mark. Slaying the champion SHALL break the eclipse at once (its best outcome); otherwise the party endures it when its time ends and the champion withdraws. Light, monster speed and spawning SHALL return to normal when it ends or is cancelled. The darkness SHALL keep the light map above its readable floor (D13).

#### Scenario: Broken
- **WHEN** the champion of `eclipse_of_olympus` is slain
- **THEN** the eclipse ends at once, "The eclipse breaks" is announced, a chest and gold appear, and corruption falls by 30

#### Scenario: Restored
- **WHEN** an eclipse ends by time
- **THEN** monsters move at their usual speed and the light is the realm's own again

### Requirement: Roaming Elite and the Vengeful Hunter
A hunt SHALL mark its arrival point at the edge of the view and announce the hunter by name and title (from the party's most damaging element), then spawn exactly one hunter of the realm's elites with content multipliers on health and speed, marked as a champion. It SHALL pursue the nearest god and make telegraphed attacks on a rhythm. Slaying it SHALL succeed; surviving until its escape time SHALL make it escape (removed, with an effect) and fail. `roaming_elite` escaping SHALL add one grudge and corruption; `vengeful_hunter` SHALL be eligible only with a grudge, and slaying it SHALL clear the grudge and lower corruption, while its escape SHALL raise corruption further. The hunter SHALL never be spawned twice by one encounter; if no place to spawn is found within a few seconds, the hunt SHALL be cancelled.

#### Scenario: The chain
- **WHEN** the hunter of `roaming_elite` escapes, and later `vengeful_hunter` starts and its hunter is slain
- **THEN** the grudge goes from 0 to 1 and back to 0, and the second hunt's reward includes a treasure chest

#### Scenario: Escaped twice
- **WHEN** the vengeful hunter escapes with corruption at 15
- **THEN** corruption is 35 and `eclipse_of_olympus` has become eligible

### Requirement: Divine blessings
A shrine SHALL rise a short walk from a living god (further when the gods have stood still), announced and marked, and stand for a set time. The first living god to step in SHALL bless every living god with one boon, chosen by the Director's stream and weighted toward defensive boons while the party struggles. A boon SHALL add its stat modifiers for its duration in simulation seconds, refresh (not stack) when received again, and be removed with the stats restored when it expires. Boons SHALL be content data; encounter rewards MAY grant them too. A shrine nobody visits SHALL fade with no penalty.

#### Scenario: Blessed
- **WHEN** a god steps into a shrine offering `fury_of_ares` (+25% might, 30 s)
- **THEN** every living god's might is 25% higher, the HUD shows "Fury of Ares" with its seconds left, and 30 seconds later their might is as before

#### Scenario: Paused
- **WHEN** the run is paused for a minute while a boon has 10 seconds left
- **THEN** it still has 10 seconds left when the run resumes

### Requirement: Divine contracts
A contract SHALL raise an altar near the party and show its objective, risk and reward on the HUD with the time left to decide. A living god stepping into the altar SHALL accept it for the party: the offered encounter starts at once, with the contract's bonus added to its success reward. Letting the altar fade SHALL decline it with no penalty and no change to the realm state. `champion_contract` SHALL need three elites slain in the run; `purge_contract` SHALL need corruption of at least 40.

#### Scenario: Declined
- **WHEN** nobody steps into the altar of `champion_contract` before it fades
- **THEN** nothing is spawned, no realm state changes, and "The offer is withdrawn" is announced

#### Scenario: Accepted
- **WHEN** a guest steps into the altar of `purge_contract`
- **THEN** the purge invasion starts for the whole party and, if repelled, corruption falls by 40 and the bonus gold appears

### Requirement: Adaptive rules
The Director SHALL adapt only the weights of its choices, from observed facts, at most once per adaptation interval, and record why: a party in recovery or below 40% health weights up relief; a party killing at least four monsters a second over half a minute while the pressure is low weights up durable encounters; a party whose every living god has stayed within a small radius for 20 seconds weights up encounters that make it move. Adaptive rules SHALL NOT change any monster's, hunter's or god's numbers.

#### Scenario: Not every time
- **WHEN** a dominant party is offered a durable encounter by adaptation
- **THEN** the next choice within 90 seconds uses the plain weights

#### Scenario: No hidden counters
- **WHEN** a dominant party and a struggling party each meet `roaming_elite` at the same realm time and depth
- **THEN** both hunters have the same health, damage and speed

### Requirement: Rooms
In a room the host's simulation SHALL alone run the Director; guests SHALL see rifts, arrival marks, shrines, altars, champions and the eclipse's darkness from the snapshot, the encounters and their own blessings on their HUD, and announcements from the events. Any living god, a guest's included, SHALL count for stepping into shrines and altars. A player who leaves SHALL no longer count toward the pressure.

#### Scenario: A guest sees the eclipse
- **WHEN** an eclipse is active in a room
- **THEN** the guest's world is darkened and the guest's HUD shows the eclipse with its time left

### Requirement: Debugging
A debug session SHALL be able to switch the Director off and on, start any encounter, and read a report of the pressure and its factors, the mood (calm, building, peak, recovery), the encounters under way with their phases and time left, every encounter's eligibility or rejection reason and cooldown, the realm state, recent decisions and outcomes, and the stream's name. A run whose rules switch the Director off SHALL start no encounter.

#### Scenario: Off
- **WHEN** a run is started with the Director off and played for ten minutes
- **THEN** no encounter starts and the realm's timeline plays as before
