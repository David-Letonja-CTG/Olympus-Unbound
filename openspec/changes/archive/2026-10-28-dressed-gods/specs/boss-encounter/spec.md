## ADDED Requirements

### Requirement: The final phase shows
A boss in its last phase SHALL show glowing cracks and eyes, and shed embers, for the rest of the fight, drawn without changing its sheet or its telegraphs' readability. A boss with a single phase SHALL show it under a quarter of its health.

#### Scenario: Kronos's last phase
- **WHEN** `kronos` enters his last phase
- **THEN** he shows glowing cracks and eyes and sheds embers until he falls

#### Scenario: One phase
- **WHEN** a single-phase boss drops below a quarter of its health
- **THEN** it shows the same look
