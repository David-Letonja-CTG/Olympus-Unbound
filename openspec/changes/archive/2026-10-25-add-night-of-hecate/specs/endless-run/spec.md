## ADDED Requirements

### Requirement: Event realms outside the chain
Realms of a seasonal event SHALL stand outside the chain of realms. A run that starts in one SHALL go on, realm after realm, from the first realm of the chain. No run SHALL reach an event realm through a gate.

#### Scenario: From the crossroads
- **WHEN** a party clears `crossroads_of_hecate`
- **THEN** its gate leads to `mount_olympus`

#### Scenario: Never through a gate
- **WHEN** a party clears `mount_othrys`
- **THEN** its gate leads to `mount_olympus`, not to an event realm
