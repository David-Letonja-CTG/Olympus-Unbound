## ADDED Requirements

### Requirement: Instant blessings
Level-up and treasure choices MAY offer instant blessings, defined in data. Taking one SHALL apply its effect once, at once. It SHALL take no loadout slot and leave nothing in the loadout. The same blessing SHALL be offered again at later choices whenever its condition holds. A blessing whose condition does not hold SHALL not be offered.

`call_of_hermes` SHALL call every experience gem in the realm to the gods. The called gems SHALL fly to the nearest living god from wherever they lie, faster the farther they are, so that even gems across the realm arrive within about two seconds. They SHALL be collected on contact as usual. It SHALL only be offered when at least a configured number of experience gems lie beyond every god's magnet.

#### Scenario: Calling the gems
- **WHEN** 60 experience gems lie across the realm and the player takes `call_of_hermes`
- **THEN** every one of them flies to the god and is collected within three seconds, and the XP they carry is added as usual

#### Scenario: Taken again
- **WHEN** the player took `call_of_hermes` earlier in the run and many gems lie on the floor again at a later level-up
- **THEN** `call_of_hermes` may be offered again

#### Scenario: Nothing to call
- **WHEN** fewer gems than the configured number lie beyond the gods' magnets
- **THEN** `call_of_hermes` is not offered

#### Scenario: More levels at once
- **WHEN** the called gems carry enough XP for one or more levels
- **THEN** a level-up choice follows for each level, as usual

#### Scenario: In a room
- **WHEN** a guest takes `call_of_hermes`
- **THEN** the gems fly to the nearest living god on every screen, and the XP is the party's, as usual
