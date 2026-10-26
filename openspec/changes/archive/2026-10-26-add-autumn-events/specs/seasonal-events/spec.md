## ADDED Requirements

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
