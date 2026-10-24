# run-progression Specification

## Purpose
Defines how the player grows stronger during one run: XP and levels, level-up choices, the loadout of weapons, armour, relics and skills, synergies between them, and gold.

## Requirements

### Requirement: XP and levels
Enemies SHALL drop XP gems; collecting them (directly or by the pickup magnet) SHALL add XP multiplied by XP gain. Reaching the level threshold SHALL raise the level; excess XP SHALL carry over, and several thresholds crossed at once SHALL give several level-ups.

#### Scenario: Carry-over
- **WHEN** a level 1 player needing 5 XP collects 7 XP
- **THEN** they reach level 2 with 2 XP toward level 3

#### Scenario: Multiple levels at once
- **WHEN** a player collects enough XP for two levels in one step
- **THEN** two level-up choices are presented one after another

### Requirement: Level-up choice
On level-up the run SHALL pause and offer three different upgrades that are valid for the current loadout. Choosing one SHALL apply it immediately and resume the run. Choices SHALL be selectable by mouse, number keys 1–3, arrow keys with Enter, and gamepad d-pad with the south button. An offer that counts toward a fusion or synergy the god can reach SHALL name it.

#### Scenario: Choosing an upgrade
- **WHEN** the player levels up and picks `+1 level: thunder_spear`
- **THEN** `thunder_spear` is at level 2 and the run resumes

#### Scenario: No invalid offers
- **WHEN** `thunder_spear` is at its maximum level and the player has the maximum number of weapons
- **THEN** no offer upgrades `thunder_spear` and no new weapon is offered

#### Scenario: Running low on upgrades
- **WHEN** fewer than three upgrades other than ascensions are valid
- **THEN** ascensions fill the remaining offers, so three different upgrades are still offered

#### Scenario: Everything maxed
- **WHEN** every weapon, armour, relic, skill and reachable fusion is at its top level
- **THEN** the player is offered three ascensions

#### Scenario: Toward a fusion
- **WHEN** `war_hammer` is offered while `forge_of_hephaestus` is still locked for the god
- **THEN** the offer names `forge_of_hephaestus`

### Requirement: Loadout
A player SHALL hold up to six weapons, one armour, four relics and any number of skills within each skill's maximum level. Weapons and armour SHALL have levels up to their maximum; each level SHALL change how the item plays (damage, cooldown, count, area or effects). Run stats SHALL be the god's base stats combined with permanent upgrades, armour, relics, skills and synergies.

#### Scenario: Skill changes behavior
- **WHEN** the player takes skill `multishot`
- **THEN** projectile weapons fire one more projectile per attack

#### Scenario: Armour slot
- **WHEN** the player already wears `aegis_of_olympus`
- **THEN** other armour is not offered, but leveling `aegis_of_olympus` is

### Requirement: Build-aware offers
Offer weights SHALL favour items matching the god's affinities and the elements of weapons already held. Skills that only affect an element SHALL only be offered when the player holds a weapon of that element.

#### Scenario: Fire skill without fire weapon
- **WHEN** the player holds no fire weapon
- **THEN** `fury_of_flames` is never offered

### Requirement: Synergies
Synergies SHALL be defined in data as requirements (items, item levels or element counts) and rewards (stat modifiers). When the loadout first meets a synergy's requirements, the synergy SHALL activate for the rest of the run and be announced once.

#### Scenario: Storm synergy
- **WHEN** a player holds two lightning weapons and the relic `zeus_eye`
- **THEN** synergy `storm` activates, lightning damage and chain count rise, and the activation is announced once

### Requirement: Treasure chests
Picking up a treasure chest SHALL immediately offer an upgrade choice, like a level-up, without granting a level.

#### Scenario: Elite chest
- **WHEN** the player picks up the chest dropped by an elite
- **THEN** an upgrade choice is offered and the level does not change

### Requirement: Gold during the run
Gold coins dropped by enemies SHALL add gold multiplied by gold gain to the run's gold total, which is shown during the run and granted according to the run-outcome rules.

#### Scenario: Picking up gold
- **WHEN** the player with gold gain 1.2 picks up a 5-gold coin
- **THEN** the run's gold rises by 6

### Requirement: God arsenals
A weapon MAY belong to some gods only; such a weapon SHALL never be offered to another god, at level-up or anywhere else. Weapons that belong to no god in particular SHALL be offered to every god. Every god's starting weapon SHALL belong to that god, and every god SHALL be able to find at least four weapons in a run. Synergies that need weapons of one god SHALL only be reachable by that god.

#### Scenario: Zeus's thunderbolt
- **WHEN** `hades` levels up, at any point of a run
- **THEN** `thunderbolt` is never offered

#### Scenario: Common weapons
- **WHEN** any god levels up with free weapon slots
- **THEN** `divine_bow`, `war_hammer` and `flaming_sword` may be offered

#### Scenario: Shared between two gods
- **WHEN** `athena` levels up with free weapon slots
- **THEN** `lightning_orb` may be offered, but `soul_scythe` is not

### Requirement: Instant blessings
Level-up and treasure choices MAY offer instant blessings, defined in data. Taking one SHALL apply its effect once, at once. It SHALL take no loadout slot and leave nothing in the loadout. The same blessing SHALL be offered again at later choices whenever its condition holds. A blessing whose condition does not hold SHALL not be offered.

`call_of_hermes` SHALL call every experience gem in the realm to the gods. The called gems SHALL fly to the nearest living god from wherever they lie, faster the farther they are, so that even gems across the realm arrive within about two seconds. They SHALL be collected on contact as usual. It SHALL only be offered when at least a configured number of experience gems lie beyond every god's magnet.

#### Scenario: Calling the gems
- **WHEN** 60 experience gems lie across the realm and the player takes `call_of_hermes`
- **THEN** every one of them flies to the god and is collected within three seconds, and the XP they carry is added as usual

#### Scenario: Taken again
- **WHEN** the player took `call_of_hermes` earlier in the run and many gems lie on the floor again at a later level-up
- **THEN** `call_of_hermes` may be offered again

#### Scenario: Nothing to call
- **WHEN** fewer gems than the configured number lie beyond the gods' magnets
- **THEN** `call_of_hermes` is not offered

#### Scenario: More levels at once
- **WHEN** the called gems carry enough XP for one or more levels
- **THEN** a level-up choice follows for each level, as usual

#### Scenario: In a room
- **WHEN** a guest takes `call_of_hermes`
- **THEN** the gems fly to the nearest living god on every screen, and the XP is the party's, as usual

### Requirement: Fusions
Fusions SHALL be defined in data:

- **Requirements:** weapons, armour or skills at given levels, relics, element counts, or other fusions at given levels.
- **Tier:** I to III. A fusion of tier II or III SHALL require at least one fusion of the tier below.
- **Levels:** a top level, and stat modifiers that stack once per level.

A fusion whose requirements are all met and whose level is below its top SHALL be valid as a level-up offer, with a high weight. Taking it SHALL raise its level by one. Once taken, a fusion SHALL stay for the rest of the run even if a requirement later stops being met. A fusion that needs a weapon the god can never wield SHALL never be offered to that god, and neither SHALL any fusion that requires it.

#### Scenario: Forge of Hephaestus
- **WHEN** a god holds `flaming_sword` and `war_hammer`, both at level 6, and levels up
- **THEN** `forge_of_hephaestus` may be offered, and taking it raises fire and physical damage

#### Scenario: Not yet
- **WHEN** a god holds `flaming_sword` at level 6 and `war_hammer` at level 5
- **THEN** `forge_of_hephaestus` is never offered

#### Scenario: A higher tier
- **WHEN** `forge_of_hephaestus` and `hunters_volley` are both at their top level
- **THEN** `wrath_of_the_twelve` may be offered

#### Scenario: Another god's fusion
- **WHEN** `hades` levels up, at any point of a run
- **THEN** `sky_father` is never offered

### Requirement: Ascensions
Ascensions SHALL be upgrades defined in data with stat modifiers per level and no top level. They SHALL only be offered to fill the choice when fewer valid upgrades than the offer count remain. Taking one SHALL raise its level by one, without end.

#### Scenario: Level 120
- **WHEN** a god at level 120 has every other upgrade at its top level and levels up
- **THEN** three ascensions are offered, and taking `ascend_might` again raises damage again

#### Scenario: Plenty left
- **WHEN** more valid upgrades than the offer count remain
- **THEN** no ascension is offered
