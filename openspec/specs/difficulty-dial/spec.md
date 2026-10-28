# difficulty-dial Specification

## Purpose
One difficulty for every player, set by the admin on the game server and handed out with the world boards, scaling enemy health, damage, spawn rate and realm growth (D23).

## Requirements

### Requirement: The dial
The game server SHALL keep one difficulty dial for every player, with four multipliers:
- enemy health, from 0.25 to 5;
- enemy damage, from 0.25 to 5;
- spawn rate, from 0.5 to 3;
- realm growth, from 0.5 to 3.

Until it is first set, every value SHALL be 1, the game as released. Anyone SHALL be able to read the dial. Only a request with the server's admin token SHALL change it, and a dial with any value missing or outside its range SHALL be refused and change nothing.

#### Scenario: Read by anyone
- **WHEN** a game asks the server for the dial before it was ever set
- **THEN** every value is 1

#### Scenario: Set by the admin
- **WHEN** the admin saves enemy health 1.5 with the right token
- **THEN** every game that asks next reads enemy health 1.5

#### Scenario: A wrong token
- **WHEN** a request without the admin token tries to change the dial
- **THEN** it is refused and the dial stays as it was

### Requirement: Every run starts with the dial
The game SHALL read the dial from the server whenever the main menu opens, and keep the last dial read for when the server cannot be reached. A game that never read one, or a build without a server, SHALL use the default (every value 1).

Every run a solo player or a room's host starts SHALL apply the dial, on top of its own rules (a Daily Trial's twist, a quick run):
- every enemy's and boss's health and damage SHALL be multiplied by the dial's enemy health and enemy damage;
- the spawn rate SHALL be multiplied by the dial's spawn rate;
- every realm cleared SHALL multiply enemy and boss health and damage by the dial's realm growth again, compounding on top of the growth by depth (spec: endless-run).

A room's run SHALL use its host's dial. A run SHALL keep the dial it started with.

#### Scenario: Realm growth
- **WHEN** the dial's realm growth is 1.5 and the party has cleared two realms
- **THEN** a new enemy has 2.25 times the health and damage it would have with realm growth 1, and the first realm's enemies are unchanged

#### Scenario: Offline
- **WHEN** the server cannot be reached as a run starts
- **THEN** the run uses the last dial this game read

#### Scenario: A twist and the dial
- **WHEN** the Daily Trial's twist doubles enemy health and the dial's enemy health is 1.5
- **THEN** enemies have three times their health

### Requirement: The admin page sets the dial
The hidden admin page SHALL show the dial as the server has it, with a field for each value and its range. It SHALL save the dial with the admin password the page was unlocked with (spec: run-statistics / admin mode), asking for no other password. The page SHALL say whether the dial was saved for everyone, the password was refused, the server has no admin token, or the server could not be reached. A build without a server SHALL say the dial cannot be set from it.

#### Scenario: Saving
- **WHEN** the admin, unlocked with the server's admin token, changes realm growth to 1.3 and saves
- **THEN** the page says it is saved for everyone, and the next run any player starts uses it
