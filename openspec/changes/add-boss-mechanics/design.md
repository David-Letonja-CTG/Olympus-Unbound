# Design

## Data (D4)

```ts
type BossAttack = … existing slam | boulder | charge | summon
  | { type: 'sweep'; id; windup; radius; arc; damage; count; gap }   // cones toward the target, alternating ±arc/2
  | { type: 'lash'; id; windup; length; width; damage }               // a line from the attacker toward the target
  | { type: 'walls'; id; windup; duration; damage; rings: number[]; segments; gapShare }  // pillars around the boss

interface BossPhase { … ; enraged?: boolean; pauseMultiplier?: number }

interface BossPartDefinition {
  id; name; sprite?; radius;
  place: { from: 'boss' | 'arena'; angle: number; distance: number };
  attacks: readonly BossAttack[]; pause: number; delay: number;   // its own rhythm
  health?: number;           // damageable (spawned as a monster); absent: an attacking head only
  order?: number;            // ordered: only the lowest living order can be hurt
  regrow?: number;           // seconds after it falls
  zone?: { radius; dps; slow };
  fromPhase?: number;        // appears in this boss phase
}

interface BossDefinition { … ; parts?: readonly BossPartDefinition[];
  guard?: number;            // damage taken while a damageable part lives (0.1 = a tenth)
  exposed?: { seconds; damageTaken };   // when every damageable part is down
  chargeStun?: number;       // dazed seconds when a charge hits a wall
  anchored?: number }        // stays within this distance of the arena's centre
```

Part monsters are made from the part definition (`bossPartAsEnemy`, id `${boss}_${part}`), registered in `ContentIndex.enemies` so snapshots resolve them like any monster. They do not move on their own: each step they sit at their place (around the boss, or around the arena's centre).

## Simulation

- `bosses/boss.ts` keeps the attack starts. A small `BossAttacker` (origin, facing) lets the boss and its parts share `startAttack`. New hazard shape `cone` (angle, arc).
- `bosses/parts.ts`: spawning parts on arrival and per phase, placing them each step, their rhythms, regrowth timers, the order (`Enemy.guarded`, `Enemy.marked`), guard and exposure of the body, zones (damage over time and slow on gods inside, applied through `damagePlayer` in ticks of 0.5 s).
- `bosses/walls.ts`: `walls` attacks add warned wall sets (hazards with `kind: 'wall'`); on rise, the pillars become dynamic obstacles in `WorldCollision` (`setDynamic`), gods inside are pushed out and hurt; the previous set sinks. A charging boss that touches a dynamic pillar ends its dash and is dazed (stun status for `chargeStun`, `Enemy.dazed` +50% damage taken).
- The damage pipeline stays one (rule 5): `damageTakenMultiplier(enemy)` also applies `guarded` (0), the boss's guard or exposure, and dazed; `hitEnemy` multiplies the attacker's damage by Surge.
- Rage: the phase's `enraged` sets `BossRuntime.enraged`; `pauseMultiplier` scales `attackPause` and the parts' pauses.
- Perfect dodge: `damagePlayer` gains a `fromBoss` flag. When a boss hit meets a player whose dash is running (`dashTime > 0` or within the grace), it emits `perfectDodge` once per dash, refunds the dash cost and sets `Player.surge = 3`.
- Warnings: hazards keep `timer`/`warn`; views flash the outline when `timer ≤ 0.25`.

## Net

`SNAPSHOT_FORMAT` 5: hazards carry the cone's angle and arc. Enemy flags gain guarded, marked (with the order number), exposed, dazed and enraged. The snapshot carries zones (x, y, radius) and walls (x, y, radius, rising or standing). The guest's collision takes the walls every frame (`setDynamic`), so its prediction matches the host.

## Views

- Telegraphs: cones, flashing outlines, wall warnings (pillar outlines filling).
- Walls: `labyrinth_wall` sprites rising (scale and alpha over 0.3 s).
- Zones: a dark-teal tide ring above the darkness.
- Parts: shielded parts tinted stone grey with a ring; the marked head gets a gold ring and its number; an exposed boss gets a white pulse; a dazed boss gets circling stars; a raging boss is tinted red with embers.
- Perfect dodge: a floating "Perfect dodge!", a bright ring and the `crit` sound; Surge shows as a gold aura on the god.

## Risks

- Balance: the Hydra's guard and exposure, and Scylla's guard, make DPS alone fail by design. Headless autopilot runs check every boss can still be beaten by a strong build; the bot learns to prefer the marked head (it hits what it targets anyway; weapons target nearest, so the guard keeps the fight honest).
- Weapons target the nearest enemy, and shielded heads may soak shots. That is acceptable and teaches positioning: the marked head is lit.
