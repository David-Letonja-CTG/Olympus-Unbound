## ADDED Requirements

### Requirement: Cooldowns and stamina
The HUD SHALL show the player's stamina as a bar under the health vessel. The ability slot's cooldown sweep SHALL turn smoothly (not in visible steps) and the slot SHALL flash once when the ability becomes ready. Every weapon slot SHALL show a sweep for the share of its cooldown still to run. A dash pip SHALL show the dash's recovery and whether there is stamina enough for a dash.

#### Scenario: Stamina bar
- **WHEN** the player has 40 of 100 stamina
- **THEN** the stamina bar under the health vessel is 40% full

#### Scenario: Weapon cooldown
- **WHEN** a weapon with a 2-second cooldown fired half a second ago
- **THEN** its slot shows a sweep covering about 75%

#### Scenario: Ability ready
- **WHEN** the ability's cooldown ends
- **THEN** the ability slot flashes and shows no sweep

#### Scenario: Too tired to dash
- **WHEN** the player has less stamina than a dash costs
- **THEN** the dash pip is dimmed
