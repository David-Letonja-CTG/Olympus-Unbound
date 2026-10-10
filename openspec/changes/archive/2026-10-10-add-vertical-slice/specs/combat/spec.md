# Spec Delta

## Purpose

Defines how the player's weapons and abilities damage enemies, how damage and status effects are resolved, how the player takes damage, and what enemies drop when they die.

## ADDED Requirements

### Requirement: Automatic weapons
Every weapon the player holds SHALL attack automatically on its own cooldown, without input, using the targeting of its behavior (nearest enemy, around the player, orbiting, or random enemies in range). A weapon with no valid target SHALL NOT waste its effect where targeting requires a target.

#### Scenario: Starting weapon
- **WHEN** a run starts as `zeus` and an enemy comes within range
- **THEN** `thunder_spear` fires at the nearest enemy every cooldown

#### Scenario: No enemies
- **WHEN** no enemy is within range of `thunder_spear`
- **THEN** it fires in the player's facing direction

### Requirement: One damage pipeline
All player damage SHALL be calculated by one rule: weapon damage × might × the matching element bonus × critical multiplier (when the hit is critical) × the target's damage-taken modifiers. Critical hits SHALL be rolled with the seeded random source using the weapon's and player's critical chance.

#### Scenario: Element bonus
- **WHEN** a 10-damage lightning hit lands with might 1.2 and lightning bonus 1.5, not critical
- **THEN** the enemy loses 18 health

#### Scenario: Critical hit
- **WHEN** the same hit is critical with critical multiplier 2
- **THEN** the enemy loses 36 health and the hit is shown as critical

### Requirement: Status effects
Hits SHALL be able to apply status effects defined in data: burn (damage over time), shock (target takes more damage), stun (target cannot move or attack) and slow (reduced speed). Reapplying an effect SHALL refresh its duration, not stack it endlessly. Knockback SHALL push enemies away from the hit, reduced by their knockback resistance.

#### Scenario: Burn
- **WHEN** a hit applies burn dealing 4 damage per second for 3 seconds
- **THEN** the enemy loses 12 health over 3 seconds unless it dies first

#### Scenario: Stun
- **WHEN** an enemy is stunned for 1 second
- **THEN** it neither moves nor deals contact damage during that second

### Requirement: Pierce, chains and lifesteal
A projectile SHALL hit each enemy at most once and SHALL disappear after hitting more enemies than its pierce allows. Chain attacks SHALL jump to the nearest enemy not yet hit within the jump range. Lifesteal SHALL heal the player by a fraction of damage dealt, never above maximum health.

#### Scenario: Pierce limit
- **WHEN** a projectile with pierce 1 meets three enemies in a line
- **THEN** it damages the first two and disappears

### Requirement: Player damage and death
Enemy attacks SHALL reduce the player's health by the attack's damage minus armour, at least 1. When health reaches 0 the player SHALL die unless a revival is available, in which case they SHALL return with half health and brief invulnerability.

#### Scenario: Armour
- **WHEN** an enemy hit of 8 damage lands on a player with armour 3
- **THEN** the player loses 5 health

#### Scenario: Phoenix Feather
- **WHEN** a player holding `phoenix_feather` would die for the first time
- **THEN** they are revived with half health instead, and a second death ends the run

### Requirement: Enemy death and drops
An enemy whose health reaches 0 SHALL die exactly once, count as one kill, and drop its XP; it MAY drop gold or healing according to its definition and the seeded random source. Elite enemies SHALL always drop a treasure chest.

#### Scenario: Overkill by two weapons in the same step
- **WHEN** two weapons hit an enemy with 5 health for 10 each in the same step
- **THEN** the enemy dies once, one kill is counted and one XP drop appears
