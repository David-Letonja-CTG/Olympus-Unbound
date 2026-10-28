## ADDED Requirements

### Requirement: Skins in event shops
An event shop reward MAY be a skin for one god instead of modifiers or an unlock. Buying it SHALL unlock that skin for good, and the skin can be chosen at any time of the year. Every event's shop SHALL sell one skin for 100 of its currency, three events per god; the Night of Hecate's shop SHALL sell `hades_shroud`, a skin for `hades`, and the Winds of Boreas's `zeus_frost`, a skin for `zeus`.

#### Scenario: Buying the shroud
- **WHEN** the player buys `hades_shroud` with honey cakes
- **THEN** it shows as owned and Hades's `hades_shroud` skin can be chosen on god selection, also after the event ends

#### Scenario: Not affordable
- **WHEN** the player holds fewer honey cakes than `hades_shroud` costs
- **THEN** it cannot be bought and the skin stays locked

#### Scenario: Every event sells a skin
- **WHEN** the shops of all twelve events are listed
- **THEN** each has exactly one skin, and each god has three of them
