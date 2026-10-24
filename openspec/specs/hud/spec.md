# hud Specification

## Purpose
Defines the information the player sees about their run while playing and the audio-visual feedback that keeps combat readable and satisfying.

## Requirements

### Requirement: Run HUD
While playing, the HUD SHALL show health and maximum health, level and XP progress, elapsed run time, gold collected, kills, the ability cooldown, the held weapons, armour and relics with their levels, and active synergies. It SHALL stay readable over a crowded arena and SHALL NOT block the centre of the screen.

#### Scenario: Taking damage
- **WHEN** the player loses health
- **THEN** the health bar shows the new value within a tenth of a second

#### Scenario: Picking a weapon
- **WHEN** the player picks up `war_hammer` from a level-up
- **THEN** the HUD lists `war_hammer` at level 1

### Requirement: Boss HUD
While a boss is alive, a boss health bar with the boss's name SHALL be shown at the top of the screen.

#### Scenario: Boss health
- **WHEN** the `cyclops` loses a quarter of its health
- **THEN** the boss bar shows 75%

### Requirement: Combat readability
The player, enemies, elites, enemy projectiles, pickups and boss telegraphs SHALL be visually distinct. Hits SHALL flash the enemy; damage numbers SHALL appear (critical hits emphasized) unless disabled in settings; the player taking damage SHALL be clearly signalled.

#### Scenario: Damage numbers disabled
- **WHEN** damage numbers are turned off in settings
- **THEN** hits show no numbers but still flash the enemy

### Requirement: Sound feedback
Weapon attacks, the gods' abilities, hits, kills, pickups, level-ups, player damage, reviving, boss attacks, the gate, entering a realm and the run's end SHALL have sound effects at the configured volume. Every weapon and every ability SHALL have its own sound, and the gods' abilities and the weapons SHALL sound like what they depict, made of recordings where the game has them (a storm for Zeus's Wrath of Olympus, water for Poseidon's Tidal Wave, ice and cracking stone for Athena's Gorgon's Gaze, fire for Hades's Gates of Tartarus). Hits SHALL sound by their element; an elite's or a boss's death SHALL sound heavier than a common kill. Sounds from the world SHALL be panned by where they happen relative to the view and SHALL be quieter the farther they are outside it; interface sounds SHALL be centred. Bursts of identical sounds SHALL be limited so that a large horde does not produce noise, and the mix SHALL be limited so that it does not clip. Until a sound's recordings have loaded, or if they fail to, it SHALL still play, synthesized.

#### Scenario: Many kills at once
- **WHEN** fifty enemies die in the same step
- **THEN** only a few kill sounds play

#### Scenario: Every weapon and ability sounds its own
- **WHEN** the content is loaded
- **THEN** every weapon and every god's ability maps to a sound cue, and no two weapons share one

#### Scenario: A sound to the right
- **WHEN** a hit happens at the right edge of the view
- **THEN** its sound is panned to the right

#### Scenario: Zeus's storm
- **WHEN** Zeus calls down the Wrath of Olympus
- **THEN** a recorded lightning crack and a rolling thunderstorm play

#### Scenario: Every recording is licensed
- **WHEN** the asset check runs
- **THEN** every recording a sound uses is a sound file in the asset manifest with an allowed licence

### Requirement: Themed, legible HUD
The HUD SHALL use the game's dark ornate visual language (carved stone, dark iron, gold) while keeping every piece of information required by the run HUD. Text and bars SHALL keep a contrast ratio of at least 4.5:1 against their own backgrounds, and the HUD SHALL stay out of the centre of the screen.

#### Scenario: Health vessel
- **WHEN** the player has 60 of 120 health
- **THEN** the health vessel is half full and shows 60 / 120

#### Scenario: Ability slot
- **WHEN** the ability has 10 of 25 seconds of cooldown left
- **THEN** the ability slot shows a darkened sweep covering 40% and the remaining seconds

### Requirement: Boss banner
While a boss is alive, its name, title and health SHALL be shown in an ornate banner at the top of the screen.

#### Scenario: Banner on arrival
- **WHEN** the `cyclops` arrives
- **THEN** the banner shows "The Cyclops", its title and a full health bar

### Requirement: Realm and gate
The HUD SHALL show the current realm's name and its number in the run. While a gate is open it SHALL show where it leads and the seconds until the party is taken there, and an indicator SHALL point to the gate while it is off-screen. A fallen ally's spirit SHALL show its revival progress.

#### Scenario: The gate opens
- **WHEN** the Cyclops falls in the first realm
- **THEN** the HUD tells the players that the gate is open, where it leads, and how long until it takes them

### Requirement: Minimap
During a run the HUD SHALL show a minimap of the whole realm in a corner, clear of the centre of the screen. It SHALL show the realm's obstacles and the boss arena, every living enemy (elites distinct), the boss while it lives, the open gate, every god still in the run in their seat's colour (the local god distinct, fallen gods distinct from living ones), and the area the screen shows. It SHALL update at least five times a second and SHALL stay readable at every graphics quality.

#### Scenario: Where everyone is
- **WHEN** two gods are in a room, one of them fallen, an elite and the boss are alive, and the gate is open
- **THEN** the minimap marks the living god, the fallen god, the elite, the boss and the gate, each distinctly

#### Scenario: Gone from the room
- **WHEN** a guest has left the room
- **THEN** the minimap no longer marks them

### Requirement: Enemy health bars
Every common monster that has lost health SHALL show a small health bar above it, unless the player has turned enemy health bars off in the settings. Monsters at full health SHALL show none. Elites SHALL keep their own health bar, and the boss its banner.

#### Scenario: A hurt monster
- **WHEN** a satyr has lost half its health and enemy health bars are on
- **THEN** a bar half full is drawn above it

#### Scenario: Bars off
- **WHEN** the player turns enemy health bars off
- **THEN** no common monster shows a health bar

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

### Requirement: The merchant on the HUD
While the merchant is in the realm the HUD SHALL show a banner with the time until it leaves, the minimap SHALL mark it, and when it is off screen a pointer at the screen's edge SHALL show its direction. The merchant and its ring SHALL stay readable above the night's darkness at every quality level. The loadout SHALL show the god's companions.

#### Scenario: The merchant is here
- **WHEN** the merchant has 40 seconds left in the realm
- **THEN** the HUD shows "The merchant leaves in 40 s" and the minimap marks it

#### Scenario: Companions in the loadout
- **WHEN** the god has bought the eagle
- **THEN** the eagle's icon is in the loadout

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

### Requirement: Menu sounds
Outside runs, pressing a button, a link or an option on a screen SHALL play a short interface sound at the Sound effects volume:

- a soft pluck for most controls;
- a brighter chime for a screen's main action (its primary button);
- nothing for a disabled control.

The sound SHALL also play for the press that first allows the browser to play sound.

#### Scenario: Choosing a god
- **WHEN** the player clicks a god on the god screen
- **THEN** a soft pluck plays

#### Scenario: Beginning a run
- **WHEN** the player presses Begin
- **THEN** the brighter chime plays as the Hall theme fades out

#### Scenario: A disabled button
- **WHEN** the player presses Begin while it is disabled
- **THEN** no sound plays

#### Scenario: Effects off
- **WHEN** the Sound effects volume is 0%
- **THEN** pressing buttons is silent, and the Hall theme still plays at the Music volume

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

### Requirement: The build panel
During a run the player SHALL be able to open and close a build panel with Tab, a gamepad's Back/Select button, or a button on a touch screen. The run SHALL go on while it is open; it SHALL also open over a level-up choice. The panel SHALL show the player's own build:

- weapons, armour, relics, skills, fusions and ascensions, with their levels and top levels;
- the tree of every fusion and synergy the god can reach, by tier. Each entry SHALL show its requirements, each met one marked and each unmet one showing the level still needed. Each entry SHALL show whether it is active (and its level), ready to be offered, or locked.

Fusions and synergies the god can never reach SHALL not be shown. The panel SHALL update with the HUD, not per frame. In a room each player SHALL see their own build.

#### Scenario: Opening the panel
- **WHEN** the player presses Tab during a run
- **THEN** the build panel opens, the run keeps going, and pressing Tab again closes it

#### Scenario: What is missing
- **WHEN** the god holds `flaming_sword` at level 6 and `war_hammer` at level 4
- **THEN** the panel shows `forge_of_hephaestus` as locked, with `flaming_sword` met and `war_hammer` needing level 6

#### Scenario: Ready
- **WHEN** every requirement of `forge_of_hephaestus` is met and it has not been taken
- **THEN** the panel shows it as ready to be offered

#### Scenario: On a phone
- **WHEN** the player taps the build button on a touch screen
- **THEN** the panel opens, and a close button closes it

#### Scenario: Another god's tree
- **WHEN** `hades` opens the panel
- **THEN** `sky_father` is not shown
