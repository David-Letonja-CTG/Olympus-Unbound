## ADDED Requirements

### Requirement: Breakable props
Every realm SHALL scatter small clusters of breakable props of its own kind (jars, urns, baskets, crates, gourds) across its arena, deterministically, at most 32. Props SHALL stand clear of obstacles, the spawn plaza, the boss arena and road centres, and SHALL not block movement. A god who walks into a standing prop SHALL break it: it shatters visibly and audibly and drops gold or XP, and rarely a heal. Each prop breaks once. Enemies SHALL not break props. In a room, every member SHALL see the same props broken.

#### Scenario: Smashing an amphora
- **WHEN** a god walks into a standing amphora on `mount_olympus`
- **THEN** it shatters, drops its loot, and stays broken for the rest of the realm

#### Scenario: Monsters leave them
- **WHEN** an enemy walks over a prop
- **THEN** the prop stays standing

#### Scenario: Same props for everyone
- **WHEN** the host breaks a prop in a room
- **THEN** every guest sees that prop broken

#### Scenario: A fair layout
- **WHEN** an arena of any realm is generated from any seed
- **THEN** its props are at most 32, and none overlaps an obstacle, the spawn plaza or the boss arena
