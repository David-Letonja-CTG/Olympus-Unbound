# Gameplay

The game as the player experiences it in the vertical slice. Numbers live in `client/src/content/` and may change with balancing; this page describes the shape.

## The loop

0. **Intro** — on first launch, a ~55-second scene: the gods at the altar on a moonlit Olympus, the horde breaking in from the north, the gods falling one by one, and Zeus unleashing the storm. Skip with Esc, Enter, Space, a click or the gamepad; replay it from the main menu (*Intro*).
1. **Main menu** → *Play*, *Co-op*, *Progression*, *Settings*; the gold total is shown.
2. **Choose a god** — Zeus, Hades, Poseidon or Athena (more gods later).
3. **Choose a realm** — Mount Olympus, with a seed (random by default; enter one to replay an arena).
4. **Survive.** Weapons fire on their own; the player moves, positions, collects XP and uses the divine ability.
5. **Level up** — the run pauses; pick one of three upgrades.
6. **Pressure rises** — new enemy types, packs, hordes and elites.
7. **The boss** — after 7 minutes in a realm its boss wakes in its arena (the Cyclops on Mount Olympus). Defeating it adds its gold and opens a **gate** to the next realm.
8. **Deeper** — step into the gate (or wait a minute) and the party enters the next realm: a new arena, the realm's own monsters from the start of its timeline, everything a little stronger than before. The run goes on realm after realm until every god has fallen.
9. **Run summary** — time, realms cleared, the realm reached, level, kills, gold, rewards, build, discoveries → main menu or play again.
10. **Progression** — spend gold on permanent upgrades; browse the codex.

## Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Move | WASD / arrow keys | left stick / d-pad |
| Divine ability | Space or Shift | A (south) or right trigger |
| Pause / resume | Esc or P | Start |
| Choose an upgrade | 1–3, or arrows/W/S + Enter/Space, or mouse | d-pad + A |

The game pauses by itself when the window loses focus or the tab is hidden (not in a room's run).

## Co-op rooms

Up to four gods fight one horde, each player in their own browser.

- **Create a room** (*Co-op → Create room*): you get a five-character code, like `K7QXP`, to share with friends. **Join a room** with a friend's code.
- **Lobby:** everyone picks a name and a god (several players may pick the same god), and guests mark themselves *Ready*. The host picks the realm and starts once everyone is ready. The loading screen lists the party and the room code, and the run starts when everyone has loaded.
- **Together:** each camera follows its own god, or an ally after you fall. Experience and level are shared, but each player gets their own three offers and picks their own upgrade. The run waits until everyone has chosen (*Waiting for Bo to choose…*).
- **Reviving:** a fallen god's spirit floats where they fell. Stand beside it for 3 seconds (a ring fills) and they rise with half their health. Stepping away drains the ring. Passing a gate also brings every fallen god along. If every god is down at once, the run ends.
- **Difficulty per player:** every god beyond the first adds 65% enemy health, 50% more spawns and enemies alive at once, and 90% boss health.
- **Pause:** in a room, the menu does not stop the fight, and leaving the window does not pause. The host's menu offers *End run for everyone*, a guest's *Leave room*.
- **Leaving:** a guest who leaves (or loses the connection) leaves the battle, and the run goes on. If the host leaves, everyone's run ends as abandoned. Everyone keeps their own rewards in their own save. A room lasts one run; the summary offers *Co-op* to start another.
- Rooms connect browsers directly (WebRTC). A public service only introduces them; nothing is stored online. Keep the host's game visible, because browsers slow down hidden tabs.

## Night on Olympus

Runs take place at night. The arena is dark beyond your light; braziers ring the marble plazas, lightning and fire light up their surroundings, fog drifts and embers float over the field. Enemies outside the light stay visible as dim figures; telegraphs, enemy arrows and pickups are always drawn at full strength.

**Graphics quality** (Settings or the pause menu, applies at once): *Low* — fewer lights, no fog, embers, bloom or colour grading (chosen automatically without hardware graphics); *Medium*; *High* — the most lights, denser fog and embers, bloom on lightning and fire.

## The HUD

Health fills an **amphora** (bottom left), the experience bar and your weapons, armour and relics sit along the bottom, the divine ability waits in an iron slot (bottom right) with a dark cooldown sweep and the seconds left, the run time sits in the top plaque with gold and kills at the top right, active synergies at the top left, and the boss appears in a banner under the timer.

## Zeus, King of the Sky

Health 120, speed 210, critical chance 13% (with his passive). Starts with **Thunder Spear**. Ability **Wrath of Olympus** (25 s): lightning strikes up to 8 nearby foes, stunning and shocking them. Passive **Thunderborn**: +10% lightning damage, +5% critical chance. Lightning items are offered more often.

## Hades, Lord of the Underworld

Health 150, speed 190, armour 2: he fights up close and outlasts the horde. Starts with the **Bident of Hades** (a forward thrust at the nearest foe that drinks 3% of its damage as life). Ability **Gates of Tartarus** (24 s): the abyss opens around him — every foe within reach is struck, held for a moment and slowed, and he heals from it. Passive **Lord of the Dead**: +15% shadow damage; heals for 1.5% of all damage dealt. Shadow and fire items are offered more often.

## Poseidon, Lord of the Sea

Health 145, speed 200, armour 1: he holds the line and keeps the horde at bay. Starts with the **Trident** (three piercing prongs with heavy knockback). Ability **Tidal Wave** (20 s): nine walls of sea-water roll out in a wide arc, crash through every foe in their path, hurl them back and leave them slowed. Passive **Earth-Shaker**: +30% knockback, +10% area, +10% physical damage. Physical and lightning items are offered more often.

## Athena, Goddess of Wisdom and War

Health 135, speed 205, armour 2, critical chance 12% (with her passive): a precise striker who controls the field. Starts with the **Spear of Athena** (a piercing bronze javelin with a high critical chance). Ability **Gorgon's Gaze** (26 s): she raises the Aegis and every foe within a wide radius is struck and turned to stone for 2.5 seconds. Passive **Wisdom of War**: +15% experience, +7% critical chance. Physical and lightning items are offered more often.

## Mount Olympus

A 64×64-tile arena (4096 px) of grass, meadow and earth ringed by cliffs, painted fresh for every seed with smooth transitions, texture and shadows. Marble plazas: the spawn plaza in the centre, ruins (rings of columns, braziers around them), and the Cyclops's arena far from the spawn. Worn dirt **roads** lead from the spawn to every ruin, to the **temple** — a stepped marble stylobate with a broken colonnade and an altar between two braziers — and to the Cyclops. **Ruined walls** with breaches, olive groves, statues, rocks and broken columns block movement and enemy arrows; roads are always open ground. Flowers, grass tufts, pebbles, rubble and marble shards are decoration only.

**Loading:** starting a run shows the realm at night, your party and a line of lore while the art loads and the realm is painted (*Summoning the gods* → *Shaping the realm* → *The horde gathers*); the run starts at 00:00 when it fades away.

| Time | What happens |
|---|---|
| 00:00 | Satyrs |
| 00:40 | Harpies; Stymphalian bird flocks |
| 01:00 | A satyr horde surrounds you |
| 01:30 | Corrupted hoplites |
| 02:00 | **Elite** corrupted hoplite |
| 02:30 | Centaur archers |
| 03:00 | A harpy horde |
| 03:30 | Minotaurs (charge after a red telegraph) |
| 04:00 | **Elite** minotaur |
| 04:30 | Fallen oracles (summon bird flocks) |
| 05:00 | A hoplite horde |
| 05:30 | Marble sentinels; **elite** centaur archer |
| 06:15 | **Elite** marble sentinel |
| 07:00 | **The Cyclops** (spawning slows) |

Enemy health and damage grow a little each minute (capped). Elites are larger and much tougher, carry a gold health bar and always drop a treasure chest (a free upgrade choice).

## The Cyclops

12,000 health. Phase 1: **Ground Slam** (circle around it) and **Boulder Throw** (circles at and around you). Below 50%: enraged — faster, adds **Rampage Charge** (a marked lane, then a dash), a bigger slam, five boulders and **Call the Legion** (summons hoplites). Every damaging attack is marked in red first; only a player inside the mark when it ends is hit. A red arrow at the screen edge points to the Cyclops while it is off-screen.

## The Underworld

The fields of Asphodel beneath a sunless sky: ash, pale asphodel and basalt in a cold violet light, soul-wisps instead of embers. Black-marble plazas are ringed by obsidian columns and blue soul-fire braziers. The ruined hall of Hades keeps a black altar, and dead groves and Greek grave stelae stand among bones. It follows Mount Olympus in the chain of realms, and you can also start a run here.

| Realm time | What comes |
|---|---|
| 00:00 | **Shades**: frail, weaving spirits of the dead, in great numbers |
| 00:40 | **Furies** (the Erinyes): fast, winged avengers |
| 01:30 | The skeletal **hoplites** of Mount Olympus |
| 02:30 | **Lampads**: torch-nymphs of Hecate who keep their distance and hurl violet soul-fire |
| 03:30 | **Orthrus**: Cerberus's two-headed brother; lowers its heads, then charges |
| 07:00 | **Cerberus** (spawning slows) |

Hordes of shades and furies and elite furies, lampads and Orthrus arrive on the way, like on Olympus.

## Cerberus

The three-headed hound of Hades, with a smouldering serpent mane (13,000 health, 300 gold).
- **Calm:** a triple bite in a circle around itself, hellfire breath on three circles under you, and a pounce along a red line.
- **Below half health:** it howls for the pack, calling three Orthrus, then bites wider, breathes six fires and pounces faster.

## Lernaean Marsh

The poisoned swamp of Lerna: bog, mud and reedbeds around deep water in a green mist, lit by will-o'-wisps. Sunken shrines of mossy marble, a drowned temple and cypress groves stand among reeds and lily pads. It follows the Underworld in the chain of realms, and you can also start a run here.

| Realm time | What comes |
|---|---|
| 00:00 | **Swamp serpents**: the Hydra's brood; fast, weaving, numerous, later in packs |
| 00:40 | **Lamiae**: serpent-tailed; they coil, then lunge |
| 01:30 | **Giant crabs**: the brood of Karkinos; slow, tough, heavy blows |
| 02:30 | **Naiads**: nymphs of the poisoned springs who keep their distance and spit venom |
| 07:00 | **The Hydra** (spawning slows) |

## The Hydra

Five serpent necks rising from one body (15,000 health, 320 gold).
- **Calm:** its heads bite in a circle around it, venom rains on four circles under you, and it calls a brood of four serpents.
- **Below half health:** "Cut one head and two grow back!" It moves faster, calls six serpents, rains seven venoms, and lunges along a red line.

## Aegean Shore

Moonlit sand, dunes and sea-rock above the strait, under a cool silver light with drifting spray. Sea-worn marble temples and plazas, wrecks of Odysseus's fleet, spilled amphorae and beacon braziers line the beach among shells and seaweed. It follows the Lernaean Marsh in the chain of realms, and you can also start a run here.

| Realm time | What comes |
|---|---|
| 00:00 | **Drowned sailors**: Odysseus's lost crew; slow, relentless, later in packs |
| 00:40 | **Sirens**: they keep their distance and hurl their song (rose rings) |
| 01:30 | **Giant crabs** from the shore |
| 02:30 | **Tritons**: Poseidon's mermen; they lower their tridents, then charge |
| 07:00 | **Scylla** (spawning slows) |

## Scylla

The monster of the strait: a woman with six hounds at her waist and serpent tentacles beneath (16,000 health, 340 gold).
- **Calm:** her six hounds bite in a circle around her, Charybdis opens four whirlpools under you, and her tentacles lash along a red line.
- **Below half health:** "The drowned answer Scylla's call!" She calls five drowned sailors, moves faster, bites wider and opens seven whirlpools.

## Building a run

- **Weapons** (up to 6, levels 1–6): Thunder Spear, Divine Bow, Trident, Lightning Orb, War Hammer, Flaming Sword, Thunderbolt, Soul Scythe.
- **Armour** (1 slot, levels 1–3): Aegis of Olympus, Armour of the Underworld, Triton's Shell, Valkyrie's Plate.
- **Relics** (up to 4): Zeus's Eye, Soul Lantern, Golden Fleece, Trident Fragment, Phoenix Feather, Eye of Horus.
- **Skills** (stackable): Might, Swiftness, Haste, Multishot, Reach, Vitality, Bulwark, Magnetism, Wisdom of Athena, Precision, Lingering Power, Storm Caller, Forked Lightning, Fury of Flames, Titan's Strength, Shadow Pact. Element skills appear only when you wield that element.
- **Synergies** activate automatically and are announced: **Storm**, **Tempest**, **Inferno**, **Soul Reaper**, **Divine Bulwark**, **Wrath of the Sky**, **Earthshaker** (requirements in [content.md](content.md)).
- When nothing is left to offer: **Ambrosia** (heal 30%) or **Tribute** (25 gold).

## Rewards and progression

- Gold collected in the run is kept when you fall, including each boss's gold (**+250** for the Cyclops); **half** (rounded down) when abandoned.
- Weapons, armour and relics held at the end become **discovered** in the codex.
- **Permanent upgrades**: Vitality, Might, Swiftness, Greed, Attraction, Resilience.
- Statistics: runs, victories, total kills, best survival time.

## Feedback

Hit flashes and damage numbers (critical hits larger and gold), status tints (burn orange, shock blue, slow violet, stun yellow), particles on hits and deaths, shockwaves, sword arcs, chain lightning, lightning strikes, screen shake (optional), and synthesized sounds for attacks, hits, kills, pickups, level-ups, damage, boss attacks and the end of a run.
