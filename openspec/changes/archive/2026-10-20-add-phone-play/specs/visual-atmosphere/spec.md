## MODIFIED Requirements

### Requirement: Graphics quality levels

The settings SHALL offer graphics quality Low, Medium and High. Higher levels SHALL add more lights, fog, bloom and particles; Low SHALL stay playable with software rendering and on phones. The default SHALL be chosen from a capability check on first launch: Low on a touch device or without hardware graphics acceleration. Changes SHALL apply without restarting a run.

#### Scenario: Switching to Low during a run

- **WHEN** the player selects Low in the pause menu
- **THEN** bloom and fog are reduced at once and the run continues

#### Scenario: Software rendering

- **WHEN** the game starts in a browser without hardware graphics acceleration
- **THEN** the default quality is Low

#### Scenario: A phone's first launch

- **WHEN** the game starts for the first time on a device whose main pointer is touch
- **THEN** the default quality is Low
