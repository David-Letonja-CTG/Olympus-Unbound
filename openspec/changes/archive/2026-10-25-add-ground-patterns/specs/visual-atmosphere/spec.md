## MODIFIED Requirements

### Requirement: Painted ground
The ground of each run SHALL be painted from its arena data: smooth, blended transitions between terrain types, ground texture, the roads, soft shading around plazas, ruins and the cliff edge, and a rock face along the border. The painting SHALL be deterministic for an arena (same seed, same ground) and its resolution SHALL follow the graphics quality.

A terrain type MAY name a pattern, painted into its ground with the rest: stone slabs, cobbles, cracked rock, sand ripples, drifts of ash, wet mud, grass, earth or moss. A pattern SHALL fade out where its ground blends into the next. Patterns SHALL be painted once, while the realm loads, and SHALL cost nothing while playing. They SHALL never compete with what the player must read: enemies, telegraphs and pickups stay as readable as on plain ground.

#### Scenario: Same arena, same ground
- **WHEN** the same arena is painted twice
- **THEN** both paintings are identical

#### Scenario: Low quality
- **WHEN** the graphics quality is Low
- **THEN** the ground is painted at a lower resolution than at High

#### Scenario: Flagstones
- **WHEN** a Labyrinth of Crete arena is painted
- **THEN** its `flagstone` ground shows slabs with grout lines, and its `mosaic` ground shows cobbles

#### Scenario: No frame cost
- **WHEN** a run with patterned ground is measured with a full horde
- **THEN** its frame times match a run without patterns, and loading takes about as long
