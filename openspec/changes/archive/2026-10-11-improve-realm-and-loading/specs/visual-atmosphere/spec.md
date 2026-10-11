# Spec Delta

## ADDED Requirements

### Requirement: Painted ground
The ground of each run SHALL be painted from its arena data: smooth, blended transitions between terrain types, ground texture, the roads, soft shading around plazas, ruins and the cliff edge, and a rock face along the border. The painting SHALL be deterministic for an arena (same seed, same ground) and its resolution SHALL follow the graphics quality.

#### Scenario: Same arena, same ground
- **WHEN** the same arena is painted twice
- **THEN** both paintings are identical

#### Scenario: Low quality
- **WHEN** the graphics quality is Low
- **THEN** the ground is painted at a lower resolution than at High
