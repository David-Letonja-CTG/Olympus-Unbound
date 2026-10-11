# hud Specification

## Purpose
Defines the information the player sees about their run while playing and the audio-visual feedback that keeps combat readable and satisfying.

## Requirements

### Requirement: Run HUD
While playing, the HUD SHALL show health and maximum health, level and XP progress, elapsed run time, gold collected, kills, the ability cooldown, the held weapons, armour and relics with their levels, and active synergies. It SHALL stay readable over a crowded arena and SHALL NOT block the centre of the screen.

#### Scenario: Taking damage
- **WHEN** the player loses health
- **THEN** the health bar shows the new value within a tenth of a second

#### Scenario: Picking a weapon
- **WHEN** the player picks up `war_hammer` from a level-up
- **THEN** the HUD lists `war_hammer` at level 1

### Requirement: Boss HUD
While a boss is alive, a boss health bar with the boss's name SHALL be shown at the top of the screen.

#### Scenario: Boss health
- **WHEN** the `cyclops` loses a quarter of its health
- **THEN** the boss bar shows 75%

### Requirement: Combat readability
The player, enemies, elites, enemy projectiles, pickups and boss telegraphs SHALL be visually distinct. Hits SHALL flash the enemy; damage numbers SHALL appear (critical hits emphasized) unless disabled in settings; the player taking damage SHALL be clearly signalled.

#### Scenario: Damage numbers disabled
- **WHEN** damage numbers are turned off in settings
- **THEN** hits show no numbers but still flash the enemy

### Requirement: Sound feedback
Weapon attacks, hits, kills, pickups, level-ups, player damage, boss attacks and the run's end SHALL have sound effects at the configured volume. Bursts of identical sounds SHALL be limited so that a large horde does not produce noise.

#### Scenario: Many kills at once
- **WHEN** fifty enemies die in the same step
- **THEN** only a few kill sounds play

### Requirement: Themed, legible HUD
The HUD SHALL use the game's dark ornate visual language (carved stone, dark iron, gold) while keeping every piece of information required by the run HUD. Text and bars SHALL keep a contrast ratio of at least 4.5:1 against their own backgrounds, and the HUD SHALL stay out of the centre of the screen.

#### Scenario: Health vessel
- **WHEN** the player has 60 of 120 health
- **THEN** the health vessel is half full and shows 60 / 120

#### Scenario: Ability slot
- **WHEN** the ability has 10 of 25 seconds of cooldown left
- **THEN** the ability slot shows a darkened sweep covering 40% and the remaining seconds

### Requirement: Boss banner
While a boss is alive, its name, title and health SHALL be shown in an ornate banner at the top of the screen.

#### Scenario: Banner on arrival
- **WHEN** the `cyclops` arrives
- **THEN** the banner shows "The Cyclops", its title and a full health bar
