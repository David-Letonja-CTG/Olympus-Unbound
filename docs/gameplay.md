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
7. **The boss** — at 07:00 the Cyclops wakes in its arena. Defeat it to win.
8. **Run summary** — outcome, time, level, kills, gold, rewards, build, discoveries → main menu or play again.
9. **Progression** — spend gold on permanent upgrades; browse the codex.

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

## Building a run

- **Weapons** (up to 6, levels 1–6): Thunder Spear, Divine Bow, Trident, Lightning Orb, War Hammer, Flaming Sword, Thunderbolt, Soul Scythe.
- **Armour** (1 slot, levels 1–3): Aegis of Olympus, Armour of the Underworld, Triton's Shell, Valkyrie's Plate.
- **Relics** (up to 4): Zeus's Eye, Soul Lantern, Golden Fleece, Trident Fragment, Phoenix Feather, Eye of Horus.
- **Skills** (stackable): Might, Swiftness, Haste, Multishot, Reach, Vitality, Bulwark, Magnetism, Wisdom of Athena, Precision, Lingering Power, Storm Caller, Forked Lightning, Fury of Flames, Titan's Strength, Shadow Pact. Element skills appear only when you wield that element.
- **Synergies** activate automatically and are announced: **Storm**, **Tempest**, **Inferno**, **Soul Reaper**, **Divine Bulwark**, **Wrath of the Sky**, **Earthshaker** (requirements in [content.md](content.md)).
- When nothing is left to offer: **Ambrosia** (heal 30%) or **Tribute** (25 gold).

## Rewards and progression

- Gold collected in the run is kept on victory and defeat; **+250** for a Mount Olympus victory; **half** (rounded down) when abandoned.
- Weapons, armour and relics held at the end become **discovered** in the codex.
- **Permanent upgrades**: Vitality, Might, Swiftness, Greed, Attraction, Resilience.
- Statistics: runs, victories, total kills, best survival time.

## Feedback

Hit flashes and damage numbers (critical hits larger and gold), status tints (burn orange, shock blue, slow violet, stun yellow), particles on hits and deaths, shockwaves, sword arcs, chain lightning, lightning strikes, screen shake (optional), and synthesized sounds for attacks, hits, kills, pickups, level-ups, damage, boss attacks and the end of a run.
