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
On level-up the run SHALL pause and offer three different upgrades that are valid for the current loadout. Choosing one SHALL apply it immediately and resume the run. Choices SHALL be selectable by mouse, number keys 1–3, arrow keys with Enter, and gamepad d-pad with the south button.

#### Scenario: Choosing an upgrade
- **WHEN** the player levels up and picks `+1 level: thunder_spear`
- **THEN** `thunder_spear` is at level 2 and the run resumes

#### Scenario: No invalid offers
- **WHEN** `thunder_spear` is at its maximum level and the player has the maximum number of weapons
- **THEN** no offer upgrades `thunder_spear` and no new weapon is offered

#### Scenario: Everything maxed
- **WHEN** no upgrade is valid
- **THEN** the player is offered a heal and a gold reward instead

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
