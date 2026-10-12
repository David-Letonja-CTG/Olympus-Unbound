# Spec Delta

## ADDED Requirements

### Requirement: Enemy health bars
Every common monster that has lost health SHALL show a small health bar above it, unless the player has turned enemy health bars off in the settings. Monsters at full health SHALL show none. Elites SHALL keep their own health bar, and the boss its banner.

#### Scenario: A hurt monster
- **WHEN** a satyr has lost half its health and enemy health bars are on
- **THEN** a bar half full is drawn above it

#### Scenario: Bars off
- **WHEN** the player turns enemy health bars off
- **THEN** no common monster shows a health bar

### Requirement: Party health
When more than one god is in the run, the HUD SHALL list every god still in it on the left of the screen, in seat order, with their seat's colour, god, name, a health bar and their health in numbers; the player's own god SHALL be marked. A fallen god SHALL be shown as fallen, with how far their revive has come. A player who left SHALL no longer be listed. Alone, the list SHALL not be shown.

#### Scenario: A friend is hurt
- **WHEN** two gods are in a room and the other has 30 of 150 health
- **THEN** the list shows them with a bar a fifth full and 30 / 150

#### Scenario: A friend has fallen
- **WHEN** the other god has fallen and is being revived halfway
- **THEN** the list shows them as fallen with the revive half done
