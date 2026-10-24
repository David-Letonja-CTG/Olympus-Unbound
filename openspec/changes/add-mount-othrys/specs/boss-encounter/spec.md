## ADDED Requirements

### Requirement: Devour
A boss attack `devour` SHALL mark two circles round the boss: a wide pull ring and a smaller maw. During its wind-up every living god inside the pull ring SHALL be drawn toward the boss at a set speed, slower than a dash. When the wind-up ends the maw SHALL strike every god inside it, like any telegraphed attack, so a perfect dodge applies.

#### Scenario: Dragged in
- **WHEN** Kronos devours while a god stands inside the pull ring and does not move
- **THEN** the god is drawn toward Kronos and, inside the maw when it closes, is hit

#### Scenario: Outrun
- **WHEN** the god dashes away from Kronos as the pull begins
- **THEN** the dash carries the god out of the pull ring before the maw closes

#### Scenario: Outside the ring
- **WHEN** a god stands beyond the pull ring
- **THEN** it is not drawn in
