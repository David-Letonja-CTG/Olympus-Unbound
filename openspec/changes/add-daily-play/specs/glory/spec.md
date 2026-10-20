## ADDED Requirements

### Requirement: Quick run high scores

The game SHALL keep the ten best scores of quick runs (spec: quick-runs) in their own table, whatever the party. The entries are like the other tables', with the party size shown. The Hall of Glory SHALL show it as **Quick**, filterable by god.

#### Scenario: The Quick table

- **WHEN** the player opens the Hall of Glory and chooses Quick
- **THEN** only quick runs are listed, best first

## MODIFIED Requirements

### Requirement: Hall of Glory

The main menu SHALL lead to the Hall of Glory, which shows the high scores (solo, With allies, co-op and Quick), the achievements, the day's quests and today's Daily Trial with the player's best score today.

#### Scenario: Opening the Hall

- **WHEN** the player opens Glory from the main menu
- **THEN** the solo and co-op tables, every achievement, today's three quests and today's Daily Trial are shown
