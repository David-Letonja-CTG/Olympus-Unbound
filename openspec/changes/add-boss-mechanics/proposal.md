# Proposal

## Why

The owner asked (2026-10-20) to make bosses more than large enemies with a lot of health: each boss gets a signature mechanic, attack warnings are clear, and dodging at the right moment is rewarded, so a boss fight is a memorable skill check rather than a DPS check. Today every boss uses the same four attacks (slam, boulders, charge, summon) and two health phases.

## What Changes

**Shared mechanics** (each a reusable rule driven by boss data, D4):

- **Sweeps:** a cone in front of the boss, one or several in a row, alternating sides.
- **Lashes:** a line from a boss or one of its parts toward a god.
- **Boss parts:** heads or tentacles that belong to a boss. A part either only attacks on its own rhythm (Cerberus's heads), or can also be hurt and destroyed (the Hydra's heads, Scylla's tentacles). A destroyed part grows back after a while. Parts can be ordered so that only the next one in line can be hurt; the others are shielded. While parts live the boss can be guarded (it takes less damage). When every part is down the boss is **exposed** for a few seconds and takes extra damage.
- **Zones:** a part can hold a stretch of the arena: standing in its zone hurts over time and slows, until the part is destroyed.
- **Shifting walls:** walls rise around the boss, after a warning on the ground. A god caught where a wall rises is thrown aside and hurt. The walls sink when the next set rises. A charging boss that runs into a wall is **dazed** for a moment and takes extra damage.
- **Rage:** a phase can enrage a boss. It turns red, attacks with shorter pauses and moves faster.
- **Anchored bosses** stay near their arena (Scylla holds her strait).

**Signatures:**

- **Cyclops:** club sweeps (two, then three in a row), thrown boulders, a ground slam. Below 50% he **rages**: red, faster, much shorter pauses, charging and calling hoplites.
- **Cerberus:** three heads, each attacking on its own rhythm. The left head breathes fire in a cone, the middle head snaps forward in a lash, the right head rains soul-fire on the god. The body pounces and bites. The heads quicken as he weakens.
- **Hydra:** three heads that must be cut in order. They are marked I, II, III, and only the marked head can be hurt. A head grows back 14 s after it falls, so the sequence must be finished quickly. With every head down the Hydra is exposed for 8 s; otherwise her body takes only a tenth of the damage. Below 50% she grows two more heads (IV and V).
- **Scylla:** anchored in her strait, with four tentacles around her. Each tentacle holds a zone of the arena (damage over time and slow) and lashes at gods who come near. Tentacles can be destroyed and grow back. While any lives, Scylla takes half damage.
- **Asterion:** the Labyrinth answers him. Walls rise around him in shifting patterns every few seconds, after a warning, and change again and again. If his bull rush hits a wall he is dazed for 2.5 s and takes extra damage, so baiting the charge into a wall is the way to beat him.

**Warnings and dodging:**

- Every warning fills as its moment nears and **flashes white in its last quarter-second**: that is the moment to dash.
- New warning shapes for cones, lashes and rising walls. Parts show their state: shielded parts look stone-grey, the next Hydra head is marked with its number in gold, an exposed or dazed boss glows, a raging boss burns red.
- **Perfect dodge:** dashing through an attack as it lands (a warning resolving on you, or a charge passing through you while your dash makes you untouchable) is a perfect dodge. It is announced on screen with a sound, refunds the dash's stamina, and gives **Surge**: +30% damage for 3 seconds.

**In co-op** all of this is part of the host's world: parts are monsters, zones and walls are in the snapshot, and a guest's predicted movement collides with the shifting walls.

## Capabilities

### Modified Capabilities

- `boss-encounter`: signature mechanics, clearer warnings and perfect dodges.

## Non-goals

- New boss art (parts reuse sheets and code-drawn shapes); new bosses; a perfect-dodge achievement (later, as data).
