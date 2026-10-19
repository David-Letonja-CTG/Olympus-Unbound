# Design

## Content (D4)

```ts
type WareEffect =
  | { type: 'companion'; companion: string }
  | { type: 'weaponLevel' }            // offered once per held weapon below its maximum
  | { type: 'heal'; fraction: number };

interface WareDefinition { id; name; description; price; effect: WareEffect; visual }

interface CompanionDefinition {
  id; name; description;
  visual: Visual & { tint: number; scale: number };  // an existing rendered sheet (D15)
  radius; speed;
  hunt: number;      // hunts enemies within this distance of its god
  reach: number;     // stops this far from its target to attack (melee small, ranged large)
  attack: AbilityDefinition;  // fired through WEAPON_BEHAVIORS (not orbit)
  heal?: number;     // health per second for its god
}
```

`balance.merchant { arrivals: [150, 330], stays: 75, radius: 60, distance: 340, priceGrowth: 0.5, maxCompanions: 3 }`. Content lives in `content/merchant.ts`; `validateContent` checks companion references, attack behaviors and prices.

## Simulation

- `sim/merchant.ts`: `updateMerchant(state, dt)` (arrival at a realm-time crossing, placement with a new `merchantRng` fork, leave timer, ring entry → `state.shopQueue`), `shopOffers(state, player)` (one `UpgradeOffer` of kind `ware` per available ware, with `price` and `target` for whetstones, then `leave`), `buyWare(state, player, offer)`.
- `WARE_EFFECTS: Record<WareEffect['type'], { available(state, player, ware): targets[]; apply(state, player, ware, target) }>`: the one place a new ware kind is added.
- `RunSimulation.openChoiceIfPending` opens a shop round for the first queued player when no level or chest round is due: `UpgradeChoice { source: 'shop', gold }`. `choose` on a shop round: `leave` closes it; a ware is bought only if affordable, then the shop is shown again with fresh offers.
- `sim/companions.ts`: `Companion { id, def, ownerId, x, y, px, py, facing, moving, weapon: WeaponInstance }`. Each step: owner alive → nearest enemy within `hunt` of the owner → move to `reach` of it, fire the attack when ready through `WEAPON_BEHAVIORS[behavior].fire` with the companion standing in for the god's position and facing (a shallow copy of the owner with the companion's position, made only when it fires); else follow the owner. Hits carry the owner's ID, so the one damage pipeline applies the owner's stats (rule 5). Healing goes through the god's health clamp. Travel places companions beside their god.
- Run phase and step order: `updateMerchant` after pickups; `updateCompanions` after weapons.

## Presentation and net

- `WorldFrame` gains `companions` and `merchant`; the snapshot carries both (`SNAPSHOT_FORMAT` 4). Views draw them from their sheet with a warm tint; the merchant gets a lantern light, a ring above the darkness (Effects `marks`), and a gold off-screen pointer like the boss's. The minimap marks the merchant.
- HUD: `merchant?: { leavesIn }` banner; `companions: HudItem[]` in the loadout row.
- The choice dialog shows a shop: title "The Wandering Merchant", the party's gold, prices, unaffordable wares disabled, Leave.
- Sounds reuse cues: arrival `gate`, purchase `choose`.

## Risks

- Companions add attacks per step: three per god, four gods → twelve attackers at most; their cooldowns are ≥ 0.9 s, cheaper than a weapon.
- Shopping pauses a room's run for everyone, like a chest; the stay is long enough and the shop opens only on entry.
