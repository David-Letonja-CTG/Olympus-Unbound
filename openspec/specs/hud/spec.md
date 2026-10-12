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
Weapon attacks, the gods' abilities, hits, kills, pickups, level-ups, player damage, reviving, boss attacks, the gate, entering a realm and the run's end SHALL have sound effects at the configured volume. Every weapon and every ability SHALL have its own sound; hits SHALL sound by their element; an elite's or a boss's death SHALL sound heavier than a common kill. Sounds from the world SHALL be panned by where they happen relative to the view and SHALL be quieter the farther they are outside it; interface sounds SHALL be centred. Bursts of identical sounds SHALL be limited so that a large horde does not produce noise, and the mix SHALL be limited so that it does not clip.

#### Scenario: Many kills at once
- **WHEN** fifty enemies die in the same step
- **THEN** only a few kill sounds play

#### Scenario: Every weapon and ability sounds its own
- **WHEN** the content is loaded
- **THEN** every weapon and every god's ability maps to a sound cue, and no two weapons share one

#### Scenario: A sound to the right
- **WHEN** a hit happens at the right edge of the view
- **THEN** its sound is panned to the right

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

### Requirement: Realm and gate
The HUD SHALL show the current realm's name and its number in the run. While a gate is open it SHALL show where it leads and the seconds until the party is taken there, and an indicator SHALL point to the gate while it is off-screen. A fallen ally's spirit SHALL show its revival progress.

#### Scenario: The gate opens
- **WHEN** the Cyclops falls in the first realm
- **THEN** the HUD tells the players that the gate is open, where it leads, and how long until it takes them

### Requirement: Minimap
During a run the HUD SHALL show a minimap of the whole realm in a corner, clear of the centre of the screen. It SHALL show the realm's obstacles and the boss arena, every living enemy (elites distinct), the boss while it lives, the open gate, every god still in the run in their seat's colour (the local god distinct, fallen gods distinct from living ones), and the area the screen shows. It SHALL update at least five times a second and SHALL stay readable at every graphics quality.

#### Scenario: Where everyone is
- **WHEN** two gods are in a room, one of them fallen, an elite and the boss are alive, and the gate is open
- **THEN** the minimap marks the living god, the fallen god, the elite, the boss and the gate, each distinctly

#### Scenario: Gone from the room
- **WHEN** a guest has left the room
- **THEN** the minimap no longer marks them
