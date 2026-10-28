import { AssetFile } from './assets';
import { GameContent, GodDefinition, RealmDefinition } from './types';

/**
 * Which files a run loads before it starts (spec: asset-pipeline / character sheets load with the run): everything
 * but character sheets, and of those the party's gods with their gear and the realm's monsters and boss. Other
 * character sheets load the first time they are drawn (SpriteResolver).
 */
export function runFiles(
  content: GameContent,
  realm: RealmDefinition,
  gods: readonly Pick<GodDefinition, 'visual' | 'figure'>[],
): (file: AssetFile) => boolean {
  const sprites = content.assets.sprites;
  const fileOf = (key: string) => sprites[key]?.file;
  const characters = new Set<string | undefined>([
    ...content.enemies.map((e) => fileOf(e.visual.sprite)),
    ...content.bosses.map((b) => fileOf(b.visual.sprite)),
    ...content.gods.flatMap((g) => [fileOf(g.visual.sprite), g.figure && fileOf(g.figure.sprite)]),
    ...Object.keys(sprites)
      .filter((key) => /^(armour|weapon)_/.test(key))
      .map(fileOf),
  ]);
  const enemy = (id: string) => content.enemies.find((e) => e.id === id)?.visual.sprite;
  const bodies = new Set(gods.flatMap((g) => (g.figure ? [g.figure.body] : [])));
  const wanted = new Set<string | undefined>([
    ...realm.timeline.flatMap((phase) => phase.enemies.map((e) => fileOf(enemy(e.id) ?? ''))),
    ...realm.events.map((e) => fileOf(enemy(e.enemy) ?? '')),
    fileOf(content.bosses.find((b) => b.id === realm.boss.id)?.visual.sprite ?? ''),
    ...gods.flatMap((g) => [fileOf(g.visual.sprite), g.figure && fileOf(g.figure.sprite)]),
    ...Object.keys(sprites)
      .filter((key) =>
        [...bodies].some(
          (body) => key.startsWith(`armour_${body}_`) || key.startsWith(`weapon_${body}_`),
        ),
      )
      .map(fileOf),
  ]);
  return (file) => !characters.has(file.id) || wanted.has(file.id);
}
