import { APOLLO_PACK } from './midsummer-of-apollo';
import { APPLES_PACK } from './apples-of-hesperides';
import { ARTEMIS_PACK } from './hunt-of-artemis';
import { BOREAS_PACK } from './winds-of-boreas';
import { EROS_PACK } from './festival-of-eros';
import { FIRE_PACK } from './theft-of-fire';
import { NYX_PACK } from './longest-night';
import { HECATE_PACK } from './night-of-hecate';
import { PAN_PACK } from './revels-of-pan';
import type { EventPack } from './shared';

/** Every seasonal event, in calendar order from January (spec: seasonal-events). */
export const EVENT_PACKS: readonly EventPack[] = [
  BOREAS_PACK,
  EROS_PACK,
  APPLES_PACK,
  PAN_PACK,
  ARTEMIS_PACK,
  APOLLO_PACK,
  FIRE_PACK,
  HECATE_PACK,
  NYX_PACK,
];
