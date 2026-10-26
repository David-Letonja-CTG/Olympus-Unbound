## ADDED Requirements

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

## MODIFIED Requirements

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
