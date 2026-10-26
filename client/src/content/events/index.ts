import { APOLLO_PACK } from './midsummer-of-apollo';
import { APPLES_PACK } from './apples-of-hesperides';
import { ARTEMIS_PACK } from './hunt-of-artemis';
import { BOREAS_PACK } from './winds-of-boreas';
import { EROS_PACK } from './festival-of-eros';
import { FIRE_PACK } from './theft-of-fire';
import { NYX_PACK } from './longest-night';
import { ERYSICHTHON_PACK } from './hunger-of-erysichthon';
import { HECATE_PACK } from './night-of-hecate';
import { DIONYSUS_PACK } from './vintage-of-dionysus';
import { PERSEUS_PACK } from './stars-of-perseus';
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
  PERSEUS_PACK,
  DIONYSUS_PACK,
  HECATE_PACK,
  ERYSICHTHON_PACK,
  NYX_PACK,
];
