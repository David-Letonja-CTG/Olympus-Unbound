# daily-trial Specification

## Purpose
Defines the Daily Trial: the same god, realm, seed and twist for everyone each day, the day's best, sharing a run as a picture and a challenge link, and the link preview.

## Requirements

### Requirement: The day's trial

Each local calendar day SHALL have one Daily Trial: a god, a realm, a seed and a twist. They SHALL be chosen from the date alone, so every player's game picks the same trial on the same date without any network. The Daily Trial screen SHALL show the date, the god, the realm, the twist with its description, and the player's best score today, then start the trial. A Daily Trial is a solo, full-length run.

#### Scenario: Same date, same trial

- **WHEN** two players open the Daily Trial on 2026-10-21
- **THEN** both see the same god, realm, seed and twist

#### Scenario: A new day

- **WHEN** the local date changes
- **THEN** the Daily Trial screen shows the next day's trial and no best score yet

### Requirement: Twists

A twist SHALL be data: a name, a description, and rules for that run. The rules are made of stat changes for the gods (such as damage, health, speed, area, cooldown, gold and experience) and multipliers on enemy health, damage, speed and spawn rate. A twist SHALL be visible on the trial's screen, its loading screen and its summary. The simulation SHALL apply the twist's rules deterministically.

#### Scenario: Swift foes

- **WHEN** today's twist is `swift_foes` (enemies 30% faster)
- **THEN** every enemy of the trial moves 30% faster than in a normal run

### Requirement: Daily best

Every attempt at today's trial SHALL count; the best score of the day SHALL be kept and shown on the Daily Trial screen, on its run summary ("Best today"), and in the Hall of Glory. A trial run SHALL count for statistics, achievements and daily quests. It SHALL NOT enter the solo, With allies, co-op or Quick tables.

#### Scenario: A better attempt

- **WHEN** the player's first trial run today scores 4,200 and the second 5,100
- **THEN** the best today is 5,100

#### Scenario: Tables untouched

- **WHEN** a trial run ends with a score above every solo entry
- **THEN** the solo table is unchanged

### Requirement: Sharing a run

Every run summary SHALL offer **Share**. Share SHALL make a picture of the result (game name, god, realm, time, kills, level, score, and the trial's date and twist if any). It SHALL open the device's share sheet with the picture and a challenge link where supported. Otherwise it SHALL save the picture and copy the challenge link, saying so.

#### Scenario: Sharing on a phone

- **WHEN** the player taps Share on a phone that can share files
- **THEN** the share sheet opens with the picture and the challenge link

#### Scenario: Sharing on a computer

- **WHEN** the browser cannot share files
- **THEN** the picture is downloaded, the challenge link is copied, and the summary says both

### Requirement: Challenge links

A challenge link SHALL encode the run's god, starting realm, seed, length and twist, and the score to beat. Opening one SHALL show a challenge screen naming them, with Accept, which starts that exact run (solo). A challenge with a twist SHALL NOT enter any high-score table; one without a twist SHALL be scored like any run. The challenge's summary SHALL say whether the score to beat was beaten. A link with missing or unknown parts SHALL open the main menu instead.

#### Scenario: Accepting a challenge

- **WHEN** a friend opens a challenge link for `hades` in `the_underworld`, seed `991`, quick, with 3,400 to beat, and taps Accept
- **THEN** a quick run starts as Hades in the Underworld with seed 991, and its summary compares the score with 3,400

#### Scenario: A broken link

- **WHEN** a challenge link names a god that does not exist
- **THEN** the main menu opens

### Requirement: Link preview

The site SHALL describe itself to link previews: a title, a description and a 1200 × 630 picture of the game, so that a shared link shows a card in chat apps and social sites.

#### Scenario: Pasting the link

- **WHEN** the game's address is pasted into a chat app that shows previews
- **THEN** the preview shows "Olympus Unbound", the tagline and the game's picture
