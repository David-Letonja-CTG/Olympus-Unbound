## ADDED Requirements

### Requirement: Adding allies
Before a solo run the player SHALL be able to add allies one by one, up to three, each a god of their choice (the player's own god included) with a difficulty of Easy, Normal or Hard, and SHALL be able to remove any of them. The run SHALL start with the player in the first seat and the allies after, in the order added.

#### Scenario: Two allies
- **WHEN** the player chooses Zeus, adds Hades on Hard and Athena on Easy, and begins
- **THEN** the run's party is Zeus (the player), Hades (bot, Hard) and Athena (bot, Easy)

#### Scenario: At most three
- **WHEN** three allies have been added
- **THEN** no more can be added

### Requirement: A party like co-op
A run with allies SHALL follow the co-op rules: difficulty per god in the party, each god's own level-up choices, reviving fallen gods, the run going on while any god lives, and the gate taking every god. The loading screen and the party health panel SHALL show the allies marked as bots. A round of choices SHALL NOT wait for allies: they choose at once.

#### Scenario: Harder with more
- **WHEN** a run has the player and two allies
- **THEN** enemies have the health, spawn rate and numbers of a party of three

#### Scenario: Allies choose at once
- **WHEN** the party levels up
- **THEN** each ally takes an upgrade at once and only the player's choice is shown

#### Scenario: Revived by an ally
- **WHEN** the player falls while an ally lives
- **THEN** the run goes on, and an ally comes to the player's spirit and revives them

### Requirement: How bots play
A bot SHALL play its god from the run's state alone, so the same run with the same inputs plays the same way (D5). It SHALL stay near the player, fight at a distance that suits its weapons, gather nearby pickups, revive fallen gods within reach, walk to the open gate, and choose its own upgrades. It SHALL NOT shop. By difficulty:

| | Easy | Normal | Hard |
|---|---|---|---|
| Rethinks every | 0.4 s | 0.2 s | 0.07 s |
| Steps out of telegraphs | no | yes | yes, earlier |
| Dashes out of danger | no | yes | yes |
| Ability | whenever ready | when 3 foes are near | when 5 foes are near or it is hurt |
| Upgrades | the first offer | new weapons, then weapon levels | builds on its strongest weapons and its synergies |

#### Scenario: Out of the telegraph
- **WHEN** a Normal ally stands inside a boss's warned slam
- **THEN** it leaves the warned area before the slam lands

#### Scenario: Deterministic
- **WHEN** two runs with the same seed, party and inputs are played
- **THEN** every ally is in the same place with the same build after a minute

#### Scenario: To the gate
- **WHEN** the gate opens and the player stands in it
- **THEN** the allies walk to it
