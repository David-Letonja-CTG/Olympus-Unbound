## ADDED Requirements

### Requirement: Local co-op on one screen
Before a run the player SHALL be able to add local players one by one, each with their own god and controls, up to a party of four together with bot allies. The run SHALL follow the co-op rules for its party and count as co-op when two or more people play. One camera SHALL frame every living local player, zooming out to at most 70% of the usual view as they spread. Beyond that a soft edge SHALL keep each living local player within the view around the party's centre. Each local player SHALL answer their own choices in turn, and the run SHALL wait for all of them. Any local player's pause SHALL pause the run.

#### Scenario: Two on one keyboard
- **WHEN** player 1 (Zeus, keyboard left) and player 2 (Athena, keyboard right) start a run
- **THEN** WASD moves Zeus and the arrow keys move Athena, and enemies scale as for a party of two

#### Scenario: Framing the party
- **WHEN** the two gods walk apart
- **THEN** the camera keeps both in view, zooming out, and stops them from walking further apart than the zoomed-out view allows

#### Scenario: Taking turns at a level-up
- **WHEN** the party levels up
- **THEN** player 1's choice is shown, then player 2's, each named, and the run resumes when both have chosen

#### Scenario: With a bot
- **WHEN** two local players add one bot ally
- **THEN** the party is three, the bot plays itself, and the run counts as co-op
