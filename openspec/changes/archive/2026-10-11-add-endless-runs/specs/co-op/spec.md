# Spec Delta

## ADDED Requirements

### Requirement: Reviving allies
When a god falls in a party, their spirit SHALL stay where they fell. A living ally standing within reach of the spirit SHALL revive them after 3 seconds in total; progress SHALL drain while no ally is in reach and SHALL be visible to every player. A revived god SHALL return with half their maximum health and a moment of invulnerability. A player who left the run SHALL NOT be revived. When every god has fallen, the run SHALL end in defeat.

#### Scenario: Standing by a fallen friend
- **WHEN** Ana's god falls and Bo stands beside her spirit for 3 seconds
- **THEN** Ana's god rises with half health and everyone is told

#### Scenario: Stepping away
- **WHEN** Bo leaves the spirit after 2 seconds
- **THEN** Ana stays fallen and the progress drains
