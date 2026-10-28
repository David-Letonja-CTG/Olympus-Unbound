## ADDED Requirements

### Requirement: The god's body language
The god SHALL play its swing when its ability fires, lean into a dash, start its walk on a step rather than mid-stride, and be pushed back a few pixels on screen when struck (a drawing offset only: its position in the rules does not move). These are drawing only and SHALL not delay or change any input or rule.

#### Scenario: Ability
- **WHEN** Zeus's ability fires while he is walking
- **THEN** his swing plays once and his walk continues after it, at the same position and speed as without the swing

#### Scenario: Struck
- **WHEN** an enemy hits the god
- **THEN** the god is drawn pushed away from the hit for a moment, and its position in the rules does not change

#### Scenario: Swing interrupted
- **WHEN** the ability fires again before the swing ends
- **THEN** the swing restarts from its first frame
