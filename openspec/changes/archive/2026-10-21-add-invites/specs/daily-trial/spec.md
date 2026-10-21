## MODIFIED Requirements

### Requirement: Sharing a run

Every run summary SHALL offer **Share**. Share SHALL make a picture of the result that dares friends to beat it. The picture SHALL show:

- the game's name;
- a headline naming the player when they have one ("Ada challenges you"), else a nameless dare;
- the trial's date and twist, or "Quick run";
- the god in front of the realm's boss;
- time, kills, level and realms;
- the score as **Score to beat**;
- a closing line saying where to play.

Share SHALL open the device's share sheet with the picture and a challenge link where supported. Otherwise it SHALL save the picture and copy the challenge link, saying so.

#### Scenario: Sharing on a phone

- **WHEN** the player taps Share on a phone that can share files
- **THEN** the share sheet opens with the picture and the challenge link

#### Scenario: Sharing on a computer

- **WHEN** the browser cannot share files
- **THEN** the picture is downloaded, the challenge link is copied, and the summary says both

#### Scenario: A named dare

- **WHEN** a player named Ada shares a run that scored 5,100
- **THEN** the picture reads "Ada challenges you" and shows 5,100 as the score to beat

### Requirement: Challenge links

A challenge link SHALL encode the run's god, starting realm, seed, length and twist, the score to beat, and the sender's name when they have one. Opening one SHALL show a challenge screen naming them (and the sender), with Accept, which starts that exact run (solo). A challenge with a twist SHALL NOT enter any high-score table; one without a twist SHALL be scored like any run. The challenge's summary SHALL say whether the score to beat was beaten. A link with missing or unknown parts SHALL open the main menu instead. A name SHALL be shortened to the game's name limit.

#### Scenario: Accepting a challenge

- **WHEN** a friend opens a challenge link for `hades` in `the_underworld`, seed `991`, quick, with 3,400 to beat, and taps Accept
- **THEN** a quick run starts as Hades in the Underworld with seed 991, and its summary compares the score with 3,400

#### Scenario: A broken link

- **WHEN** a challenge link names a god that does not exist
- **THEN** the main menu opens

#### Scenario: A named challenge

- **WHEN** a friend opens a challenge link sent by Ada
- **THEN** the challenge screen says "Ada challenges you"
