import { MapGenConfig } from '../data/types';
import { ArenaData } from './generate-arena';

/**
 * How the ground under a point walks (spec: arena-generation / footing): one speed and one grip per terrain type,
 * looked up by tile without allocating, for every mover every step.
 */
export class Footing {
  private readonly speeds: Float32Array;
  private readonly grips: Float32Array;

  constructor(
    private readonly arena: ArenaData,
    config: MapGenConfig,
  ) {
    const types = new Map(config.terrain.types.map((t) => [t.id, t]));
    this.speeds = Float32Array.from(arena.terrainTypes, (id) => types.get(id)?.footing?.speed ?? 1);
    this.grips = Float32Array.from(arena.terrainTypes, (id) => types.get(id)?.footing?.grip ?? 1);
  }

  speedAt(x: number, y: number): number {
    return this.speeds[this.typeAt(x, y)];
  }

  gripAt(x: number, y: number): number {
    return this.grips[this.typeAt(x, y)];
  }

  private typeAt(x: number, y: number): number {
    const a = this.arena;
    const tx = Math.min(a.widthTiles - 1, Math.max(0, Math.floor(x / a.tileSize)));
    const ty = Math.min(a.heightTiles - 1, Math.max(0, Math.floor(y / a.tileSize)));
    return a.terrain[ty * a.widthTiles + tx];
  }
}
