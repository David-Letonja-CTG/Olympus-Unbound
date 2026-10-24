## MODIFIED Requirements

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

## ADDED Requirements

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
