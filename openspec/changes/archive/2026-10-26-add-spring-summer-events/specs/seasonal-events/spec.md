## ADDED Requirements

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
