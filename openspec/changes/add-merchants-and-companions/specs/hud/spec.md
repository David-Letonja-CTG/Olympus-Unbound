## ADDED Requirements

### Requirement: The merchant on the HUD
While the merchant is in the realm the HUD SHALL show a banner with the time until it leaves, the minimap SHALL mark it, and when it is off screen a pointer at the screen's edge SHALL show its direction. The merchant and its ring SHALL stay readable above the night's darkness at every quality level. The loadout SHALL show the god's companions.

#### Scenario: The merchant is here
- **WHEN** the merchant has 40 seconds left in the realm
- **THEN** the HUD shows "The merchant leaves in 40 s" and the minimap marks it

#### Scenario: Companions in the loadout
- **WHEN** the god has bought the eagle
- **THEN** the eagle's icon is in the loadout
