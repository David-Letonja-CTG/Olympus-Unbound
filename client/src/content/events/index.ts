import { APPLES_PACK } from './apples-of-hesperides';
import { BOREAS_PACK } from './winds-of-boreas';
import { EROS_PACK } from './festival-of-eros';
import { NYX_PACK } from './longest-night';
import { HECATE_PACK } from './night-of-hecate';
import type { EventPack } from './shared';

/** Every seasonal event, in calendar order from January (spec: seasonal-events). */
export const EVENT_PACKS: readonly EventPack[] = [
  BOREAS_PACK,
  EROS_PACK,
  APPLES_PACK,
  HECATE_PACK,
  NYX_PACK,
];
