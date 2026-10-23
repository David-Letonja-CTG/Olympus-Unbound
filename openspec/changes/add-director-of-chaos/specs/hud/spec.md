## ADDED Requirements

### Requirement: Encounters on the HUD
While the Director's encounters are under way (spec: director-of-chaos), the HUD SHALL show each one below the top plaques: its name, what the party must do, how many foes are left where that matters, and the seconds until its next turn (arrival, end, escape or fading). A contract SHALL also show its risk and reward. Active blessings SHALL be shown with their seconds left. Encounter announcements SHALL have their own style. Nothing SHALL be shown for encounters that have ended.

#### Scenario: An invasion on the HUD
- **WHEN** an invasion is active with 12 invaders left and 40 seconds to go
- **THEN** the HUD shows "Monster Invasion", "Repel the invaders", "12 left" and "40 s"

#### Scenario: A contract's terms
- **WHEN** the altar of `champion_contract` stands
- **THEN** the HUD shows its objective, its risk, its reward and the seconds before it fades

#### Scenario: A blessing's time
- **WHEN** a god has `swiftness_of_hermes` with 12 seconds left
- **THEN** the HUD shows "Swiftness of Hermes · 12 s"
