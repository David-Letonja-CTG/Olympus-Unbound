## MODIFIED Requirements

### Requirement: Party health
Gods not played at this screen (bot allies, and the other players of a room) SHALL be shown on the left as medallions in seat order: a round portrait in the seat's colour with the god's name, a ring for their health and, for players, an arc for their stamina and a gem lit when their ability is ready. A fallen god's medallion SHALL turn grey and its ring SHALL show how far their revive has come. A player who left SHALL no longer be shown. A god played at this screen SHALL never be shown as a medallion; with no other god, no medallion is shown.

#### Scenario: A friend is hurt
- **WHEN** two gods are in a room and the other has 30 of 150 health
- **THEN** their medallion's health ring is a fifth full

#### Scenario: A friend has fallen
- **WHEN** the other god has fallen and is being revived halfway
- **THEN** their medallion is grey and its ring is half full

#### Scenario: Never twice
- **WHEN** a solo player brings one bot ally
- **THEN** only the bot has a medallion; the player is shown by the frieze alone

### Requirement: Cooldowns and stamina
Each player at this screen SHALL see their stamina: alone (or in a room) as an orb of golden ichor at the right end of the frieze, and on a shared screen as a gold ring around their own orb of blood. The ability slot's cooldown sweep SHALL turn smoothly (not in visible steps) and the slot SHALL flash once when the ability becomes ready. Every weapon slot SHALL show a sweep for the share of its cooldown still to run. A dash pip SHALL show the dash's recovery and whether there is stamina enough for a dash.

#### Scenario: Stamina orb
- **WHEN** the player has 40 of 100 stamina
- **THEN** the orb of ichor is 40% full

#### Scenario: Stamina bar
- **WHEN** player 2 on a shared screen has 40 of 100 stamina
- **THEN** the gold ring around player 2's orb of blood is 40% full

#### Scenario: Weapon cooldown
- **WHEN** a weapon with a 2-second cooldown fired half a second ago
- **THEN** its slot shows a sweep covering about 75%

#### Scenario: Ability ready
- **WHEN** the ability's cooldown ends
- **THEN** the ability slot flashes and shows no sweep

#### Scenario: Too tired to dash
- **WHEN** the player has less stamina than a dash costs
- **THEN** the dash pip is dimmed

### Requirement: Local players on the HUD
Every player at this screen SHALL have a plaque of their own with their orb of blood, stamina, dash pip, ability slot labelled with their key, and loadout; nothing a plaque shows SHALL be repeated elsewhere on the HUD. One player (solo, or in a room) SHALL have the bottom frieze. Two players SHALL share it, player 1 on the left and player 2 mirrored on the right. Three or four players SHALL each have a compact plaque in a corner (player 1 top-left, 2 top-right, 3 bottom-left, 4 bottom-right), with the minimap, gold and kills below the top-right plaque. Experience and level SHALL be shown once, in the bottom middle. A fallen player's plaque SHALL turn grey and show their revive.

#### Scenario: Two at one screen
- **WHEN** two players share the screen
- **THEN** player 1's plaque is at the bottom left and player 2's at the bottom right, each with their own health, stamina and ability key

#### Scenario: Four at one screen
- **WHEN** four players share the screen
- **THEN** each player's plaque is in their corner and the minimap sits below player 2's

#### Scenario: Player 2's ability
- **WHEN** player 2's ability is cooling down
- **THEN** player 2's ability slot shows its sweep, and flashes when it is ready
