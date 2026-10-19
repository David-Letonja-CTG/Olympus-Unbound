# merchant Specification

## Purpose
Defines the Wandering Merchant: its visits to every realm, the shop and its wares (data with one rule per kind), and the companions that fight beside their god.

## Requirements

### Requirement: The merchant's visits
The Wandering Merchant SHALL arrive at fixed times of every realm's timeline, at a point a short walk from a living god that is clear of obstacles and inside the realm, chosen by the run's seed. Its arrival SHALL be announced. It SHALL stay for a fixed time and then leave, also announced. Only one merchant SHALL be in a realm at a time; passing a gate SHALL send it away.

#### Scenario: Arrival
- **WHEN** a realm's time reaches 2:30
- **THEN** the merchant appears near the party, "A wandering merchant has arrived" is announced, and it leaves 75 seconds later

#### Scenario: Same seed, same place
- **WHEN** two runs with the same seed and the same inputs reach the merchant's arrival
- **THEN** it appears at the same place in both

### Requirement: The shop
A living god stepping into the merchant's ring SHALL open the shop for that god's player: the run pauses as for a choice, and in a room the other players wait for the shopper. The shop SHALL list every ware available to that god with its price, and Leave. Buying a ware the party can afford SHALL take its price from the run's gold, apply it, and show the shop again; a ware the party cannot afford SHALL NOT be bought. Leave SHALL close the shop. The shop SHALL open again only after the god has left the ring and stepped in again. Prices SHALL grow by a fixed share per realm cleared.

#### Scenario: Buying a companion
- **WHEN** a god with 300 gold in the run steps into the ring and buys `eagle_of_zeus` for 150
- **THEN** the run's gold is 150, an eagle fights at the god's side, and the shop is shown again without the eagle

#### Scenario: Too poor
- **WHEN** the party has 40 gold and the god picks a ware costing 120
- **THEN** nothing is bought and the gold stays 40

#### Scenario: Not twice in a row
- **WHEN** the god leaves the shop while still standing in the ring
- **THEN** the shop does not open again until the god walks out and back in

#### Scenario: Shopping in a room
- **WHEN** a guest steps into the ring
- **THEN** the guest sees the shop, and the host's HUD says the run waits for that guest

### Requirement: Wares
Wares SHALL be content data with a name, a description, a price, an icon and an effect kind; each effect kind SHALL be one reusable rule. The kinds SHALL be: a companion (available while the god does not have it and has fewer than the most companions allowed); one more level for a weapon (offered once per held weapon below its maximum level, naming the weapon); and healing (available while the god is hurt). Adding a ware of an existing kind SHALL need data only.

#### Scenario: A whetstone per weapon
- **WHEN** a god holding `thunder_spear` at level 2 and `divine_bow` at its maximum level opens the shop
- **THEN** a whetstone for the Thunder Spear (to level 3) is offered and none for the Divine Bow

#### Scenario: Healing only when hurt
- **WHEN** a god at full health opens the shop
- **THEN** ambrosia is not offered

### Requirement: Companions
A companion SHALL follow its god, hunt enemies within a set range of its god, and attack with its own weapon definition through the weapon behaviors and the one damage pipeline, its hits counting as its god's (the god's might, critical chance and element bonuses apply). A companion MAY heal its god over time. Companions SHALL NOT be hurt, SHALL follow their god to the next realm, SHALL stay where their god fell until the god rises, and SHALL leave with a player who leaves the room. A god SHALL keep at most three companions, at most one of each kind.

#### Scenario: The hound fights
- **WHEN** a god with `hound_of_the_underworld` stands still and an enemy comes within the hound's hunting range
- **THEN** the hound runs to the enemy and its bites damage and burn it

#### Scenario: The serpent heals
- **WHEN** a hurt god with `temple_serpent` waits ten seconds
- **THEN** the god has regained health from the serpent

#### Scenario: Through the gate
- **WHEN** the party passes a gate
- **THEN** every companion appears beside its god in the next realm
