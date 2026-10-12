# Spec Delta

## ADDED Requirements

### Requirement: Minimap
During a run the HUD SHALL show a minimap of the whole realm in a corner, clear of the centre of the screen. It SHALL show the realm's obstacles and the boss arena, every living enemy (elites distinct), the boss while it lives, the open gate, every god still in the run in their seat's colour (the local god distinct, fallen gods distinct from living ones), and the area the screen shows. It SHALL update at least five times a second and SHALL stay readable at every graphics quality.

#### Scenario: Where everyone is
- **WHEN** two gods are in a room, one of them fallen, an elite and the boss are alive, and the gate is open
- **THEN** the minimap marks the living god, the fallen god, the elite, the boss and the gate, each distinctly

#### Scenario: Gone from the room
- **WHEN** a guest has left the room
- **THEN** the minimap no longer marks them
