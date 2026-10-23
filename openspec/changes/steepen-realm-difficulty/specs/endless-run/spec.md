## MODIFIED Requirements

### Requirement: Difficulty by depth
Every realm cleared SHALL make the following realms harder:

- Enemy health and damage, and boss health and damage, SHALL be multiplied by a configured growth factor per realm cleared, compounding.
- The spawn rate and the number of enemies alive at once SHALL rise by a configured fraction per realm cleared.
- The growth of enemy health per realm SHALL be at least the most any realm's own per-minute growth reaches, so a new realm's first enemies are never weaker than the last enemies of the realm before.
- Every realm after the first SHALL start its spawn phases a configured number of seconds in per realm cleared, up to a configured maximum. Its timed events, boss time and merchant arrivals SHALL keep their own times.

The entity caps SHALL still apply.

#### Scenario: The second realm
- **WHEN** the party has cleared one realm
- **THEN** a new enemy has the per-realm health growth times the health it would have in the first realm at the same realm time, and deals the per-realm damage growth times its damage

#### Scenario: Compounding
- **WHEN** the party has cleared two realms
- **THEN** a boss has the square of the per-realm boss health growth times its health in the first realm

#### Scenario: Never weaker on arrival
- **WHEN** the party enters the second realm after a long fight in the first
- **THEN** the first enemies of the second realm have at least the health of the same enemies at the end of the first

#### Scenario: Head start
- **WHEN** the party enters the second realm
- **THEN** its spawn phase is the one due 120 seconds into the realm, while its first horde and its boss come at their own times

#### Scenario: The first realm is unchanged
- **WHEN** a run starts
- **THEN** the first realm's enemies, spawn phases and boss are as before
