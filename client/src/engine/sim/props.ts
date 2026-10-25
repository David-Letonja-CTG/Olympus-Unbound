import { RunState } from './run-state';

/**
 * A god who walks into a standing prop breaks it (spec: arena-generation / breakable props): its bit in
 * `brokenProps`, the shatter event and its drops, rolled on the props' own stream (D5). Enemies never break props.
 */
export function breakProps(state: RunState): void {
  const props = state.arena.props;
  if (props.length === 0) return;
  for (const player of state.players) {
    if (!player.alive) continue;
    for (let i = 0; i < props.length; i++) {
      if ((state.brokenProps >>> i) & 1) continue;
      const prop = props[i];
      const reach = prop.radius + player.radius;
      if ((prop.x - player.x) ** 2 + (prop.y - player.y) ** 2 > reach * reach) continue;
      state.brokenProps = (state.brokenProps | (1 << i)) >>> 0;
      shatter(state, i);
    }
  }
}

function shatter(state: RunState, index: number): void {
  const prop = state.arena.props[index];
  const kind = state.realm.map.props?.kinds.find((k) => k.id === prop.kind);
  state.emit({
    type: 'propBroken',
    index,
    x: prop.x,
    y: prop.y,
    color: kind?.visual.color ?? 0xb06a3a,
  });
  const drops = state.balance.props;
  const rng = state.propRng;
  if (rng.chance(drops.goldChance)) state.spawnPickup('gold', prop.x - 6, prop.y + 4, drops.gold);
  if (rng.chance(drops.xpChance)) state.spawnPickup('xp', prop.x + 6, prop.y + 2, drops.xp);
  if (rng.chance(drops.healChance))
    state.spawnPickup('heal', prop.x, prop.y + 10, drops.healAmount);
}
