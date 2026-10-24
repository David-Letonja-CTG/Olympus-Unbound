## ADDED Requirements

### Requirement: Recoloured sheets
A sprite in the asset manifest MAY name a `recolor`. The game SHALL then draw it from a copy of its sheet multiplied by that colour, with the sheet's transparency kept, made once when the art loads. Status and warning tints SHALL still show on top. Menu portraits of such a sprite SHALL be recoloured the same way. A recoloured sprite SHALL keep its sheet's frames, animations and licence entry.

#### Scenario: Kronos in gold
- **WHEN** `kronos` is drawn
- **THEN** the marble sentinel's sheet appears in dark gold at Kronos's scale, and a burning Kronos still shows the burn tint
