## ADDED Requirements

### Requirement: Seeing each other's gear
Every player in a room SHALL see every god's look, held weapon, evolution glow, relic motes, crown and skin as their owner sees them, taken from the host's state and each player's own skin and trophies.

#### Scenario: Guest sees the host's armour
- **WHEN** the host's `zeus` wears `aegis_of_olympus` at its last level
- **THEN** the guest sees Zeus in look 3, edged in gold

#### Scenario: The host sees a guest's skin
- **WHEN** a guest plays `hades` in the `hades_shroud` skin with the laurel
- **THEN** the host and the other guests see Hades in that skin, wearing the laurel

#### Scenario: Skin unknown to a player
- **WHEN** a player's skin is not in another player's content
- **THEN** that player sees the god in its default skin
