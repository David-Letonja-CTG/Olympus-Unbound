import {
  ArmourDefinition,
  BossDefinition,
  CompanionDefinition,
  EnemyDefinition,
  GameContent,
  GodDefinition,
  Goal,
  RealmDefinition,
  RelicDefinition,
  SkillDefinition,
  WareDefinition,
  WeaponDefinition,
} from './types';
import { ALLOWED_LICENCES, AssetManifest } from './assets';
import { CutsceneDefinition } from './cutscene';

function byId<T extends { id: string }>(items: readonly T[]): ReadonlyMap<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function lookup<T>(map: ReadonlyMap<string, T>, kind: string, id: string): T {
  const item = map.get(id);
  if (!item) throw new Error(`Unknown ${kind} "${id}".`);
  return item;
}

/** Fast lookups by ID over validated content. */
export class ContentIndex {
  readonly gods: ReadonlyMap<string, GodDefinition>;
  readonly weapons: ReadonlyMap<string, WeaponDefinition>;
  readonly armour: ReadonlyMap<string, ArmourDefinition>;
  readonly relics: ReadonlyMap<string, RelicDefinition>;
  readonly skills: ReadonlyMap<string, SkillDefinition>;
  readonly enemies: ReadonlyMap<string, EnemyDefinition>;
  readonly bosses: ReadonlyMap<string, BossDefinition>;
  readonly realms: ReadonlyMap<string, RealmDefinition>;
  readonly wares: ReadonlyMap<string, WareDefinition>;
  readonly companions: ReadonlyMap<string, CompanionDefinition>;

  constructor(readonly content: GameContent) {
    this.gods = byId(content.gods);
    this.weapons = byId(content.weapons);
    this.armour = byId(content.armour);
    this.relics = byId(content.relics);
    this.skills = byId(content.skills);
    this.enemies = byId(content.enemies);
    this.bosses = byId(content.bosses);
    this.realms = byId(content.realms);
    this.wares = byId(content.wares);
    this.companions = byId(content.companions);
  }

  god(id: string): GodDefinition {
    return lookup(this.gods, 'god', id);
  }
  weapon(id: string): WeaponDefinition {
    return lookup(this.weapons, 'weapon', id);
  }
  enemy(id: string): EnemyDefinition {
    return lookup(this.enemies, 'enemy', id);
  }
  boss(id: string): BossDefinition {
    return lookup(this.bosses, 'boss', id);
  }
  realm(id: string): RealmDefinition {
    return lookup(this.realms, 'realm', id);
  }
}

/** Every god finds at least this many weapons in a run (spec: run-progression / god arsenals). */
const MIN_ARSENAL = 4;

/** A weapon without `gods` is common to all (spec: run-progression / god arsenals). */
export function wieldableBy(weapon: WeaponDefinition, godId: string): boolean {
  return !weapon.gods || weapon.gods.includes(godId);
}

/**
 * Checks cross-references and invariants the type system cannot express. Returns every problem found
 * (empty when valid), so one test run lists all content mistakes at once.
 */
export function validateContent(content: GameContent): string[] {
  const errors: string[] = [];
  const index = new ContentIndex(content);

  const groups: [string, readonly { id: string }[]][] = [
    ['god', content.gods],
    ['weapon', content.weapons],
    ['armour', content.armour],
    ['relic', content.relics],
    ['skill', content.skills],
    ['synergy', content.synergies],
    ['enemy', content.enemies],
    ['boss', content.bosses],
    ['realm', content.realms],
    ['permanent upgrade', content.permanentUpgrades],
  ];
  for (const [kind, items] of groups) {
    const seen = new Set<string>();
    for (const item of items) {
      if (!/^[a-z][a-z0-9_]*$/.test(item.id))
        errors.push(`${kind} id "${item.id}" is not snake_case.`);
      if (seen.has(item.id)) errors.push(`Duplicate ${kind} id "${item.id}".`);
      seen.add(item.id);
    }
  }

  for (const god of content.gods) {
    const start = index.weapons.get(god.startingWeapon);
    if (!start) {
      errors.push(`God "${god.id}" starts with unknown weapon "${god.startingWeapon}".`);
    } else if (!wieldableBy(start, god.id)) {
      errors.push(`God "${god.id}" starts with "${start.id}", which is not theirs.`);
    }
    const arsenal = content.weapons.filter((w) => wieldableBy(w, god.id)).length;
    if (arsenal < MIN_ARSENAL)
      errors.push(`God "${god.id}" can find only ${arsenal} weapons; needs ${MIN_ARSENAL}.`);
  }
  const goalProblems = (where: string, goal: Goal) => {
    if (!(goal.target > 0)) errors.push(`${where} needs a positive target.`);
    if (goal.god && !index.gods.has(goal.god))
      errors.push(`${where} names unknown god "${goal.god}".`);
    if (goal.everyGod && goal.god) errors.push(`${where} cannot ask for one god and every god.`);
    if (goal.measure === 'runs' && goal.over === 'run')
      errors.push(`${where} counts runs within one run.`);
  };
  const glory = [
    ['Achievement', content.achievements],
    ['Daily quest', content.dailyQuests],
  ] as const;
  for (const [kind, items] of glory) {
    const seen = new Set<string>();
    for (const item of items) {
      if (!/^[a-z][a-z0-9_]*$/.test(item.id))
        errors.push(`${kind} id "${item.id}" is not snake_case.`);
      if (seen.has(item.id)) errors.push(`Duplicate ${kind} id "${item.id}".`);
      seen.add(item.id);
      goalProblems(`${kind} "${item.id}"`, item.goal);
      if (!(item.gold > 0)) errors.push(`${kind} "${item.id}" needs a gold reward.`);
    }
  }
  if (content.dailyQuests.length < 3) errors.push('Content needs at least three daily quests.');

  // The merchant (spec: merchant).
  const companionIds = new Set(content.companions.map((c) => c.id));
  for (const ware of content.wares) {
    if (!(ware.price > 0)) errors.push(`Ware "${ware.id}" needs a price.`);
    if (ware.effect.type === 'companion' && !companionIds.has(ware.effect.companion))
      errors.push(`Ware "${ware.id}" sells unknown companion "${ware.effect.companion}".`);
  }
  for (const c of content.companions) {
    if (c.attack.behavior === 'orbit')
      errors.push(`Companion "${c.id}" cannot attack with orbs (they circle the god).`);
    if (!(c.attack.base.cooldown > 0)) errors.push(`Companion "${c.id}" needs a cooldown.`);
  }
  for (const quest of content.dailyQuests)
    if (quest.goal.everyGod) errors.push(`Daily quest "${quest.id}" cannot ask for every god.`);

  for (const weapon of content.weapons) {
    for (const godId of weapon.gods ?? [])
      if (!index.gods.has(godId))
        errors.push(`Weapon "${weapon.id}" belongs to unknown god "${godId}".`);
    if (weapon.base.cooldown <= 0) errors.push(`Weapon "${weapon.id}" needs a positive cooldown.`);
  }
  for (const armour of content.armour) {
    if (armour.levels.length === 0) errors.push(`Armour "${armour.id}" has no levels.`);
  }
  for (const skill of content.skills) {
    if (skill.maxLevel < 1) errors.push(`Skill "${skill.id}" needs maxLevel ≥ 1.`);
  }
  for (const upgrade of content.permanentUpgrades) {
    if (upgrade.costs.length === 0) errors.push(`Permanent upgrade "${upgrade.id}" has no levels.`);
  }

  for (const synergy of content.synergies) {
    if (synergy.requirements.length === 0)
      errors.push(`Synergy "${synergy.id}" has no requirements.`);
    for (const r of synergy.requirements) {
      const missing =
        (r.type === 'weapon' && !index.weapons.has(r.id)) ||
        (r.type === 'armour' && !index.armour.has(r.id)) ||
        (r.type === 'relic' && !index.relics.has(r.id)) ||
        (r.type === 'skill' && !index.skills.has(r.id));
      if (missing)
        errors.push(
          `Synergy "${synergy.id}" requires unknown ${r.type} "${'id' in r ? r.id : ''}".`,
        );
    }
  }

  for (const enemy of content.enemies) {
    if (enemy.behavior.type === 'summoner' && !index.enemies.has(enemy.behavior.summon)) {
      errors.push(`Enemy "${enemy.id}" summons unknown enemy "${enemy.behavior.summon}".`);
    }
  }

  for (const boss of content.bosses) {
    if (boss.phases.length === 0 || boss.phases[0].below !== 1) {
      errors.push(`Boss "${boss.id}" needs a first phase starting at health fraction 1.`);
    }
    for (const phase of boss.phases) {
      if (phase.attacks.length === 0) errors.push(`Boss "${boss.id}" has a phase without attacks.`);
      for (const attack of phase.attacks) {
        if (attack.type === 'summon' && !index.enemies.has(attack.enemy)) {
          errors.push(`Boss "${boss.id}" summons unknown enemy "${attack.enemy}".`);
        }
      }
    }
  }

  for (const realm of content.realms) {
    const where = `Realm "${realm.id}"`;
    if (!index.bosses.has(realm.boss.id))
      errors.push(`${where} uses unknown boss "${realm.boss.id}".`);
    if (realm.timeline.length === 0 || realm.timeline[0].from !== 0) {
      errors.push(`${where} timeline must start with a phase at 0 seconds.`);
    }
    for (let i = 1; i < realm.timeline.length; i++) {
      if (realm.timeline[i].from <= realm.timeline[i - 1].from) {
        errors.push(`${where} timeline phases must be in increasing order.`);
      }
    }
    for (const phase of realm.timeline) {
      if (phase.enemies.length === 0) errors.push(`${where} has a spawn phase without enemies.`);
      for (const e of [...phase.enemies, ...(phase.groups ?? [])]) {
        if (!index.enemies.has(e.id)) errors.push(`${where} spawns unknown enemy "${e.id}".`);
      }
    }
    for (const event of realm.events) {
      if (!index.enemies.has(event.enemy))
        errors.push(`${where} event spawns unknown enemy "${event.enemy}".`);
    }
    const map = realm.map;
    const terrainIds = new Set(map.terrain.types.map((t) => t.id));
    const obstacleIds = new Set(map.obstacles.map((o) => o.id));
    for (const band of map.terrain.bands) {
      if (!terrainIds.has(band.terrain))
        errors.push(`${where} uses unknown terrain "${band.terrain}".`);
    }
    for (const id of [map.terrain.plaza, map.terrain.border]) {
      if (!terrainIds.has(id)) errors.push(`${where} uses unknown terrain "${id}".`);
    }
    const placedKinds = [
      ...map.pointsOfInterest.flatMap((rule) =>
        rule.type === 'temple' ? [rule.column, rule.fallen, rule.altar, rule.light] : [rule.kind],
      ),
      ...map.scatter.map((rule) => rule.kind),
    ];
    for (const kind of placedKinds) {
      if (!obstacleIds.has(kind)) errors.push(`${where} places unknown obstacle "${kind}".`);
    }
    for (const decoration of map.decorations) {
      for (const t of decoration.terrain) {
        if (!terrainIds.has(t)) errors.push(`${where} decorates unknown terrain "${t}".`);
      }
    }
  }

  errors.push(...validateManifest(content.assets));
  for (const cutscene of content.cutscenes) errors.push(...validateCutscene(cutscene, index));

  if (content.gods.length === 0) errors.push('Content needs at least one god.');
  if (content.realms.length === 0) errors.push('Content needs at least one realm.');
  return errors;
}

/** Asset manifest checks that need no file system (`scripts/check-assets.mjs` checks the files themselves). */
export function validateManifest(manifest: AssetManifest): string[] {
  const errors: string[] = [];
  const files = new Map<string, AssetManifest['files'][number]>();
  for (const file of manifest.files) {
    const where = `Asset "${file.id}"`;
    if (files.has(file.id)) errors.push(`Duplicate asset file id "${file.id}".`);
    files.set(file.id, file);
    if (!ALLOWED_LICENCES.includes(file.licence.name)) {
      errors.push(`${where} has a licence that is not allowed: ${file.licence.name}.`);
    }
    if (file.licence.name === 'commercial' && !file.licence.notes) {
      errors.push(`${where} uses a commercial licence without a receipt reference in notes.`);
    }
    if (!file.licence.author || !file.licence.source)
      errors.push(`${where} needs an author and a source.`);
    if (file.type === 'atlas' && !file.data)
      errors.push(`${where} is an atlas without its JSON data file.`);
    if (file.type === 'spritesheet' && !(file.frameWidth && file.frameHeight)) {
      errors.push(`${where} is a sprite sheet without frameWidth and frameHeight.`);
    }
  }
  for (const [key, sprite] of Object.entries(manifest.sprites)) {
    const file = files.get(sprite.file);
    if (!file) errors.push(`Sprite "${key}" uses unknown asset file "${sprite.file}".`);
    else if (file.type === 'font' || file.type === 'sound')
      errors.push(`Sprite "${key}" uses ${file.type} file "${sprite.file}".`);
  }
  return errors;
}

function validateCutscene(scene: CutsceneDefinition, index: ContentIndex): string[] {
  const errors: string[] = [];
  const where = `Cutscene "${scene.id}"`;
  if (!index.realms.has(scene.realmId))
    errors.push(`${where} is set in unknown realm "${scene.realmId}".`);
  const actors = new Set<string>();
  for (const cue of [...scene.cues].sort((a, b) => a.at - b.at)) {
    if (cue.at < 0 || cue.at > scene.duration)
      errors.push(`${where} has a ${cue.type} cue outside its duration.`);
    if (cue.type === 'spawn') actors.add(cue.actor.id);
    if ((cue.type === 'move' || cue.type === 'remove') && !actors.has(cue.actor)) {
      errors.push(`${where} uses actor "${cue.actor}" before spawning it.`);
    }
  }
  for (const caption of scene.captions) {
    if (caption.at < 0 || caption.at + caption.duration > scene.duration) {
      errors.push(`${where} has a caption outside its duration: "${caption.text}".`);
    }
  }
  return errors;
}
