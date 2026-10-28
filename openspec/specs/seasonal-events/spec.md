# seasonal-events Specification

## Purpose
TBD - created by archiving change add-night-of-hecate. Update Purpose after archive.

## Requirements

### Requirement: Event dates
Seasonal events SHALL be content data with a yearly window of month-days, which may wrap the new year. An event SHALL be on while the device's local date is inside its window, every year. The hidden admin page SHALL offer a switch for that browser only: by the calendar, one event forced on, or all off. The switch SHALL persist in that browser. When windows overlap, the first event in content order SHALL be on.

#### Scenario: Halloween
- **WHEN** the device's date is October 31
- **THEN** `night_of_hecate` is on

#### Scenario: After the season
- **WHEN** the device's date is November 8
- **THEN** no event is on

#### Scenario: Forced on
- **WHEN** the admin switch forces `night_of_hecate` on in July
- **THEN** the event is on in that browser only

### Requirement: In the menus
While an event is on, the main menu SHALL show its button with the days left, leading to god selection with the event's realm chosen. The realm lists for solo runs and co-op rooms SHALL show the event's realm first. Event realms SHALL not be shown while their event is off. The Daily Trial SHALL never pick an event realm.

#### Scenario: The event button
- **WHEN** the Night of Hecate is on with 6 days left and the player opens the main menu
- **THEN** a "The Night of Hecate · 6 days left" button leads to choosing a god for `crossroads_of_hecate`

#### Scenario: Out of season
- **WHEN** no event is on
- **THEN** `crossroads_of_hecate` is in no realm list and the menu shows no event button

### Requirement: Event runs and items
A run SHALL carry the event that was on when it began, and a room's run SHALL carry its host's. Weapons and relics of an event SHALL be offered only in runs of that event. Event weapons SHALL not count toward a god's arsenal.

#### Scenario: Hecate's Torches
- **WHEN** a run of `night_of_hecate` offers a new weapon
- **THEN** `hecates_torches` may be among the offers

#### Scenario: Out of season
- **WHEN** a run without an event levels up
- **THEN** `hecates_torches` and `key_of_hecate` are never offered

### Requirement: The Night of Hecate
The event `night_of_hecate` SHALL run from October 24 to November 7.

Its realm `crossroads_of_hecate` SHALL be a moonlit graveyard where three roads meet, lit by gourd lanterns. It SHALL spawn `restless_dead`, `empusa`, `lampad_of_hecate` (throws fire from afar) and `hound_of_hecate` (charges), with hordes and elites.

After 7 minutes `hecate` SHALL appear:
- Three torches, each a damageable part, SHALL guard her: while any burns she SHALL take a third of the damage, and a quenched torch SHALL relight after 18 seconds.
- Ghost fire SHALL fall on circles under the players, and she SHALL call the dead.
- Below half health it SHALL be announced that the three roads close. Rings of stone SHALL then rise round her with three ways out, and she SHALL call her hounds.

Its items SHALL be `hecates_torches` and `key_of_hecate`. Its achievements SHALL be `queen_of_crossroads` (clear the realm) and `night_walker` (survive 10 minutes from it).

#### Scenario: Torches guard her
- **WHEN** a god strikes Hecate while one of her torches burns
- **THEN** she takes a third of the damage

#### Scenario: The three roads close
- **WHEN** Hecate falls below half health
- **THEN** "The three roads close!" is announced and stone rings with three gaps rise round her

#### Scenario: Queen of the Crossroads
- **WHEN** a run that started at `crossroads_of_hecate` clears it
- **THEN** `queen_of_crossroads` unlocks; the same clear from another starting realm does not count

### Requirement: Event currency
Every event SHALL name a currency with its own picture. In runs of that event the currency SHALL drop from a share of kills, a set number from every elite and from the boss. It SHALL be drawn to the gods' magnet and collected like gold, shared by the party. On the ground and in the menus (the run summary, the event shop) it SHALL show its event's picture. A finished run's currency SHALL be added to the player's balance for that event once, and the run summary SHALL show it. Runs without the event SHALL drop none.

#### Scenario: An elite at the crossroads
- **WHEN** a run of `night_of_hecate` slays an elite
- **THEN** 3 honey cakes drop, and once collected the summary shows them and the balance grows by 3

#### Scenario: Out of season
- **WHEN** a run without an event slays an elite
- **THEN** no honey cakes drop

#### Scenario: Roses on the ground
- **WHEN** a run of `festival_of_eros` drops its currency
- **THEN** roses lie on the ground, not honey cakes

### Requirement: Event shop
The Progression screen SHALL show each event's shop while the event is on, or while the player holds its currency or any of its rewards. A reward SHALL cost currency of its event and be bought once, for good. A reward SHALL either add stat modifiers to every run, or let one of the event's items be offered in every run, all year. A room's run SHALL use its host's unlocked items.

#### Scenario: Torchbearer
- **WHEN** the player buys `torchbearer` and later starts a run in July
- **THEN** `hecates_torches` may be offered in that run

#### Scenario: Too dear
- **WHEN** the player holds 30 honey cakes
- **THEN** `ward_of_the_crossroads` (120) cannot be bought

#### Scenario: Once
- **WHEN** the player owns `hecates_blessing`
- **THEN** it shows as owned and cannot be bought again

### Requirement: Event table
Runs that started in an event's realm SHALL enter an event table in the Hall of Glory on this device, instead of the solo, co-op or allies tables. The Hall SHALL show that table while an event is on or once it holds runs. World boards SHALL count such runs as the mode they were played in.

#### Scenario: A night at the crossroads
- **WHEN** a solo run that started at `crossroads_of_hecate` ends
- **THEN** it enters the event table, not the solo table

### Requirement: The Longest Night
The event `longest_night` SHALL run from December 15 to January 5, over the winter solstice, Christmas and the New Year.

Its realm `starlit_wood` SHALL be a snowbound pine wood under the stars, hung with lamps, with snow falling. It SHALL spawn `oneiros`, `nightmare` (quick), `star_bearer` (throws star-fire from afar) and `wolf_of_night` (charges), with hordes and elites.

After 7 minutes `nyx` SHALL appear:
- Her twin sons, `hypnos` and `thanatos`, each a damageable part, SHALL guard her: while either lives she SHALL take a third of the damage, and a fallen son SHALL return after 20 seconds.
- Gods near Hypnos SHALL be slowed. Thanatos SHALL lash at them.
- Stars SHALL fall on circles under the players, and she SHALL call the Oneiroi.
- Below half health it SHALL be announced that Nyx draws her veil. Rings of stone SHALL then rise round her with four ways out, and she SHALL call her nightmares.

Its items SHALL be `stars_of_nyx` (shadow stars that circle the god and slow) and `veil_of_nyx`. Its currency SHALL be star shards. Its achievements SHALL be `mother_of_night` (clear the realm) and `dawn_bringer` (survive 10 minutes from it).

#### Scenario: New Year's Eve
- **WHEN** the device's date is December 31 or January 1
- **THEN** `longest_night` is on

#### Scenario: Sleep
- **WHEN** a god stands next to Hypnos
- **THEN** the god walks slower until leaving his reach

#### Scenario: Her sons guard her
- **WHEN** a god strikes Nyx while Hypnos or Thanatos lives
- **THEN** she takes a third of the damage

### Requirement: The Winds of Boreas
The event `winds_of_boreas` SHALL run from January 10 to January 31.

Its realm `peaks_of_thrace` SHALL be bare peaks in a blizzard. Its frozen lakes SHALL slide underfoot, and hot springs SHALL heal. It SHALL spawn `frozen_warrior`, `snow_harpy` (quick), `hyperborean_archer` (shoots ice from afar) and `frost_gigas` (slow and hard to push), with hordes and elites.

After 7 minutes `boreas` SHALL appear:
- He SHALL charge along marked lines on the gale. A charge that runs into a wall SHALL stop it, and he SHALL be dazed for 2 seconds.
- Hail SHALL fall on circles under the players, and cones of biting wind SHALL sweep before him.
- Below half health it SHALL be announced that winter closes in. Rings of stone SHALL then rise round him with five ways out, and he SHALL charge more often.

Its items SHALL be `breath_of_boreas` (gusts that pierce and slow) and `cloak_of_boreas`. Its currency SHALL be hailstones. Its achievements SHALL be `winters_end` (clear the realm) and `frostbound` (survive 10 minutes from it).

#### Scenario: Thin ice
- **WHEN** a god walks onto a frozen lake at `peaks_of_thrace` and lets go of the controls
- **THEN** the god slides on before stopping

#### Scenario: Into the wall
- **WHEN** Boreas' charge runs into a wall
- **THEN** the charge stops and he stands dazed for 2 seconds

### Requirement: The Festival of Eros
The event `festival_of_eros` SHALL run from February 7 to February 21, over Valentine's Day.

Its realm `garden_of_aphrodite` SHALL be rose terraces by the sea, with rose petals on the wind and healing pools. It SHALL spawn `lovestruck_satyr`, `erote` (quick), `siren_of_paphos` (throws hearts from afar) and `phobos` (charges), with hordes and elites.

After 7 minutes `eros` SHALL appear:
- His golden and his leaden arrow, each a damageable part, SHALL guard him: while either lives he SHALL take a quarter of the damage. A broken arrow SHALL return after 16 seconds.
- With both arrows broken he SHALL be exposed for 6 seconds, taking 1.8 times the damage.
- The arrows SHALL lash at the gods. Arrows SHALL rain on circles under the players, cones of hearts SHALL sweep before him, and he SHALL call the Erotes.
- Below half health it SHALL be announced that love turns to hate. He SHALL then charge along marked lines and call Phobos.

Its items SHALL be `arrows_of_eros` (an arrow that leaps from foe to foe and may stun) and `girdle_of_aphrodite`. Its currency SHALL be roses. Its achievements SHALL be `heartbreaker` (clear the realm) and `devoted` (survive 10 minutes from it).

#### Scenario: Valentine's Day
- **WHEN** the device's date is February 14
- **THEN** `festival_of_eros` is on

#### Scenario: Exposed
- **WHEN** both of Eros' arrows are broken
- **THEN** for 6 seconds he takes 1.8 times the damage, then the arrows return

### Requirement: The Golden Apples
The event `apples_of_hesperides` SHALL run from March 10 to March 24, over St Patrick's Day and the spring equinox.

Its realm `garden_of_hesperides` SHALL be a green orchard of golden apple trees at the world's western edge, where Atlas holds up the sky. It SHALL spawn `golden_serpent`, `hesperian_harpy` (quick), `hesperid` (throws apples from afar) and `garden_colossus` (slow and hard to push), with hordes and elites.

After 7 minutes `ladon` SHALL appear:
- He SHALL stay coiled near the middle of his arena.
- Three of his heads SHALL lash at the gods on their own rhythm. They cannot be hurt; Ladon can.
- His tail SHALL sweep in cones, golden venom SHALL fall on circles under the players, and he SHALL call golden serpents.
- Below half health it SHALL be announced that Ladon uncoils. Two more heads SHALL then strike, and he SHALL slam the ground around him.

Its items SHALL be `apple_of_discord` (golden apples that fall on foes and burst) and `burden_of_atlas`. Its currency SHALL be golden apples. Its achievements SHALL be `eleventh_labour` (clear the realm) and `evergreen` (survive 10 minutes from it).

#### Scenario: St Patrick's Day
- **WHEN** the device's date is March 17
- **THEN** `apples_of_hesperides` is on

#### Scenario: Coiled
- **WHEN** the gods lead Ladon away from his arena
- **THEN** he stays near its middle

### Requirement: Event shops of the winter events
Each of the four events SHALL sell three rewards for its currency:
- a blessing for every run;
- its relic, offered in every run, all year (60);
- its weapon, offered in every run, all year (80).

The blessings SHALL be `starlight` (+5% area, 40), `north_wind` (+4% move speed, 40), `aphrodites_favour` (+10 max health, 40) and `hesperides_gift` (+8% gold, 40).

#### Scenario: Stars in summer
- **WHEN** the player has bought `stargazer` and starts a run in July
- **THEN** `stars_of_nyx` may be offered in that run

### Requirement: The Revels of Pan
The event `revels_of_pan` SHALL run from April 1 to April 14.

Its realm `woods_of_arcadia` SHALL be spring woods of oaks, with ponds that slow walkers and Pan's herm on its rock. It SHALL spawn `revelling_satyr`, `paniskos` (quick), `dryad` (throws thorns from afar) and `silenus` (slow and hard to push), with hordes and elites.

After 7 minutes `pan` SHALL appear:
- His shout SHALL sweep cones of panic before him, acorns SHALL fall on circles under the players, and he SHALL call satyrs.
- Four echoes SHALL stand round his arena and strike along marked lines on their own rhythm. They cannot be hurt.
- Below half health it SHALL be announced that the reeds of Syrinx rise. Rings SHALL then rise round him with six ways out, his pipes SHALL shriek round him, and he SHALL call Silenus.

Its items SHALL be `pipes_of_pan` (a blast that sweeps before the god and scatters foes) and `reeds_of_syrinx`. Its currency SHALL be painted eggs. Its achievements SHALL be `lord_of_the_wild` (clear the realm) and `no_panic` (survive 10 minutes from it).

#### Scenario: April Fools' Day
- **WHEN** the device's date is April 1
- **THEN** `revels_of_pan` is on

#### Scenario: Echoes
- **WHEN** Pan appears
- **THEN** four echoes strike from round his arena, and none of them can be hurt

### Requirement: The Hunt of Artemis
The event `hunt_of_artemis` SHALL run from May 1 to May 14.

Its realm `forest_of_calydon` SHALL be a flowering forest under the moon, its fields trampled. It SHALL spawn `curete_raider`, `hunting_hound` (quick), `nymph_of_artemis` (shoots silver arrows from afar) and `wild_centaur` (charges), with hordes and elites.

After 7 minutes `calydonian_boar` SHALL appear:
- It SHALL charge along marked lines. A charge that runs into a wall SHALL stop it, and it SHALL be dazed for 3 seconds.
- It SHALL gore the ground round it, and trees SHALL fall on circles under the players.
- Below half health it SHALL be announced that the boar tramples the fields. A thicket SHALL then rise round it with three ways out, it SHALL charge twice in a row, and it SHALL call hunters.

Its items SHALL be `moonbow_of_artemis` (piercing silver arrows that strike critically often) and `hide_of_the_boar`. Its currency SHALL be silver arrowheads. Its achievements SHALL be `meleagers_prize` (clear the realm) and `huntress` (survive 10 minutes from it).

#### Scenario: May Day
- **WHEN** the device's date is May 1
- **THEN** `hunt_of_artemis` is on

#### Scenario: Into the wall
- **WHEN** the boar's charge runs into a wall
- **THEN** the charge stops and it stands dazed for 3 seconds

### Requirement: Midsummer of Apollo
The event `midsummer_of_apollo` SHALL run from June 15 to June 28, over the summer solstice.

Its realm `slopes_of_delphi` SHALL be sun-baked terraces at Delphi with laurels and leaning columns that fall when a god walks near. It SHALL spawn `python_spawn`, `sunbird` (quick), `mad_pythia` (throws sunfire from afar) and `tripod_guardian` (slow and hard to push), with hordes and elites.

After 7 minutes `python` SHALL appear:
- Its coils SHALL mark a wide ring. Gods inside SHALL be drawn toward its maw during the wind-up, and then the maw SHALL strike.
- Venom SHALL fall on circles under the players, its tail SHALL sweep in cones, and it SHALL call its spawn.
- Below half health it SHALL be announced that the earth splits. Rocks SHALL then rise round it with four ways out.

Its items SHALL be `rays_of_apollo` (a fan of burning sun-rays) and `lyre_of_apollo`. Its currency SHALL be laurel leaves. Its achievements SHALL be `pythian_victor` (clear the realm) and `longest_day` (survive 10 minutes from it).

#### Scenario: Midsummer's Day
- **WHEN** the device's date is June 21
- **THEN** `midsummer_of_apollo` is on

#### Scenario: The coils
- **WHEN** a god stands in Python's ring as its coils wind up
- **THEN** the god is drawn toward Python

### Requirement: The Theft of Fire
The event `theft_of_fire` SHALL run from July 1 to July 14.

Its realm `peaks_of_caucasus` SHALL be black peaks at night where Prometheus hangs in chains, with vents that erupt and coloured flashes in the sky. It SHALL spawn `ash_shade`, `cinder_harpy` (quick), `kabeiros` (throws embers from afar) and `forge_cyclops` (slow and hard to push), with hordes and elites.

After 7 minutes `caucasian_eagle` SHALL appear:
- Three stolen fires, each a damageable part fixed round its arena, SHALL guard it. While any burns it SHALL take 40% of the damage. A fire put out SHALL be lit again after 22 seconds.
- Gods near a fire SHALL be burned and slowed.
- It SHALL dive along marked lines, bronze feathers SHALL fall on circles under the players, and it SHALL call cinder harpies.
- Below half health it SHALL be announced that the eagle circles. Its wings SHALL then sweep in cones, and it SHALL dive more often.

Its items SHALL be `stolen_fire` (fire that leaps from foe to foe and burns) and `fennel_stalk`. Its currency SHALL be embers. Its achievements SHALL be `prometheus_unbound` (clear the realm) and `firekeeper` (survive 10 minutes from it).

#### Scenario: The Fourth of July
- **WHEN** the device's date is July 4
- **THEN** `theft_of_fire` is on

#### Scenario: Stolen fires
- **WHEN** a god stands next to a burning stolen fire
- **THEN** the god is hurt and slowed, and the eagle takes 40% of the damage while any fire burns

### Requirement: Event shops of the spring and summer events
Each of the four events SHALL sell three rewards for its currency:
- a blessing for every run (40);
- its relic, offered in every run, all year (60);
- its weapon, offered in every run, all year (80).

The blessings SHALL be `arcadian_spring` (+0.3 health per second), `huntress_eye` (+3% critical chance), `midsummer_sun` (+3% damage) and `forethought` (+15% pickup range).

#### Scenario: Fire in winter
- **WHEN** the player has bought `firebringer` and starts a run in January
- **THEN** `stolen_fire` may be offered in that run

### Requirement: A year of events
Every month of the year SHALL have at least one day on which an event is on by the calendar. No two events' windows SHALL overlap.

#### Scenario: Any month
- **WHEN** the device's calendar walks through any month of the year
- **THEN** on at least one of its days an event is on

#### Scenario: One at a time
- **WHEN** an event is on by the calendar
- **THEN** no other event is on that day

### Requirement: The Stars of Perseus
The event `stars_of_perseus` SHALL run from August 6 to August 19, over the Perseid meteor shower.

Its realm `isle_of_gorgons` SHALL be a rocky isle of statues and shallows that slow, under falling stars. It SHALL spawn `gorgon_brood`, `stone_lamia` (quick), `graea` (throws a grey glare from afar) and `petrified_hero` (slow and hard to push), with hordes and elites.

After 7 minutes `medusa` SHALL appear:
- Her sisters `stheno` and `euryale`, damageable parts, SHALL guard her: while either lives she SHALL take a fifth of the damage.
- They SHALL be cut in order, Stheno first; only the next can be hurt. A fallen sister SHALL return after 18 seconds.
- With both down, Medusa SHALL be exposed for 7 seconds, taking 1.6 times the damage.
- Her gaze SHALL sweep in slow cones that hit hard, stone SHALL rain on circles under the players, and she SHALL call her brood.
- Below half health it SHALL be announced that she unveils her face. A ring of statues SHALL then rise round her with four ways out, and petrified heroes SHALL join her.

Its items SHALL be `shield_of_perseus` (a flash round the god that throws foes back and may freeze them) and `winged_sandals`. Its currency SHALL be meteor stones. Its achievements SHALL be `gorgon_slayer` (clear the realm) and `unpetrified` (survive 10 minutes from it).

#### Scenario: The Perseids
- **WHEN** the device's date is August 12
- **THEN** `stars_of_perseus` is on

#### Scenario: In order
- **WHEN** Medusa appears
- **THEN** only Stheno can be hurt; with both sisters down Medusa takes 1.6 times the damage

### Requirement: The Vintage of Dionysus
The event `vintage_of_dionysus` SHALL run from September 15 to September 28.

Its realm `vineyards_of_naxos` SHALL be terraced vineyards in rows over the sea, with the pirates' ship overgrown by a vine. It SHALL spawn `tyrrhenian_pirate`, `panther_of_dionysus` (quick), `bacchant` (throws pinecones from afar) and `drunken_centaur` (charges), with hordes and elites.

After 7 minutes `dionysus` SHALL appear:
- Two panthers, damageable parts, SHALL guard him and lash at the gods. While either lives he SHALL take 30% of the damage. A slain panther SHALL not return.
- His thyrsus SHALL whirl in cones, wine SHALL rain on circles under the players, and he SHALL call bacchants.
- Below half health it SHALL be announced that madness takes the vineyard. Vines SHALL then rise round him with five ways out, and he SHALL charge along marked lines.

Its items SHALL be `thyrsus` (ivy-wound staves that circle the god and slow) and `cup_of_dionysus`. Its currency SHALL be grapes. Its achievements SHALL be `sober_god` (clear the realm) and `the_last_vintage` (survive 10 minutes from it).

#### Scenario: The vintage
- **WHEN** the device's date is September 22
- **THEN** `vintage_of_dionysus` is on

#### Scenario: The panthers stay down
- **WHEN** both panthers are slain
- **THEN** they never return, and Dionysus takes full damage

### Requirement: The Hunger of Erysichthon
The event `hunger_of_erysichthon` SHALL run from November 16 to November 30.

Its realm `grove_of_demeter` SHALL be Demeter's grove in autumn, with wheat, stumps, haystacks and her felled oak, and leaves on the wind. It SHALL spawn `famished_shade`, `famine_crow` (quick), `priestess_of_demeter` (throws sickles from afar) and `famished_giant` (slow and hard to push), with hordes and elites.

After 7 minutes `erysichthon` SHALL appear:
- He SHALL swing his axe round him, bring branches down on circles under the players, rush along marked lines (dazed if he hits a wall) and call crows.
- Below half health it SHALL be announced that his hunger knows no end. His hunger SHALL then mark a wide ring: gods inside SHALL be drawn toward him during the wind-up, and then his mouth SHALL strike. The famine SHALL rise round him with three ways out.

Its items SHALL be `sickle_of_demeter` (a wide reap that heals the god) and `cornucopia`. Its currency SHALL be wheat sheaves. Its achievements SHALL be `the_harvest_saved` (clear the realm) and `well_fed` (survive 10 minutes from it).

#### Scenario: Thanksgiving week
- **WHEN** the device's date is November 26
- **THEN** `hunger_of_erysichthon` is on

#### Scenario: Insatiable
- **WHEN** a god stands in Erysichthon's ring as his hunger winds up, below half his health
- **THEN** the god is drawn toward him

### Requirement: Event shops of the autumn events
Each of the three events SHALL sell three rewards for its currency:
- a blessing for every run (40);
- its relic, offered in every run, all year (60);
- its weapon, offered in every run, all year (80).

The blessings SHALL be `starfall` (+10% critical damage), `good_vintage` (+1% life steal) and `harvest_home` (+5% gold and +5% XP).

#### Scenario: The sickle in spring
- **WHEN** the player has bought `reaper` and starts a run in April
- **THEN** `sickle_of_demeter` may be offered in that run

### Requirement: Skins in event shops
An event shop reward MAY be a skin for one god instead of modifiers or an unlock. Buying it SHALL unlock that skin for good, and the skin can be chosen at any time of the year. Every event's shop SHALL sell one skin for 100 of its currency, three events per god; the Night of Hecate's shop SHALL sell `hades_shroud`, a skin for `hades`, and the Winds of Boreas's `zeus_frost`, a skin for `zeus`.

#### Scenario: Buying the shroud
- **WHEN** the player buys `hades_shroud` with honey cakes
- **THEN** it shows as owned and Hades's `hades_shroud` skin can be chosen on god selection, also after the event ends

#### Scenario: Not affordable
- **WHEN** the player holds fewer honey cakes than `hades_shroud` costs
- **THEN** it cannot be bought and the skin stays locked

#### Scenario: Every event sells a skin
- **WHEN** the shops of all twelve events are listed
- **THEN** each has exactly one skin, and each god has three of them
