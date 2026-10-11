# Spec Delta

## MODIFIED Requirements

### Requirement: God selection
God selection SHALL list every playable god defined in content with its name, title, description, starting weapon, divine ability and base statistics. Choosing a god SHALL continue to realm selection with that god selected.

#### Scenario: Choosing Zeus
- **WHEN** the player selects god `zeus` and continues
- **THEN** realm selection opens with `zeus` as the selected god

#### Scenario: Only defined gods are offered
- **WHEN** god selection opens
- **THEN** `zeus` and `hades` are offered and no disabled placeholder buttons are shown

#### Scenario: Choosing Hades
- **WHEN** the player selects god `hades`, continues and starts a run
- **THEN** the run starts as `hades` with the weapon `bident`
