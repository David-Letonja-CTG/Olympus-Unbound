# Spec Delta

## MODIFIED Requirements

### Requirement: Data-driven enemies with reusable behaviors
Each enemy type SHALL be defined by data (health, speed, damage, size, XP, gold, knockback resistance, behavior). Behaviors SHALL be reusable: chaser, fast chaser, swarm, tank, ranged attacker (keeps distance, fires projectiles), charger (telegraphs, then dashes) and summoner (periodically calls other enemies). Mount Olympus SHALL have eight enemy types.

#### Scenario: Ranged attacker keeps distance
- **WHEN** a `centaur_archer` is closer to the player than its preferred range
- **THEN** it moves away and fires projectiles at the player on its cooldown

#### Scenario: Charger telegraphs
- **WHEN** a `minotaur` comes within charge range
- **THEN** it stops, shows its charge direction for its wind-up time, then dashes in a straight line
