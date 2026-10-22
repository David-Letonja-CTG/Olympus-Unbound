## MODIFIED Requirements

### Requirement: Finding the way
Enemies that walk toward a god SHALL find a way around obstacles and walls, including shifting walls while they stand:

- An enemy that can see a god walks straight at it.
- One that cannot see a god follows the shortest way around the obstacles toward the nearest god by path.
- One with no way to any god walks straight at the nearest god.
- An enemy turns toward its new heading at a limited rate rather than at once, except while a charger winds up or dashes.

The way SHALL follow the gods as they move and the walls as they rise and sink. It SHALL cost no more per enemy as the horde grows, and stay deterministic (D5).

#### Scenario: Around a wall
- **WHEN** a god stands on the far side of a straight wall from a chaser, with the wall's end open
- **THEN** the chaser walks round the end of the wall and reaches the god, instead of staying at the wall

#### Scenario: Through the Labyrinth
- **WHEN** a god waits in a corridor of the Labyrinth while enemies spawn out of sight
- **THEN** the enemies come down the corridors and through breaches, and do not gather at walls

#### Scenario: In the open
- **WHEN** a chaser can see the god across open ground
- **THEN** it walks straight at the god, as before

#### Scenario: Turning about
- **WHEN** a chaser's god passes it, so its heading reverses
- **THEN** it turns round over about a quarter of a second, not in one step
