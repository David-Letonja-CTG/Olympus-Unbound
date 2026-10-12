# Spec Delta

## MODIFIED Requirements

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
